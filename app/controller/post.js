'use strict';

const Controller = require('../core/base_controller');

const moment = require('moment');
// const ONT = require('ontology-ts-sdk');
const md5 = require('crypto-js/md5');
const sanitize = require('sanitize-html');
class PostController extends Controller {

  constructor(ctx) {
    super(ctx);

    this.app.mysql.queryFromat = function(query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function(txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    };
  }

  // 发布文章
  async publish() {
    const ctx = this.ctx;
    const { author = '', title = '', content = '', msgParams,
      publickey, sign, hash, fissionFactor = 2000,
      cover, is_original = 0, platform = 'eos', tags = '', commentPayPoint = 0, shortContent = null, cc_license = null } = ctx.request.body;

    ctx.logger.info('debug info', author, title, content, publickey, sign, hash, is_original);

    if (fissionFactor > 2000) {
      ctx.body = ctx.msg.postPublishParamsError; // msg: 'fissionFactor should >= 2000',
      return;
    }

    // 评论需要支付的积分
    const comment_pay_point = parseInt(commentPayPoint);
    if (comment_pay_point > 99999 || comment_pay_point < 1) {
      ctx.body = ctx.msg.pointCommentSettingError;
      return;
    }

    try {
      // 验证签名
      if (platform === 'eos') {
        const hash_piece1 = hash.slice(0, 12);
        const hash_piece2 = hash.slice(12, 24);
        const hash_piece3 = hash.slice(24, 36);
        const hash_piece4 = hash.slice(36, 48);

        const sign_data = `${author} ${hash_piece1} ${hash_piece2} ${hash_piece3} ${hash_piece4}`;
        await this.eos_signature_verify(author, sign_data, sign, publickey);
      } else if (platform === 'metamask') {
        if (!this.service.ethereum.signatureService.verifyArticle(sign, msgParams, publickey)) {
          throw Error('以太坊签名无效');
        }
      } else if (platform === 'ont') {
        /*
                const msg = ONT.utils.str2hexstr(`${author} ${hash}`);
                this.ont_signature_verify(msg, sign, publickey);
        */


      }
      // Github以及Email用户不验证签名
      // else if (platform === 'github') {
      //   this.logger.info('There is a GitHub user publishing...');
      // } else if (platform === 'email') {
      //   this.logger.info('There is a Email account user publishing...');
      // }

      // else {
      //   ctx.body = ctx.msg.postPublishSignVerifyError; // 'platform not support';
      //   return;
      // }
    } catch (err) {
      ctx.logger.info('debug info', err);
      ctx.body = ctx.msg.postPublishSignVerifyError; // err.message;
      return;
    }

    // 从ipfs获取文章内容
    const articleData = await this.service.post.ipfsCatch(hash);
    if (!articleData) {
      ctx.body = ctx.msg.ipfsCatchFailed; // err.message;
      return;
    }
    const articleJson = JSON.parse(articleData.toString());
    // 只清洗文章文本的标识
    const articleContent = await this.service.post.wash(articleJson.content);
    // 设置短摘要
    let short_content = shortContent;
    if (!short_content) {
      short_content = articleContent.substring(0, 300);
    }

    const id = await ctx.service.post.publish({
      author,
      username: ctx.user.username,
      title,
      public_key: publickey,
      sign,
      hash,
      is_original,
      fission_factor: fissionFactor,
      create_time: moment().format('YYYY-MM-DD HH:mm:ss'),
      cover, // 封面url
      platform,
      uid: ctx.user.id,
      is_recommend: 0,
      category_id: 0,
      short_content,
      comment_pay_point,
      cc_license,
    });

    // 添加文章到elastic search
    await this.service.search.importPost(id, ctx.user.id, title, articleContent);

    if (tags) {
      let tag_arr = tags.split(',');
      tag_arr = tag_arr.filter(x => { return x !== ''; });
      await ctx.service.post.create_tags(id, tag_arr);
    }

    if (id > 0) {
      ctx.body = ctx.msg.success;
      ctx.body.data = id;
    } else {
      ctx.body = ctx.msg.postPublishError; // todo 可以再细化失败的原因
    }
  }

  // 编辑文章， 处理逻辑和发布相似
  /* 目前没有判断ipfs hash是否是现在用户上传的文章，所以可能会伪造一个已有的hash */
  async edit() {
    const ctx = this.ctx;
    const { signId, author = '', title = '', content = '', msgParams,
      publickey, sign, hash, fissionFactor = 2000, cover,
      is_original = 0, platform = 'eos', tags = '', shortContent = null } = ctx.request.body;

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

    if (post.uid !== ctx.user.id) {
      ctx.body = ctx.msg.notYourPost;
      return;
    }

    ctx.logger.info('debug info', signId, author, title, content, publickey, sign, hash, is_original);

    try {
      if (platform === 'eos') {
        const hash_piece1 = hash.slice(0, 12);
        const hash_piece2 = hash.slice(12, 24);
        const hash_piece3 = hash.slice(24, 36);
        const hash_piece4 = hash.slice(36, 48);

        const sign_data = `${author} ${hash_piece1} ${hash_piece2} ${hash_piece3} ${hash_piece4}`;

        await this.eos_signature_verify(author, sign_data, sign, publickey);
      } else if (platform === 'metamask') {
        if (!this.service.ethereum.signatureService.verifyArticle(sign, msgParams, publickey)) {
          throw Error('以太坊签名无效');
        }
      } else if (platform === 'ont') {
        /*
                const msg = ONT.utils.str2hexstr(`${author} ${hash}`);
                this.ont_signature_verify(msg, sign, publickey);
        */
      }
      // else if (platform === 'github') {
      //   this.logger.info('There is a GitHub user editing...');
      // } else if (platform === 'email') {
      //   this.logger.info('There is a Email account user publishing...');
      // } else {
      //   ctx.body = ctx.msg.unsupportedPlatform;
      //   return;
      // }
    } catch (err) {
      ctx.body = ctx.msg.postPublishSignVerifyError;
      return;
    }

    const articleData = await this.service.post.ipfsCatch(hash);
    if (!articleData) {
      ctx.body = ctx.msg.ipfsCatchFailed; // err.message;
      return;
    }
    const articleJson = JSON.parse(articleData.toString());
    // 只清洗文章文本的标识
    const articleContent = await this.service.post.wash(articleJson.content);

    let short_content = shortContent;
    if (!short_content) {
      short_content = articleContent.substring(0, 300);
    }

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
          sign: post.sign,
          cover: post.cover,
          is_original: post.is_original,
          public_key: post.public_key,
          create_time: now,
        });

        const updateRow = {
          hash,
          public_key: publickey,
          sign,
          short_content,
        };

        if (title) {
          updateRow.title = title;
          elaTitle = title;
        }

        if (cover !== undefined) {
          updateRow.cover = cover;
        }

        if (is_original) {
          updateRow.is_original = is_original;
        }

        // console.log("cover!!!", cover , typeof cover);

        // 修改 post 的 hash, publickey, sign title
        await conn.update('posts', updateRow, { where: { id: signId } });

        let tag_arr = tags.split(',');
        tag_arr = tag_arr.filter(x => { return x !== ''; });
        await ctx.service.post.create_tags(signId, tag_arr, true);

        await conn.commit();
      } catch (err) {
        ctx.logger.error(err);
        await conn.rollback();
        ctx.body = ctx.msg.failure;
        return;
      }

      await this.service.search.importPost(signId, ctx.user.id, elaTitle, articleContent);

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

    const { page = 1, pagesize = 20, channel = null, extra = null, filter = 0 } = this.ctx.query;

    const postData = await this.service.post.followedPosts(page, pagesize, userid, channel, extra, filter);

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

  // 获取推荐分数排序的文章列表(基础方法)(新)
  async getScoreRanking() {
    const ctx = this.ctx;

    const { page = 1, pagesize = 20, channel = null, author = null, extra = null, filter = 0 } = this.ctx.query;

    let postData;
    if (page === 1 && pagesize === 20 && channel === null && author === null && extra === null && filter === 0) {
      postData = this.app.ctx.cache.post.hot;
    } else {
      postData = await this.service.post.scoreRank(page, pagesize, author, channel, extra, filter);
    }

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

  // 获取按照时间排序的文章列表(基础方法)(新)
  async getTimeRanking() {
    const ctx = this.ctx;

    const { page = 1, pagesize = 20, channel = null, author = null, extra = null, filter = 0 } = this.ctx.query;

    const postData = await this.service.post.timeRank(page, pagesize, author, channel, extra, filter);

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

  // 获取按照赞赏次数排序的文章列表(新)
  async getSupportsRanking() {
    const ctx = this.ctx;

    const { page = 1, pagesize = 20, channel = null, extra = null } = this.ctx.query;

    const postData = await this.service.post.supportRank(page, pagesize, channel, extra);

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
    const { page = 1, pagesize = 20, symbol = 'EOS', channel = null } = this.ctx.query;

    const postData = await this.service.post.amountRank(page, pagesize, symbol, channel);

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
    const { page = 1, pagesize = 20, user = null, channel = null } = this.ctx.query;

    const postData = await this.service.post.supportedPosts(page, pagesize, user, channel);

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
    if (channel === null && amount === 5) {
      postData = this.app.cache.post.recommend;
    } else {
      postData = await this.service.post.recommendPosts(channel, amount);
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

    const { page = 1, pagesize = 20, extra = null, tagid } = this.ctx.query;

    const postData = await this.service.post.getPostByTag(page, pagesize, extra, tagid);

    this.ctx.body = ctx.msg.success;
    this.ctx.body.data = postData;
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

      const updateSuccess = (result.affectedRows !== 0);

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

    const success = await this.service.post.transferOwner(uid, signid, ctx.user.id);

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
    let result = null;
    let matchStatus = 0;
    const wechatMatch = url.match(/https:\/\/mp\.weixin\.qq\.com\/s[?\/]{1}[_\-=&#a-zA-Z0-9]{1,200}/);
    if (wechatMatch) {
      matchStatus = 1;
      result = await this.service.postImport.handleWechat(wechatMatch[0]);
    }

    if (matchStatus === 0) {
      const chainnewsMatch = url.match(/https:\/\/www\.chainnews\.com\/articles\/[0-9]{8,14}\.htm/);
      if (chainnewsMatch) {
        matchStatus = 1;
        result = await this.service.postImport.handleChainnews(chainnewsMatch[0]);
      }
    }

    if (matchStatus === 0) {
      const orangeMatch = url.match(/https:\/\/orange\.xyz\/p\/[0-9]{1,6}/);
      if (orangeMatch && matchStatus !== 1) {
        matchStatus = 1;
        result = await this.service.postImport.handleOrange(orangeMatch[0]);
      }
    }
    if (matchStatus === 0) {
      const jianshuMatch = url.match(/https:\/\/(www\.)?jianshu\.com\/p\/[\w]{12}/);
      if (jianshuMatch && matchStatus !== 1) {
        matchStatus = 1;
        result = await this.service.postImport.handleJianShu(jianshuMatch[0]);
      }
    }

    if (matchStatus === 0) {
      ctx.body = ctx.msg.importPlatformNotSupported;
      return;
    }
    if (result) {
      // console.log(result.content);
      this.logger.info('PostController:: importer: Import article succeed..', url);
      ctx.body = ctx.msg.success;
      ctx.body.data = result;
      return;
    }
    this.logger.info('PostController:: importer: Import article failed..', url);
    ctx.body = ctx.msg.failure;
  }

  async uploadImage() {
    const ctx = this.ctx;
    const file = ctx.request.files[0];
    const filetype = file.filename.split('.');

    // 文件上OSS的路径
    const filename = '/image/'
      + moment().format('YYYY/MM/DD/')
      + md5(file.filepath).toString()
      + '.' + filetype[filetype.length - 1];

    // // 文件在本地的缓存路径
    // const filelocation = 'uploads/' + path.basename(file.filename);

    // filepath需要再改
    const uploadStatus = await this.service.post.uploadImage(filename, file.filepath);

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

    // data.content = data.content
    //   .split('\n') // 分开段落来 sanitize 避免有问题的tag把文章吞掉
    //   .map(paragraph => sanitize(paragraph, {
    //     allowedTags: [ 'b', 'i', 'em', 'strong', 'a', 'iframe' ],
    //     allowedAttributes: {
    //       a: [ 'href' ],
    //       iframe: [ 'src' ],
    //     },
    //     // allowedIframeHostnames: [ 'www.youtube.com', 'player.bilibili.com' ],
    //   }))
    //   .join('\n'); // 再拼接回去

    this.logger.info('upload ipfs data', data);
    // 上传的data是json对象， 需要字符串化
    const uploadRequest = await this.service.post.ipfsUpload(JSON.stringify(data));

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
      if (!this.hasPermission(post, ctx.user.id)) {
        ctx.body = ctx.msg.postNoPermission;
        return;
      }
    }

    // 从ipfs获取内容
    const catchRequest = await this.service.post.ipfsCatch(hash);

    if (catchRequest) {
      ctx.body = ctx.msg.success;
      // 字符串转为json对象
      ctx.body.data = JSON.parse(catchRequest.toString());
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
  stats() {
    const ctx = this.ctx;
    ctx.body = ctx.msg.success;
    ctx.body.data = this.ctx.app.cache.post.stats;
  }

  // 持币阅读
  async addMineTokens() {
    const ctx = this.ctx;
    const { signId, tokens } = ctx.request.body;
    if (!signId) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    const result = await ctx.service.post.addMineTokens(ctx.user.id, signId, tokens);
    if (result === 0) {
      ctx.body = ctx.msg.success;
    } else {
      ctx.body = ctx.msg.failure;
    }
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
    const result = await ctx.service.references.addReference(ctx.user.id, signId, url, title, summary);

    ctx.body = result === 0 ? ctx.msg.success : ctx.msg.failure;
  }

  async deleteReference() {
    const ctx = this.ctx;
    const signId = parseInt(ctx.params.id);
    const number = parseInt(ctx.params.number);

    const result = await ctx.service.references.deleteReferenceNode(ctx.user.id, signId, number);

    ctx.body = result === 0 ? ctx.msg.success : ctx.msg.failure;
  }

  async getReference() {
    const ctx = this.ctx;
    const signId = parseInt(ctx.params.id);
    const number = parseInt(ctx.params.number);

    const ref = await ctx.service.references.getReference(ctx.user.id, signId, number);

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
    const result = await ctx.service.references.addDraftReference(ctx.user.id, draftId, url, title, summary);

    ctx.body = result === 0 ? ctx.msg.success : ctx.msg.failure;
  }

  async deleteDraftReference() {
    const ctx = this.ctx;
    const draftId = parseInt(ctx.params.id);
    const number = parseInt(ctx.params.number);

    const result = await ctx.service.references.deleteDraftReferenceNode(ctx.user.id, draftId, number);

    ctx.body = result === 0 ? ctx.msg.success : ctx.msg.failure;
  }

  async getDraftReference() {
    const ctx = this.ctx;
    const draftId = parseInt(ctx.params.id);
    const number = parseInt(ctx.params.number);

    const ref = await ctx.service.references.getDraftReference(ctx.user.id, draftId, number);

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
    const result = await ctx.service.references.publish(ctx.user.id, draftId, signId);

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

    const references = await this.service.references.getReferences(signId, parseInt(page), parseInt(pagesize));

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

    const references = await this.service.references.getDraftReferences(signId, parseInt(page), parseInt(pagesize));

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

    const posts = await this.service.references.getPosts(signId, parseInt(page), parseInt(pagesize));

    if (posts === null) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = posts;
  }

  // 设置订单价格
  async addPrices() {
    const ctx = this.ctx;
    const signId = parseInt(ctx.params.id);
    const { price } = ctx.request.body;
    const result = await this.service.post.addPrices(ctx.user.id, signId, price);
    ctx.body = result === 0 ? ctx.msg.success : ctx.msg.failure;
  }

  async delPrices() {
    const ctx = this.ctx;
    const signId = parseInt(ctx.params.id);
    const result = await this.service.post.delPrices(ctx.user.id, signId);
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
}

module.exports = PostController;
