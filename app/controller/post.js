'use strict';
const Controller = require('../core/base_controller');
const moment = require('moment');
const { verify } = require('hcaptcha');
// const ONT = require('ontology-ts-sdk');
const md5 = require('crypto-js/md5');
// const sanitize = require('sanitize-html');
const { isEmpty } = require('lodash');


class PostController extends Controller {
  constructor(ctx) {
    super(ctx);

    this.app.mysql.queryFromat = function(query, values) {
      if (!values) return query;
      return query.replace(
        /\:(\w+)/g,
        function(txt, key) {
          if (values.hasOwnProperty(key)) {
            return this.escape(values[key]);
          }
          return txt;
        }.bind(this)
      );
    };
  }

  // 过滤空
  tagsProcess({ tags }) {
    this.logger.info('tags', tags);
    try {
      return tags.filter(i => !(isEmpty(i)));
    } catch (error) {
      this.logger.error('error', error);
      return tags;
    }
  }

  // 发布文章
  async publish() {
    const ctx = this.ctx;
    const {
      author,
      title,
      data,
      fissionFactor,
      cover,
      is_original,
      platform,
      assosiateWith,
      commentPayPoint,
      shortContent,
      cc_license,
      requireToken,
      requireBuy,
      editRequireToken,
      editRequireBuy,
      ipfs_or_github,
      ipfs_hide,
    } = ctx.request.body;
    let { tags } = ctx.request.body;
    tags = this.tagsProcess({ tags });

    this.logger.info('post publish tags', tags);


    const result = await ctx.service.post.fullPublish(
      ctx.user,
      author,
      title,
      data,
      fissionFactor,
      cover,
      is_original,
      platform,
      tags,
      assosiateWith,
      commentPayPoint,
      shortContent,
      cc_license,
      requireToken,
      requireBuy,
      editRequireToken,
      editRequireBuy,
      ipfs_or_github,
      ipfs_hide
    );
    ctx.body = result;
  }

  // 编辑文章， 处理逻辑和发布相似
  /* 目前没有判断ipfs hash是否是现在用户上传的文章，所以可能会伪造一个已有的hash */
  async edit() {
    const ctx = this.ctx;
    const {
      signId,
      author = '',
      title = '',
      content = '',
      data,
      fissionFactor = 2000,
      cover,
      is_original = 0,
      assosiateWith,
      shortContent = null,
      // 新字段，requireToken 和 requireBuy 对应老接口的 data
      requireToken = null,
      requireBuy = null,
      // 持币编辑相关字段
      editRequireToken = null,
      editRequireBuy = null,
      ipfs_or_github = 'ipfs',
      ipfs_hide,
    } = ctx.request.body;
    let { tags = [] } = ctx.request.body;
    tags = this.tagsProcess({ tags });

    this.logger.info('post edit tags', tags);

    // 编辑的时候，signId需要带上
    if (!signId) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    if (fissionFactor > 2000) {
      ctx.body = ctx.msg.badFissionFactor;
      return;
    }
    const post = await this.app.mysql.get('posts', { id: signId });
    if (!post) {
      ctx.body = ctx.msg.postNotFound;
      return;
    }
    if (ipfs_or_github === 'github') {
      if ((post.hash.substring(0,2) !== 'Gh')) {
        ctx.body = ctx.msg.paramsError;
        return;
      }
    } else {
      if (post.hash.substring(0,2) !== 'Qm') {
        ctx.body = ctx.msg.paramsError;
        return;
      }
    }

    let isEncrypt;
    const isAuthor = post.uid === ctx.user.id;
    // 如果不是作者本人的话，检查是否有编辑权限
    if (!isAuthor) {
      const editTokens = await this.service.post.getEditMineTokens(signId);
      // 是否需要持有token才能编辑文章
      const needTokens = editTokens && editTokens.length > 0;

      // 付费编辑暂时留空
      const needPay = false;

      // 如果文章没有设置持币编辑、付费编辑则不允许其他用户编辑
      if (!(needTokens || needPay)) {
        ctx.body = ctx.msg.notYourPost;
        return;
      }

      // 检查用户的token数量是否满足要求，不满足则无法编辑
      if (needTokens) {
        for (const token of editTokens) {
          const amount = await this.service.token.mineToken.balanceOf(
            ctx.user.id,
            token.id
          );
          if (token.amount > amount) {
            ctx.body = ctx.msg.notYourPost;
            return;
          }
        }
      }
      // 这里判断是否为付费文章，用于决定ipfs是否加密，如果不是作者的则不采用api传入的值。
      isEncrypt = Boolean(post.require_holdtokens > 0 || post.require_buy > 0);
    } else {
      // 如果是作者本人将会执行这部分
      isEncrypt = Boolean(requireToken.length > 0) || Boolean(requireBuy);

      // 检查Fan票协作者权限
      if (requireToken) {
        for (let i = 0; i < requireToken.length; i++) {
          if (!await this.service.token.mineToken.isItCollaborator(ctx.user.id, requireToken[i].tokenId)) {
            ctx.body = ctx.msg.notCollaborator;
            return;
          }
        }
      }
      if (requireBuy) {
        for (let i = 0; i < requireBuy.length; i++) {
          // 需要注意CNY的情况下 tokenId 是 0
          if (requireBuy[i].tokenId && !await this.service.token.mineToken.isItCollaborator(ctx.user.id, requireBuy[i].tokenId)) {
            ctx.body = ctx.msg.notCollaborator;
            return;
          }
        }
      }
      if (editRequireToken) {
        for (let i = 0; i < editRequireToken.length; i++) {
          if (!await this.service.token.mineToken.isItCollaborator(ctx.user.id, editRequireToken[i].tokenId)) {
            ctx.body = ctx.msg.notCollaborator;
            return;
          }
        }
      }
    }

    // 只清洗文章文本的标识
    data.content = this.service.extmarkdown.toIpfs(data.content);
    const articleContent = await this.service.post.wash(data.content);
    const short_content
      = shortContent
      || (await this.service.extmarkdown.shortContent(articleContent));

    // 获取作者的昵称
    let displayName = '';
    if (isAuthor) displayName = this.user.displayName;
    else {
      const user = await this.service.user.get(post.uid);
      displayName = user.nickname;
    }

    let hashDict = null;
    if ( ipfs_or_github == 'github') {
      hashDict = await this.service.post.uploadArticleToGithub({
        isEncrypt,
        data,
        title,
        displayName,
        description: short_content,
        postid: signId,
        uid: post.uid,
        publish_or_edit: 'edit',
      });
    } else {
      hashDict = await this.service.post.uploadArticleToIpfs({
        isEncrypt,
        data,
        title,
        displayName,
        description: short_content,
        uid: post.uid,
      });
    }
    
  const metadataHash = hashDict.metadataHash;
  const htmlHash = hashDict.htmlHash;

    // 无 hash 则上传失败
    if (!metadataHash || !htmlHash) ctx.body = ctx.msg.ipfsUploadFailed;
    ctx.logger.info('debug info', signId, author, title, content, is_original);

    let elaTitle = post.title;
    try {
      const conn = await this.app.mysql.beginTransaction();

      try {
        // insert edit history
        const now = moment().format('YYYY-MM-DD HH:mm:ss');
        await conn.insert('edit_history', {
          sign_id: signId,
          hash: post.hash,
          title: post.title,
          cover: post.cover,
          is_original: post.is_original,
          create_time: now,
        });

        const updateRow = {
          hash: metadataHash,
          short_content,
        };

        if (title) {
          updateRow.title = title;
          elaTitle = title;
        }

        if (cover !== undefined) {
          updateRow.cover = cover;
        }

        if (ipfs_hide !== undefined) updateRow.ipfs_hide = ipfs_hide;

        updateRow.assosiate_with = assosiateWith || 0;

        // if (is_original) {
        //   updateRow.is_original = is_original;
        // }


        // 修改 post 的 hash, title
        await conn.update('posts', updateRow, { where: { id: signId } });
        await conn.insert('post_ipfs', {
          articleId: signId,
          metadataHash,
          htmlHash,
        });

        await ctx.service.post.create_tags(signId, tags, true);

        await conn.commit();
      } catch (err) {
        ctx.logger.error(err);
        await conn.rollback();
        ctx.body = ctx.msg.failure;
        return;
      }

      if (isAuthor) {
        // 记录付费信息
        if (requireToken) {
          await this.service.post.addMineTokens(
            ctx.user.id,
            signId,
            requireToken
          );
        }

        // 超过 0 元才算数，0元则无视
        if (requireBuy && requireBuy.length > 0) {
          const price = requireBuy[0].amount;
          const tokenId = requireBuy[0].tokenId;
          const addPricesResult = await this.service.post.addArticlePay(ctx.user.id, signId, price, tokenId);
          /* const addPricesResult = await this.service.post.addPrices(
            ctx.user.id,
            signId,
            requireBuy.price,
            0
          ); */
          this.logger.info('controller post edit addPrices Result:', addPricesResult);
        } else {
          await this.service.post.delPrices(ctx.user.id, signId, 0);
        }
        // 记录持币编辑信息
        if (editRequireToken) {
          await this.service.post.addEditMineTokens(
            ctx.user.id,
            signId,
            editRequireToken
          );
        }

        // 记录购买编辑权限信息
        if (editRequireBuy && editRequireBuy.price > 0) {
          await this.service.post.addPrices(
            ctx.user.id,
            signId,
            editRequireBuy.price,
            1
          );
        } else {
          await this.service.post.delPrices(ctx.user.id, signId, 1);
        }
      }

      // await updateTimeMachine;
      await this.service.search.importPost(
        signId,
        ctx.user.id,
        elaTitle,
        articleContent
      );

      ctx.body = ctx.msg.success;
      ctx.body.data = signId;
    } catch (err) {
      ctx.logger.error(err);
      ctx.body = ctx.msg.failure;
    }
  }

  // 获取关注作者的文章列表
  async getFollowedRanking() {
    const ctx = this.ctx;
    const userid = ctx.user.id;

    if (!userid) {
      ctx.body = ctx.msg.success;
      ctx.body.data = { count: 0, list: [] };
      return;
    }

    const {
      page = 1,
      pagesize = 20,
      channel = null,
      /* extra = null,
      filter = 0, */
    } = this.ctx.query;
    const postData = await this.service.post.followedPostsFast(
      page,
      pagesize,
      userid,
      channel
    );

    if (!postData) {
      ctx.body = ctx.msg.failure;
      return;
    }

    if (postData === 2) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    // 获取文章解锁、购买状态
    const { list: tokens } = await this.service.exchange.getTokenListByUser(ctx.user.id, 1, 65535);
    const purchasedPost = await this.service.shop.order.isBuyBySignIdArray(postData.list.map(post => post.id), ctx.user.id);
    postData.list.forEach(post => {
      // 是自己的文章？
      post.is_ownpost = post.uid === ctx.user.id;
      // 是否满足持币可见
      if (post.token_amount) {
        const token = tokens.find(token => token.token_id === post.token_id);
        post.token_unlock = !!token && token.amount >= post.token_amount;
      }
      // 是否买过这篇文章
      if (post.pay_price) {
        post.pay_unlock = !!purchasedPost.find(buy => buy.signid === post.id);
      }
    });

    ctx.body = ctx.msg.success;
    ctx.body.data = postData;
  }

  // 获取推荐分数排序的文章列表(基础方法)(新)
  async getScoreRanking() {
    const ctx = this.ctx;

    let {
      page = 1,
      pagesize = 20,
      channel = 1,
      author = null,
      extra = null,
      filter = 7,
    } = this.ctx.query;

    if (typeof channel === 'string') channel = parseInt(channel);
    if (typeof filter === 'string') filter = parseInt(filter);

    const postData = await this.service.post.scoreRankSlow(
      page,
      pagesize,
      channel
    );

    if (!postData) {
      ctx.body = ctx.msg.failure;
      return;
    }

    if (postData === 2) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    // 这部分是登录之后才会执行的查询
    if (ctx.user && ctx.user.id) {
      const { list: tokens } = await this.service.exchange.getTokenListByUser(ctx.user.id, 1, 65535);
      const purchasedPost = await this.service.shop.order.isBuyBySignIdArray(postData.list.map(post => post.id), ctx.user.id);

      postData.list.forEach(post => {
        // 是自己的文章？
        post.is_ownpost = post.uid === ctx.user.id;
        // 是否满足持币可见
        if (post.token_amount) {
          const token = tokens.find(token => token.token_id === post.token_id);
          post.token_unlock = !!token && token.amount >= post.token_amount;
        }
        // 是否买过这篇文章
        if (post.pay_price) {
          post.pay_unlock = !!purchasedPost.find(buy => buy.signid === post.id);
        }
      });
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = postData;
  }

  // 获取按照时间排序的文章列表(基础方法)(新)
  async getTimeRanking() {
    const ctx = this.ctx;

    let {
      page = 1,
      pagesize = 20,
      channel = 1,
      author = null,
      extra = null,
      filter = 7,
      showAll = 0, // 0 有效文章 1 隐藏文章
    } = this.ctx.query;

    if (typeof channel === 'string') channel = parseInt(channel);
    if (typeof filter === 'string') filter = parseInt(filter);
    const requestUser = ctx.user;
    // 是否显示隐藏文章 如果是登陆后看自己的文章 并且 查看所有文章
    const isShowingDeleted = requestUser.isAuthenticated ? Boolean((Number(author) === requestUser.id) && (Number(showAll) !== 0)) : false;

    const postData = await this.service.post.timeRankSlow(
      parseInt(page),
      parseInt(pagesize),
      author,
      channel,
      filter,
      isShowingDeleted
    );

    if (!postData) {
      ctx.body = ctx.msg.failure;
      return;
    }

    if (postData === 2) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    // 这部分是登录之后才会执行的查询
    if (ctx.user && ctx.user.id) {
      const { list: tokens } = await this.service.exchange.getTokenListByUser(ctx.user.id, 1, 65535);
      const purchasedPost = await this.service.shop.order.isBuyBySignIdArray(postData.list.map(post => post.id), ctx.user.id);
      postData.list.forEach(post => {
        // 是自己的文章？
        post.is_ownpost = post.uid === ctx.user.id;
        // 是否满足持币可见
        if (post.token_amount) {
          const token = tokens.find(token => token.token_id === post.token_id);
          post.token_unlock = !!token && token.amount >= post.token_amount;
        }
        // 是否买过这篇文章
        if (post.pay_price) {
          post.pay_unlock = !!purchasedPost.find(buy => buy.signid === post.id);
        }
      });
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = postData;
  }

  // 获取按照赞赏次数排序的文章列表(新)
  async getSupportsRanking() {
    const ctx = this.ctx;

    const {
      page = 1,
      pagesize = 20,
      channel = null,
      extra = null,
    } = this.ctx.query;

    const postData = await this.service.post.supportRank(
      page,
      pagesize,
      channel,
      extra
    );

    if (postData === 2) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    if (postData) {
      ctx.body = ctx.msg.success;
      ctx.body.data = postData;
      return;
    }

    ctx.body = ctx.msg.failure;
  }

  // 获取按照赞赏数量排序的文章列表(新)
  async getAmountRanking() {
    const ctx = this.ctx;
    const {
      page = 1,
      pagesize = 20,
      symbol = 'EOS',
      channel = null,
    } = this.ctx.query;

    const postData = await this.service.post.amountRank(
      page,
      pagesize,
      symbol,
      channel
    );

    if (postData === 2) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    if (postData) {
      ctx.body = ctx.msg.success;
      ctx.body.data = postData;
      return;
    }

    ctx.body = ctx.msg.failure;
    // return;
  }

  // 用户赞赏过的文章列表(新)
  async getSupported() {
    const ctx = this.ctx;
    const {
      page = 1,
      pagesize = 20,
      user = null,
      channel = null,
    } = this.ctx.query;

    const postData = await this.service.post.supportedPosts(
      page,
      pagesize,
      user,
      channel
    );

    if (postData === 2) {
      ctx.body = ctx.msg.paramsError;
    } else if (postData === 3) {
      ctx.body = ctx.msg.userNotExist;
    } else {
      ctx.body = ctx.msg.success;
      ctx.body.data = postData;
    }
  }

  // 获取推荐的文章/商品, 必须带channel
  async getRecommend() {
    const ctx = this.ctx;
    const { channel = null, amount = 5 } = ctx.query;

    let postData;
    if (channel === null) {
      postData = await this.service.post.recommendPosts(amount);
    } else {
      postData = await this.service.post.recommendPostsSlow(channel, amount);
    }

    if (postData === 3) {
      ctx.body = ctx.msg.paramsError;
    } else {
      ctx.body = ctx.msg.success;
      ctx.body.data = postData;
    }
  }

  // 获取某个标签下的文章
  async getPostByTag() {
    const ctx = this.ctx;

    const { page = 1, pagesize = 20, tagid, orderBy = 'create_time', order = 'desc' } = this.ctx.query;
    const result = await this.service.tags.postList(
      parseInt(page),
      parseInt(pagesize),
      tagid,
      orderBy,
      order
    );
    if (result === -1) {
      this.ctx.body = ctx.msg.paramsError;
      return;
    }

    // 这部分是登录之后才会执行的查询
    if (ctx.user && ctx.user.id) {
      const { list: tokens } = await this.service.exchange.getTokenListByUser(ctx.user.id, 1, 65535);
      const purchasedPost = await this.service.shop.order.isBuyBySignIdArray(result.list.map(post => post.id), ctx.user.id);
      result.list.forEach(post => {
        // 是自己的文章？
        post.is_ownpost = post.uid === ctx.user.id;
        // 是否满足持币可见
        if (post.token_amount) {
          const token = tokens.find(token => token.token_id === post.token_id);
          post.token_unlock = !!token && token.amount >= post.token_amount;
        }
        // 是否买过这篇文章
        if (post.pay_price) {
          post.pay_unlock = !!purchasedPost.find(buy => buy.signid === post.id);
        }
      });
    }

    this.ctx.body = ctx.msg.success;
    this.ctx.body.data = result;
  }

  // 查看单篇文章
  async p() {
    const ctx = this.ctx;
    const id = ctx.params.id;

    const post = await this.service.post.getById(id);

    if (!post) {
      ctx.body = ctx.msg.postNotFound;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = post;
  }
  async pInfo() {
    const ctx = this.ctx;
    const id = ctx.params.id;
    let postIpfsBody = {};

    const post = await this.service.post.getById(id);

    // 啥也没有 直接返回
    if (!post) {
      ctx.body = ctx.msg.postNotFound;
      return;
    }
    // 有内容继续往后走
    // 同步 catchPost 方法
    if (post.uid !== ctx.user.id) {
      const permission = await this.hasPermission(post, ctx.user.id);

      if (!permission) {

        // 没有权限 返回信息
        postIpfsBody = ctx.msg.postNoPermission;

        ctx.body = ctx.msg.success;
        ctx.body.data = {
          p: post,
          ipfs: postIpfsBody,
        };
        return;
      }
    }

    // 从ipfs获取内容
    // const catchRequest = await this.service.post.ipfsCatch(post.hash);
    let catchRequest = null;
    if (post.hash.substring(0, 2) === 'Gh') {
      catchRequest = await this.service.github.readFromGithub(post.hash, 'json');
    } else {
      catchRequest = await this.service.post.ipfsCatch(post.hash);
    }


    if (catchRequest) {
      let data = JSON.parse(catchRequest.toString());
      if (data.iv) {
        // 是加密的数据，开始解密
        data = JSON.parse(this.service.cryptography.decrypt(data));
      }
      if (ctx.query.edit) {
        data.content = this.service.extmarkdown.toEdit(data.content);
      } else {
        data.content = await this.service.extmarkdown.transform(data.content, {
          userId: ctx.user.id,
        });
      }
      // 字符串转为json对象
      postIpfsBody = Object.assign(postIpfsBody, ctx.msg.success);
      postIpfsBody.data = data;
    } else {
      // IPFS获取失败 返回失败的信息
      postIpfsBody = ctx.msg.ipfsCatchFailed;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = {
      p: post,
      ipfs: postIpfsBody,
    };
  }

  async getIpfsById() {
    const { ctx } = this;
    const { id } = ctx.params;
    const post = await this.service.post.get(id);
    let isFullHistory = !post.ipfs_hide;
    const user = ctx.user;
    if (!isFullHistory && user.isAuthenticated) {
      // owner still able to see the whole history for sure
      isFullHistory = user.id === post.uid;
    }
    const records = await this.service.post.getArticlesHistory(id, isFullHistory);
    ctx.body = records.length === 0 ? ctx.msg.failure : ctx.msg.success;
    ctx.body.data = records;
  }

  // 获取当前用户查看文章的属性
  async currentProfile() {
    const ctx = this.ctx;
    const { id } = ctx.request.body;
    const post = await this.service.post.getPostProfileOf(id, ctx.user.id);

    if (!post) {
      ctx.body = ctx.msg.postNotFound;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = post;
  }

  async postByHash() {
    const ctx = this.ctx;
    const hash = ctx.params.hash;

    const post = await this.service.post.getByHash(hash, true);

    if (!post) {
      ctx.body = ctx.msg.postNotFound;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = post;
  }

  // 文章阅读事件上报 todo，待整合
  async show() {
    const ctx = this.ctx;
    // const id = ctx.params.id;
    const hash = ctx.params.hash;

    try {
      const post = await this.app.mysql.get('posts', { hash });

      if (!post) {
        ctx.body = ctx.msg.postNotFound;
        return;
      }

      const result = await this.app.mysql.query(
        'INSERT INTO post_read_count(post_id, real_read_count, sale_count, support_count, eos_value_count, ont_value_count) VALUES (?, ?, 0, 0, 0, 0)'
        + ' ON DUPLICATE KEY UPDATE real_read_count = real_read_count + 1',
        [ post.id, 1 ]
      );
      await this.service.postDashboard.addActionLog({ ...ctx.user }.id, post.id, 'read');

      const updateSuccess = result.affectedRows !== 0;

      if (updateSuccess) {
        ctx.body = ctx.msg.success;
      } else {
        ctx.body = ctx.msg.failure;
      }
    } catch (err) {
      ctx.logger.error(err.sqlMessage);
      ctx.body = ctx.msg.failure;
    }
  }

  async delete2() {
    const { ctx } = this;

    // ctx.validate({
    //   page: { type: 'int', required: true },
    //   pageSize: { type: 'int', required: true },
    // }, ctx.query);

    const id = ctx.params.id;
    if (!id) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    await this.service.search.deletePost(id);
    const result = await this.service.post.delete(id, ctx.user.id);
    if (!result) {
      ctx.body = ctx.msg.postDeleteError;
    } else {
      ctx.body = ctx.msg.success;
    }
  }

  // 待删除，合并到OrderController、SupportController，以后可增加独立的comment模块
  // 目前还没有转移
  async comment() {
    const ctx = this.ctx;
    const { comment = '', sign_id } = ctx.request.body;

    if (!sign_id) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    const now = moment().format('YYYY-MM-DD HH:mm:ss');

    try {
      const result = await this.app.mysql.insert('comments', {
        username: this.ctx.user.username,
        uid: this.ctx.user.id,
        sign_id,
        comment,
        create_time: now,
      });

      const updateSuccess = result.affectedRows === 1;

      if (updateSuccess) {
        ctx.body = ctx.msg.success;
      } else {
        ctx.body = ctx.msg.failure;
      }
    } catch (err) {
      ctx.logger.error(err.sqlMessage);
      ctx.body = ctx.msg.failure;
    }
  }

  // 获取我的文章
  // 新创建的没有id，用的hash问题
  async mypost() {
    const ctx = this.ctx;
    const id = ctx.params.id;

    const post = await this.service.post.getForEdit(id, ctx.user.id);

    if (!post) {
      ctx.body = ctx.msg.postNotFound;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = post;
  }

  // 获取有编辑权限的文章内容
  async getCanEditPost() {
    const ctx = this.ctx;
    const id = ctx.params.id;

    const post = await this.service.post.getById(id);

    if (!post) {
      ctx.body = ctx.msg.postNotFound;
      return;
    }

    // 如果文章是自己发表的则直接返回数据
    if (post.uid === ctx.user.id) {
      ctx.body = ctx.msg.success;
      ctx.body.data = post;
      return;
    }

    // 是否需要持有token才能编辑文章
    const needTokens = post.editTokens && post.editTokens.length > 0;

    // 付费编辑暂时留空
    const needPay = false;

    // 如果文章没有设置持币编辑、付费编辑则不允许其他用户获取内容
    if (!(needTokens || needPay)) {
      ctx.body = ctx.msg.postNoPermission;
      return;
    }

    // 检查用户的token数量是否满足要求，不满足则直接返回失败
    if (needTokens) {
      for (const token of post.editTokens) {
        const amount = await this.service.token.mineToken.balanceOf(
          ctx.user.id,
          token.id
        );
        if (token.amount > amount) {
          ctx.body = ctx.msg.postNoPermission;
          return;
        }
      }
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = post;
  }

  // async mailtest() {
  //   const ctx = this.ctx;
  //   const { supportid = 505 } = ctx.query;

  //   const mail = await this.service.mail.sendMail(supportid);
  //   // ctx.body = ctx.msg.success;
  //   // ctx.body.data = mail;
  //   ctx.body = mail;
  // }

  // 转移文章
  async transferOwner() {
    const ctx = this.ctx;
    const { uid, signid } = ctx.request.body;

    const success = await this.service.post.transferOwner(
      uid,
      signid,
      ctx.user.id
    );

    if (success === 2) {
      ctx.body = ctx.msg.postNotFound;
      return;
    }
    if (success === 3) {
      ctx.body = ctx.msg.notYourPost;
      return;
    }
    if (success === 4) {
      ctx.body = ctx.msg.userNotExist;
      return;
    }
    if (success === 5) {
      ctx.body = ctx.msg.receiverNotAccept;
      return;
    }
    if (success === 6) {
      ctx.body = ctx.msg.failure;
      return;
    }
    ctx.body = ctx.msg.success;
  }

  async importer() {
    const ctx = this.ctx;
    const { url = null } = ctx.request.body;
    if (!url) {
      ctx.body = ctx.msg.paramsError;
      return;
    }
    const makeResponse = res => {
      if (res) {
        this.logger.info(
          'PostController:: importer: Import article succeed..',
          url
        );
        ctx.body = ctx.msg.success;
        ctx.body.data = res;
        return true;
      }
      return 1;
    };
    /**
     * 匹配 URL 并调用对应 Handler 方法
     * @param {RegExp} matchRule 匹配规则
     * @param {Function} handler 被调用的方法
     */
    const makeMatch = async (matchRule, handler) =>
      (url.match(matchRule) ? makeResponse(await handler(url)) : false);
    // true = succeed
    // false = unspported platform
    // 1 = import failed
    const wechatMatch = makeMatch(
      /https:\/\/mp\.weixin\.qq\.com\/s[?\/]{1}[_\-=&#a-zA-Z0-9]{1,200}/,
      x => this.service.postImport.handleWechat(x)
    );
    const chainnewsMatch = makeMatch(
      /https:\/\/www\.chainnews\.com\/articles\/[0-9]{8,14}\.htm/,
      x => this.service.postImport.handleChainnews({ url: x, type: 'articles' })
    );
    const chainnewsNewsMatch = makeMatch(
      /https:\/\/(.*)?chainnews\.com\/news\/.+/,
      x => this.service.postImport.handleChainnews({ url: x, type: 'news' })
    );
    const orangeMatch = makeMatch(/https:\/\/orange\.xyz\/p\/[0-9]{1,6}/, x =>
      this.service.postImport.handleOrange(x)
    );
    const jianshuMatch = makeMatch(
      /https:\/\/(www\.)?jianshu\.com\/p\/[\w]{12}/,
      x => this.service.postImport.handleJianShu(x)
    );
    const gaojinMatch = makeMatch(/https:\/\/(www\.)?igaojin\.me/, x =>
      this.service.postImport.handleJianShu(x)
    );
    const mattersMatch = makeMatch(/https:\/\/(www\.)?matters\.news\/.+/, x =>
      this.service.postImport.handleMatters(x)
    );
    const zhihuMatch = makeMatch(
      /https:\/\/zhuanlan\.zhihu\.com\/p\/\d+/,
      x => this.service.postImport.handleZhihu(x)
    );
    // @deprecated: 这个 Headless 微博文章爬虫已经失效了，暂时屏蔽这个功能 - Frank Feb.19 2021
    // 微博PC端文章
    // const weiboMatch = makeMatch(
    //   /https:\/\/(www\.)?weibo\.com\/ttarticle\/p\/show.+/,
    //   x => this.service.postImport.handleWeibo(x)
    // );
    const archiveMatch = makeMatch(/https?:\/\/(www\.)?archive\.is\/.+/, x =>
      this.service.postImport.handleArchive(x)
    );
    // 币乎
    const bihuMatch = makeMatch(/https:\/\/(.*)?bihu\.com\/.+/, x =>
      this.service.postImport.handleBihu(x)
    );
    // Steemit
    const steemitMatch = makeMatch(
      /^https:\/\/steemit\.com\/\S+\/\@\S+\/\S+$/,
      x => this.service.postImport.handleSteemit(x)
    );

    const result
      = (await wechatMatch)
      || (await chainnewsMatch)
      || (await chainnewsNewsMatch)
      || (await orangeMatch)
      || (await jianshuMatch)
      || (await gaojinMatch)
      || (await mattersMatch)
      || (await zhihuMatch)
      // || (await weiboMatch)
      || (await archiveMatch)
      || (await bihuMatch)
      || (await steemitMatch);

    if (result === 1) {
      this.logger.info(
        'PostController:: importer: Import article failed..',
        url
      );
      ctx.body = ctx.msg.failure;
      return;
    } else if (result === false) {
      ctx.body = ctx.msg.importPlatformNotSupported;
      return;
    }
  }

  async uploadImage() {
    const ctx = this.ctx;
    const file = ctx.request.files[0];
    const filetype = file.filename.split('.');

    // 文件上OSS的路径
    const filename
      = '/image/'
      + moment().format('YYYY/MM/DD/')
      + md5(file.filepath).toString()
      + '.'
      + filetype[filetype.length - 1];

    // // 文件在本地的缓存路径
    // const filelocation = 'uploads/' + path.basename(file.filename);

    // filepath需要再改
    const uploadStatus = await this.service.post.uploadImage(
      filename,
      file.filepath
    );

    if (uploadStatus !== 0) {
      ctx.body = ctx.msg.failure;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = { cover: filename };
  }

  async uploadPost() {
    const ctx = this.ctx;
    const { data } = ctx.request.body;

    this.logger.info('upload ipfs data', data);
    // 上传的data是json对象， 需要字符串化
    const uploadRequest = await this.service.post.ipfsUpload(
      JSON.stringify(data)
    );

    if (uploadRequest) {
      ctx.body = ctx.msg.success;
      ctx.body.hash = uploadRequest;
      return;
    }

    ctx.body = ctx.msg.ipfsUploadFailed;
  }

  async catchPost() {
    const ctx = this.ctx;
    const hash = ctx.params.hash;

    const post = await this.service.post.getByHash(hash, false);
    if (post.uid !== ctx.user.id) {
      const permission = await this.hasPermission(post, ctx.user.id);
      if (!permission) {
        ctx.body = ctx.msg.postNoPermission;
        return;
      }
      // 记录文章解锁行为
      if (post.require_holdtokens) this.service.postDashboard.addActionLog(ctx.user.id, post.id, 'unlock', true);
    }
    // 从ipfs获取内容
    // const catchRequest = await this.service.post.ipfsCatch(hash);
    let catchRequest = null;
    if (hash.substring(0, 2) === 'Gh') {
      catchRequest = await this.service.github.readFromGithub(hash, 'json');
    } else {
      catchRequest = await this.service.post.ipfsCatch(hash);
    }

    if (catchRequest) {
      let data = JSON.parse(catchRequest.toString());
      if (data.iv) {
        // 是加密的数据，开始解密
        data = JSON.parse(this.service.cryptography.decrypt(data));
      }
      if (ctx.query.edit) {
        data.content = this.service.extmarkdown.toEdit(data.content);
      } else {
        data.content = await this.service.extmarkdown.transform(data.content, {
          userId: ctx.user.id,
        });
      }
      ctx.body = ctx.msg.success;
      // 字符串转为json对象
      ctx.body.data = data;
      return;
    }

    ctx.body = ctx.msg.ipfsCatchFailed;
  }

  // 判断购买和持币情况
  async hasPermission(post, userId) {
    // 文章需要购买
    if (post.require_buy) {
      const isBuy = await this.service.shop.order.isBuy(post.id, userId);
      if (isBuy) {
        return true;
      }
      return false;
    }

    // 判断持币
    return await this.service.post.isHoldMineTokens(post.id, userId);
  }

  // 查询统计数据
  async stats() {
    const ctx = this.ctx;
    ctx.body = ctx.msg.success;
    ctx.body.data = await this.ctx.service.post.stats();
  }

  // 持币阅读 - Disabled(Frank) 合并到 publish 和 edit 的 API
  async addMineTokens() {
    const ctx = this.ctx;
    // const { signId, tokens } = ctx.request.body;
    // if (!signId) {
    //   ctx.body = ctx.msg.paramsError;
    //   return;
    // }

    // const result = await ctx.service.post.addMineTokens(ctx.user.id, signId, tokens);
    // if (result === 0) {
    ctx.body = ctx.msg.success;
    // } else {
    //   ctx.body = ctx.msg.failure;
    // }
  }

  async extractRefTitle() {
    const ctx = this.ctx;
    const { url } = ctx.request.body;
    const result = await ctx.service.references.extractRefTitle(url);

    if (result === null) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = result;
  }

  async addReference() {
    const ctx = this.ctx;
    const signId = parseInt(ctx.params.id);
    const { url, title, summary } = ctx.request.body;
    const result = await ctx.service.references.addReference(
      ctx.user.id,
      signId,
      url,
      title,
      summary
    );

    ctx.body = result === 0 ? ctx.msg.success : ctx.msg.failure;
  }

  async deleteReference() {
    const ctx = this.ctx;
    const signId = parseInt(ctx.params.id);
    const number = parseInt(ctx.params.number);

    const result = await ctx.service.references.deleteReferenceNode(
      ctx.user.id,
      signId,
      number
    );

    ctx.body = result === 0 ? ctx.msg.success : ctx.msg.failure;
  }

  async getReference() {
    const ctx = this.ctx;
    const signId = parseInt(ctx.params.id);
    const number = parseInt(ctx.params.number);

    const ref = await ctx.service.references.getReference(
      ctx.user.id,
      signId,
      number
    );

    if (ref === null) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = ref;
  }

  async addDraftReference() {
    const ctx = this.ctx;
    const draftId = parseInt(ctx.params.id);
    const { url, title, summary } = ctx.request.body;
    const result = await ctx.service.references.addDraftReference(
      ctx.user.id,
      draftId,
      url,
      title,
      summary
    );

    ctx.body = result === 0 ? ctx.msg.success : ctx.msg.failure;
  }

  async deleteDraftReference() {
    const ctx = this.ctx;
    const draftId = parseInt(ctx.params.id);
    const number = parseInt(ctx.params.number);

    const result = await ctx.service.references.deleteDraftReferenceNode(
      ctx.user.id,
      draftId,
      number
    );

    ctx.body = result === 0 ? ctx.msg.success : ctx.msg.failure;
  }

  async getDraftReference() {
    const ctx = this.ctx;
    const draftId = parseInt(ctx.params.id);
    const number = parseInt(ctx.params.number);

    const ref = await ctx.service.references.getDraftReference(
      ctx.user.id,
      draftId,
      number
    );

    if (ref === null) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = ref;
  }

  async publishReferences() {
    const ctx = this.ctx;
    const draftId = parseInt(ctx.params.id);
    const { signId } = ctx.request.body;
    const result = await ctx.service.references.publish(
      ctx.user.id,
      draftId,
      signId
    );

    ctx.body = result === 0 ? ctx.msg.success : ctx.msg.failure;
  }

  async getReferences() {
    const ctx = this.ctx;
    const { pagesize = 20, page = 1 } = this.ctx.query;

    const signId = parseInt(ctx.params.id);

    // singid缺少,此种情况用户正常使用时候不会出现
    if (!signId) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    const references = await this.service.references.getReferences(
      signId,
      parseInt(page),
      parseInt(pagesize)
    );

    if (references === null) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = references;
  }

  async getDraftReferences() {
    const ctx = this.ctx;
    const { pagesize = 20, page = 1 } = this.ctx.query;

    const signId = parseInt(ctx.params.id);

    // singid缺少,此种情况用户正常使用时候不会出现
    if (!signId) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    const references = await this.service.references.getDraftReferences(
      signId,
      parseInt(page),
      parseInt(pagesize)
    );

    if (references === null) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = references;
  }

  async refPosts() {
    const ctx = this.ctx;
    const { pagesize = 20, page = 1 } = this.ctx.query;

    const signId = parseInt(ctx.params.id);

    // singid缺少,此种情况用户正常使用时候不会出现
    if (!signId) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    const posts = await this.service.references.getPosts(
      signId,
      parseInt(page),
      parseInt(pagesize)
    );

    if (posts === null) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = posts;
  }

  // 设置订单价格 - Disabled(Frank) 合并到 publish 和 edit 的 API
  async addPrices() {
    const ctx = this.ctx;
    // const signId = parseInt(ctx.params.id);
    // const { price } = ctx.request.body;
    // const result = await this.service.post.addPrices(ctx.user.id, signId, price);
    const result = 0; // disable this
    ctx.body = result === 0 ? ctx.msg.success : ctx.msg.failure;
  }

  async delPrices() {
    const ctx = this.ctx;
    const signId = parseInt(ctx.params.id);
    const result = await this.service.post.delPrices(ctx.user.id, signId, 0);
    ctx.body = result === 0 ? ctx.msg.success : ctx.msg.failure;
  }

  async addBookmark() {
    const ctx = this.ctx;
    const id = parseInt(ctx.params.id);

    if (Number.isNaN(id)) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    const result = await ctx.service.post.addBookmark(ctx.user.id, id);

    if (result === null) {
      ctx.status = 404;
      ctx.body = ctx.msg.postNotFound;
      return;
    }

    ctx.status = result ? 201 : 409;
    ctx.body = result ? ctx.msg.success : ctx.msg.postBookmarked;
  }

  async removeBookmark() {
    const ctx = this.ctx;
    const id = parseInt(ctx.params.id);

    if (Number.isNaN(id)) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    const result = await ctx.service.post.removeBookmark(ctx.user.id, id);

    if (result === null) {
      ctx.status = 404;
      ctx.body = ctx.msg.postNotFound;
      return;
    }

    ctx.status = result ? 204 : 404;
    ctx.body = result ? ctx.msg.success : ctx.msg.postNotBookmarked;
  }

  // 仅供开发人员使用的隐藏API
  async _rawCatchPost() {
    const { ctx } = this;
    const { hash } = ctx.params;

    // 从ipfs获取内容
    const catchRequest = await this.service.post.ipfsCatch(hash);

    if (catchRequest) {
      let data = JSON.parse(catchRequest.toString());
      if (data.iv) {
        // 是加密的数据，开始解密
        data = JSON.parse(this.service.cryptography.decrypt(data));
      }
      if (ctx.query.edit) {
        data.content = this.service.extmarkdown.toEdit(data.content);
      } else {
        data.content = await this.service.extmarkdown.transform(data.content, {
          userId: ctx.user.id,
        });
      }
      ctx.body = ctx.msg.success;
      // 字符串转为json对象
      ctx.body.data = data;
      return;
    }

    ctx.body = ctx.msg.ipfsCatchFailed;
  }

  /** 记录文章分享行为 */
  async shareCount() {
    const { ctx } = this;
    const { id } = ctx.params;
    const post = await this.service.post.get(id);
    if (!post || post.status === 1) return ctx.body = ctx.msg.postNotFound;
    const res = await this.service.postDashboard.addActionLog({ ...ctx.user }.id, id, 'share');
    ctx.body = res ? ctx.msg.success : ctx.msg.failure;
  }
}

module.exports = PostController;
