/* eslint-disable no-bitwise */
'use strict';
const consts = require('./consts');

const Service = require('egg').Service;
const _ = require('lodash');
const moment = require('moment');
// const axios = require('axios').default;
const fs = require('fs');
const removeMD = require('remove-markdown');
const { articleToHtml } = require('markdown-article-to-html');
const { v4 } = require('uuid');

class PostService extends Service {

  constructor(ctx, app) {
    super(ctx, app);
    this.app.mysql.queryFormat = function(query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function(txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    };
  }

  // 洗去内容的md和html标签， 还有空格和换行等不显示字符
  async wash(rawContent) {
    let parsedContent = rawContent;
    // 去除markdown图片链接
    parsedContent = parsedContent.replace(/!\[.*?\]\((.*?)\)/gi, '');
    // 去除video标签
    parsedContent = parsedContent.replace(/<video.*?>\n*?.*?\n*?<\/video>/gi, '');
    parsedContent = parsedContent.replace(/<[^>]+>/gi, '');
    // 去除audio标签
    parsedContent = parsedContent.replace(/<audio.*?>\n*?.*?\n*?<\/audio>/gi, '');
    parsedContent = parsedContent.replace(/<[^>]+>/gi, '');
    // 去除source标签
    parsedContent = parsedContent.replace(/<source.*?>\n*?.*?\n*?<\/source>/gi, '');
    parsedContent = parsedContent.replace(/<[^>]+>/gi, '');
    // parsedContent = parsedContent.substring(0, 600);
    // 去除[read]加密语法
    parsedContent = this.service.extmarkdown.removeReadTags(parsedContent);
    // 去除markdown和html
    parsedContent = removeMD(parsedContent);
    // 去除空格
    parsedContent = parsedContent.replace(/\s+/g, '');
    // parsedContent = parsedContent.substring(0, 300);
    return parsedContent;
  }


  async fullPublish(
    user,
    author = '',
    title = '',
    data,
    fissionFactor = 2000,
    cover,
    is_original = 0,
    platform = 'eos',
    tags = [],
    assosiateWith = 0,
    commentPayPoint = 0,
    shortContent = null,
    cc_license = null,
    // 新字段，requireToken 和 requireBuy 对应老接口的 data
    requireToken = null,
    requireBuy = null,
    // 持币编辑相关字段
    editRequireToken = null,
    editRequireBuy = null,
    // Indie blog
    indie_post = false,
    indie_sync_tags = false,
    ipfs_hide = false
  ) {
    const ctx = this.ctx;
    // const _startTime = Date.now();

    // 修改requireBuy为数组
    const isEncrypt = Boolean(requireToken && requireToken.length > 0) || Boolean(requireBuy && requireBuy.length > 0);

    // 检查Fan票协作者权限
    if (requireToken) {
      for (let i = 0; i < requireToken.length; i++) {
        if (!await this.service.token.mineToken.isItCollaborator(user.id, requireToken[i].tokenId)) {
          return ctx.msg.notCollaborator;
        }
      }
    }
    if (requireBuy) {
      for (let i = 0; i < requireBuy.length; i++) {
        // 需要注意CNY的情况下 tokenId 是 0
        if (requireBuy[i].tokenId && !await this.service.token.mineToken.isItCollaborator(user.id, requireBuy[i].tokenId)) {
          return ctx.msg.notCollaborator;
        }
      }
    }
    if (editRequireToken) {
      for (let i = 0; i < editRequireToken.length; i++) {
        if (!await this.service.token.mineToken.isItCollaborator(user.id, editRequireToken[i].tokenId)) {
          return ctx.msg.notCollaborator;
        }
      }
    }

    // 只清洗文章文本的标识
    data.content = this.service.extmarkdown.toIpfs(data.content);
    const articleContent = await this.wash(data.content);

    // 设置短摘要
    const short_content
      = shortContent
      || (await this.service.extmarkdown.shortContent(articleContent));


    let hashDict = null;
    if (indie_post === true) {

      let tags_for_indie = [];
      if (indie_sync_tags === true) {
        tags_for_indie = tags;
      } else {
        tags_for_indie = [];
      }

      hashDict = await this.uploadArticleToGithub({
        isEncrypt,
        data,
        title,
        displayName: ctx.helper.emailMask(user.nickname || user.username),
        description: short_content,
        uid: user.id,
        tags: tags_for_indie,
      });
    } else {
      hashDict = await this.uploadArticleToIpfs({
        isEncrypt,
        data,
        title,
        displayName: ctx.helper.emailMask(user.nickname || user.username),
        description: short_content,
        uid: user.id,
      });
    }

    const metadataHash = hashDict.metadataHash;
    const htmlHash = hashDict.htmlHash;

    switch (metadataHash) {
      case 1:
      case 2:
        return ctx.msg.githubAccountError;
      case 3:
      case 4:
        return ctx.msg.paramsError;
      default:
        ctx.logger.info('postController:: metadataHash: ', metadataHash);
    }

    switch (htmlHash) {
      case 1:
      case 2:
        return ctx.msg.githubAccountError;
      case 3:
      case 4:
        return ctx.msg.paramsError;
      default:
        ctx.logger.info('postController:: htmlHash: ', htmlHash);
    }

    // 无 hash 则上传失败
    if (!metadataHash || !htmlHash) return ctx.msg.ipfsUploadFailed;
    ctx.logger.info('debug info', title, isEncrypt);

    if (fissionFactor > 2000) {
      return ctx.msg.postPublishParamsError; // msg: 'fissionFactor should >= 2000',
    }

    // 评论需要支付的积分
    const comment_pay_point = parseInt(commentPayPoint);
    // if (comment_pay_point > 99999 || comment_pay_point < 1) {
    //   ctx.body = ctx.msg.pointCommentSettingError;
    //   return;
    // }

    const create_time = moment().format('YYYY-MM-DD HH:mm:ss');

    const id = await this.publish(
      {
        author,
        username: user.username,
        title,
        hash: metadataHash,
        is_original,
        fission_factor: fissionFactor,
        create_time,
        assosiate_with: assosiateWith,
        cover, // 封面url
        platform,
        uid: user.id,
        is_recommend: 0,
        category_id: 0,
        short_content,
        comment_pay_point,
        cc_license,
        ipfs_hide,
      },
      { metadataHash, htmlHash }
    );

    // 记录付费信息
    if (requireToken) {
      await this.addMineTokens(user.id, id, requireToken);
    }

    // 超过 0 元才算数，0元则无视
    if (requireBuy && requireBuy.length > 0) {
      const price = requireBuy[0].amount;
      const tokenId = requireBuy[0].tokenId;
      await this.addArticlePay(user.id, id, price, tokenId);
    }

    // 记录持币编辑信息
    if (editRequireToken) {
      await this.service.post.addEditMineTokens(
        user.id,
        id,
        editRequireToken
      );
    }

    // 记录购买编辑权限信息
    if (editRequireBuy && editRequireBuy.price > 0) {
      await this.addPrices(
        user.id,
        id,
        editRequireBuy.price,
        1
      );
    }

    // 添加文章到elastic search
    await this.service.search.importPost(
      id,
      user.id,
      title,
      articleContent
    );

    await this.create_tags(id, tags);

    if (id > 0) {
      // 发送同步需要的数据到缓存服务器
      this.service.cacheAsync.post(id, user.id, create_time);

      return {
        ...ctx.msg.success,
        data: id,
      };
    } else if (id === -1) {
      return ctx.msg.postDuplicated;
    }

    return ctx.msg.postPublishError; // todo 可以再细化失败的原因
  }

  async publish(data, { metadataHash, htmlHash }) {
    try {
      const result = await this.app.mysql.insert('posts', data);

      if (result.affectedRows === 1) {
        // 创建统计表栏目
        await this.app.mysql.query(
          'INSERT INTO post_read_count(post_id, real_read_count, sale_count, support_count, eos_value_count, ont_value_count)'
          + ' VALUES(?, 0, 0, 0 ,0, 0);',
          [ result.insertId ]
        );

        // await this.app.redis.multi()
        //   .sadd('post', result.insertId)
        //   .hincrby('post:stat', 'count', 1)
        //   .zadd('post:hot:filter:1', 0, result.insertId)
        //   .exec();

        // 加积分
        await this.service.mining.publish(data.uid, result.insertId, ''); // todo；posts表增加ip，这里传进来ip
        // 添加 IPFS 记录
        await this.app.mysql.insert('post_ipfs',
          { articleId: result.insertId, metadataHash, htmlHash }
        );
        return result.insertId;
      }
    } catch (err) {
      if (err && err.code === 'ER_DUP_ENTRY') {
        // 数据库已经有记录了，提醒查重发现
        return -1;
      }

      this.logger.error('PostService::publish error: %j', err);
    }

    return 0;
  }

  async create_tags(sid, tag_arr, replace) {
    try {
      // 重置文章的标签
      if (replace) {
        await this.app.mysql.query('update tags inner join post_tag on post_tag.tid=tags.id and post_tag.sid=? set tags.num=tags.num-1',
          [ sid ]); // 所有关联标签的计数-1
        await this.app.mysql.delete('post_tag', { sid }); // 删除所有关联
      }

      for (let i = 0; i < tag_arr.length; i++) {
        const name = tag_arr[i];
        let tag = await this.app.mysql.get('tags', { name });
        if (tag) {
          await this.app.mysql.query('update tags set tags.num=tags.num+1 where tags.id=?', [ tag.id ]);
        } else {
          await this.app.mysql.insert('tags', {
            name, num: 1,
            type: 'post', create_time: this.app.mysql.literals.now,
          });
          tag = await this.app.mysql.get('tags', { name });
        }
        // 导入es
        await this.service.search.importTag({
          id: tag.id,
          name,
        });
        await this.app.mysql.insert('post_tag', { sid, tid: tag.id });
      }
    } catch (err) {
      this.logger.error('PostService::create_tags error: %j', err);
    }
  }
  // 根据文章id获取该文章的所有tag
  async getTagsById(sid) {
    return await this.app.mysql.query('select tags.* from tags inner join post_tag on post_tag.sid = ? and tags.id=post_tag.tid',
      [ sid ]);
  }
  // 获取最热门的k个标签,with offset
  async getHotestTags(k, offset) {
    try {
      const count = await this.app.mysql.query('select count(*) as `count` from tags');
      const result = await this.app.mysql.query('select * from tags order by num desc limit ?,?', [ offset, k ]);
      return { count: count[0].count, list: result };
    } catch (e) {
      return {
        count: 0,
        list: [],
      };
    }
  }
  async gteLatestTags(k, offset) {
    try {
      const count = await this.app.mysql.query('select count(*) as `count` from tags');
      const result = await this.app.mysql.query('SELECT * FROM tags ORDER BY create_time DESC LIMIT ?, ?;', [ offset, k ]);
      return { count: count[0].count, list: result };
    } catch (e) {
      return {
        count: 0,
        list: [],
      };
    }
  }

  // 根据hash获取文章
  async getByHash(hash, requireProfile) {
    const posts = await this.app.mysql.query(
      'SELECT id, username, author, title, short_content, hash, status, onchain_status, create_time, fission_factor, '
      + 'cover, is_original, channel_id, fission_rate, referral_rate, uid, is_recommend, category_id, comment_pay_point, require_holdtokens, require_buy FROM posts WHERE hash = ?;',
      [ hash ]
    );
    let post = posts[0];
    if (!post) {
      return null;
    }

    if (requireProfile) {
      post = await this.getPostProfile(post);
    }
    post.tokens = await this.getMineTokens(post.id);
    // 持币编辑
    post.editTokens = await this.getEditMineTokens(post.id);
    post.username = this.service.user.maskEmailAddress(post.username);
    return post;
  }

  // 根据id获取文章-简单版
  async get(id) {
    const posts = await this.app.mysql.select('posts', {
      where: { id },
      columns: [ 'id', 'hash', 'cover', 'uid', 'title', 'short_content',
        'status', 'create_time', 'comment_pay_point', 'channel_id',
        'require_buy', 'ipfs_hide', 'assosiate_with' ], // todo：需要再增加
    });
    if (posts && posts.length > 0) {
      return posts[0];
    }
    return null;
  }
  async getById2(id) {
    const posts = await this.app.mysql.query(
      `SELECT p.*,
      u.username, u.nickname, u.platform, u.avatar,
      prc.real_read_count, prc.likes, prc.dislikes
      FROM posts p
      LEFT JOIN users u
      ON p.uid = u.id
      LEFT JOIN post_read_count prc
      ON p.id = prc.post_id
      WHERE p.id = ?;`,
      [ id ]
    );

    if (posts === null || posts.length === 0) {
      return null;
    }

    const post = posts[0];
    return post;
  }

  /** 通过文章id的数组获取文章简略信息，主要用于在通知中获取文章摘要 */
  async getByIdArray(idList) {
    const posts = await this.app.mysql.query(
      `SELECT p.id, p.title, p.short_content, p.cover,
      prc.real_read_count, prc.likes
      FROM posts p
      LEFT JOIN post_read_count prc
      ON p.id = prc.post_id
      WHERE p.id IN (:idList);`,
      { idList }
    );

    if (posts === null) return [];
    return posts;
  }
  /**
   * 通过分享ID获取简略信息
   * @idList []
   */
  async getByIdArrayShare(idList) {
    const posts = await this.app.mysql.query(
      `
        SELECT
          p.id, p.short_content,
          t2.username, t2.nickname, t2.platform, t2.avatar, t2.id uid,
          t3.real_read_count, t3.likes, t3.dislikes,
          COUNT(t4.id) AS media_count, t4.type AS media_type, t4.url AS media_url
        FROM posts p
          LEFT JOIN users t2
          ON p.uid = t2.id
          LEFT JOIN post_read_count t3
          ON p.id = t3.post_id
          LEFT JOIN dynamic_media t4
          ON p.id = t4.post_id
        WHERE p.channel_id = 3 AND p.id IN (:idList)
        GROUP BY p.id, p.short_content, t2.username, t2.nickname, t2.platform, t2.avatar, t2.id, t3.real_read_count, t3.likes, t3.dislikes, t4.type, t4.url;
      `,
      { idList }
    );

    if (posts === null) return [];
    return posts;
  }

  // 根据id获取文章
  /*
  查询太多影响性能，修改计划：
    把公共属性和持币阅读权限放到一起返回
    其他和当前登录相关的属性放入新接口返回
  */
  async getById(id) {
    const posts = await this.app.mysql.query(
      'SELECT id, username, author, title, short_content, short_content_share, hash, status, onchain_status, create_time, fission_factor, ipfs_hide,'
      + 'cover, is_original, channel_id, fission_rate, referral_rate, uid, is_recommend, category_id, comment_pay_point, require_holdtokens, require_buy, cc_license, assosiate_with FROM posts WHERE id = ?;',
      [ id ]
    );

    if (posts === null || posts.length === 0) {
      return null;
    }

    let post = posts[0];
    post = await this.getPostProfile(post);
    post.tokens = await this.getMineTokens(id);
    // 持币编辑
    post.editTokens = await this.getEditMineTokens(id);
    post.username = this.service.user.maskEmailAddress(post.username);
    // 媒体
    if (post.channel_id === 3) post.media = await this.service.share.getMedia([ id ]) || [];

    return post;
  }

  async getForEdit(id, current_user) {
    const posts = await this.app.mysql.query(
      'SELECT id, username, author, title, short_content, hash, status, onchain_status, create_time, fission_factor, '
      + 'cover, is_original, channel_id, fission_rate, referral_rate, uid, is_recommend, category_id, comment_pay_point, require_holdtokens, assosiate_with FROM posts WHERE id = ? AND uid = ?;',
      [ id, current_user ]
    );

    if (posts === null || posts.length === 0) {
      return null;
    }

    let post = posts[0];
    post = await this.getPostProfile(post);
    post.tokens = await this.getMineTokens(id);
    // 持币编辑
    post.editTokens = await this.getEditMineTokens(id);
    post.username = this.service.user.maskEmailAddress(post.username);
    return post;
  }

  // 获取文章阅读数等属性
  async getPostProfile(post) {
    // 如果是商品，返回价格
    post.prices = await this.getPrices(post.id, 0);
    // 检查付费编辑价格
    post.editPrices = await this.getPrices(post.id, 1);

    // 阅读次数
    const count = await this.app.mysql.query(
      'SELECT post_id AS id, real_read_count AS num, sale_count AS sale, support_count AS ups, eos_value_count AS eosvalue, ont_value_count AS ontvalue, likes, dislikes'
      + ' FROM post_read_count WHERE post_id = ?;',
      [ post.id ]
    );
    if (count.length) {
      post.read = count[0].num;
      post.sale = count[0].sale;
      post.ups = count[0].ups;
      post.value = count[0].eosvalue;
      post.ontvalue = count[0].ontvalue;
      post.likes = count[0].likes;
      post.dislikes = count[0].dislikes;
    } else {
      post.read = post.sale = post.ups = post.value = post.ontvalue = post.likes = post.dislikes = 0;
    }

    // tags
    const tags = await this.app.mysql.query(
      'select a.id, a.name from tags a left join post_tag b on a.id = b.tid where b.sid = ? ',
      [ post.id ]
    );

    post.tags = tags;

    // nickname
    const user = await this.service.user.get(post.uid); // this.app.mysql.get('users', { username: name });
    if (user) {
      post.nickname = user.nickname;
    }

    // update cache
    // this.app.read_cache[post.id] = post.read;
    // this.app.value_cache[post.id] = post.value;
    // this.app.ups_cache[post.id] = post.ups;

    // this.app.post_cache[post.id] = post;

    return post;
  }

  // 登录用户查看与自己相关的属性
  async getPostProfileOf(id, userId) {
    if (!userId) {
      return null;
    }

    const post = await this.get(id);
    if (!post) {
      return null;
    }

    post.holdMineTokens = await this.getHoldMineTokens(id, userId);

    // 当前用户是否已赞赏
    post.is_support = false;
    const support = await this.app.mysql.get('supports', { signid: post.id, uid: userId, status: 1 });
    if (support) {
      post.is_support = true;
    }

    // 如果是商品，判断当前用户是否已购买
    if (post.channel_id === consts.postChannels.product) {
      post.is_buy = false;
      const buy = await this.app.mysql.get('orders', { signid: post.id, uid: userId, status: 1 });
      if (buy) {
        post.is_buy = true;
      }
    }

    // 如果是文章，并且需要购买，判断当前用户是否已购买
    if (post.channel_id === consts.postChannels.article && post.require_buy === 1) {
      post.is_buy = false;
      const buy = await this.service.shop.order.isBuy(id, userId);
      if (buy) {
        post.is_buy = true;
      }
    }

    // 是否点过推荐/不推荐，每个人只能点一次推荐/不推荐
    post.is_liked = await this.service.mining.liked(userId, post.id);
    // 获取用户从单篇文章阅读获取的积分
    post.points = await this.service.mining.getPointsLogBySignId(userId, post.id);

    // 判断3天内的文章是否领取过阅读新文章奖励，3天以上的就不查询了
    if ((Date.now() - post.create_time) / (24 * 3600 * 1000) <= 3) {
      post.is_readnew = await this.service.mining.getReadNew(userId, post.id);
    }

    // 是否收藏
    const { isBookmarked } = (await this.app.mysql.query('SELECT EXISTS (SELECT 1 FROM post_bookmarks WHERE uid = ? AND pid = ?) isBookmarked;', [ userId, id ]))[0];
    post.is_bookmarked = isBookmarked;

    return post;
  }

  // 获取商品价格
  async getPrices(signId, category = 0) {
    const prices = await this.app.mysql.query(`
      SELECT p.token_id, p.platform, p.price, p.decimals, p.stock_quantity, m.symbol, m.logo, m.name
      FROM product_prices p
      LEFT JOIN minetokens m
      ON p.token_id = m.id
      WHERE p.sign_id = ? AND p.status = 1 AND p.category = ?;
    `, [ signId, category ]);
    if (prices && prices.length > 0 && prices[0].token_id === 0) {
      prices[0].symbol = 'CNY';
    }
    return prices;
  }

  // 获取我关注的作者的文章
  async followedPosts(page = 1, pagesize = 20, userId = null, channel = null, extra = null, filter = 0) {

    if (userId === null) {
      return 2;
    }

    const totalSQL = 'SELECT COUNT(*) AS count FROM posts p INNER JOIN follows f ON f.fuid = p.uid AND f.status = 1 ';
    const listSQL = 'SELECT p.id AS signid FROM posts p INNER JOIN follows f ON f.fuid = p.uid AND f.status = 1 ';
    const orderSQL = 'ORDER BY p.id DESC LIMIT :start, :end';
    let whereSQL = 'WHERE f.uid = :uid AND p.status = 0 ';

    const channelId = parseInt(channel);
    if (channel) {
      if (isNaN(channelId)) {
        return 2;
      }
      whereSQL += 'AND p.channel_id = ' + channelId + ' ';
    }

    if (typeof filter === 'string') filter = parseInt(filter);

    if (filter > 0) {
      const conditions = [];

      // 免费
      if ((filter & 1) > 0) {
        conditions.push('(require_holdtokens = 0 AND require_buy = 0)');
      }

      // 持币阅读
      if ((filter & 2) > 0) {
        conditions.push('require_holdtokens = 1');
      }

      // 需要购买
      if ((filter & 4) > 0) {
        conditions.push('require_buy = 1');
      }

      whereSQL += 'AND (' + conditions.join(' OR ') + ') ';
    }

    const sqlCode = totalSQL + whereSQL + ';' + listSQL + whereSQL + orderSQL + ';';
    const queryResult = await this.app.mysql.query(
      sqlCode,
      { uid: userId, start: (page - 1) * pagesize, end: 1 * pagesize }
    );

    const amount = queryResult[0];
    const posts = queryResult[1];

    const postIds = [];
    _.each(posts, row => {
      postIds.push(row.signid);
    });

    const extraItem = {};
    if (extra) {
      const extraSplit = extra.split(',');
      _.each(extraSplit, row => {
        if (row === 'short_content') {
          extraItem.short_content = true;
        }
      });
    }


    if (postIds.length === 0) {
      // return [];
      return { count: 0, list: [] };
    }

    const postList = await this.getPostList(postIds, extraItem);

    return { count: amount[0].count, list: postList };

  }
  async followedPostsFast(page = 1, pagesize = 20, userid = null, channel = 1) {
    const followKey = `user:${userid}:follow_set`;
    const followIds = await this.app.redis.smembers(followKey);
    if (followIds === null || followIds.length <= 0) {
      return {
        count: 0,
        list: [],
      };
    }
    const sql = `
    SELECT a.id, a.uid, a.author, a.title, a.hash, a.create_time, a.cover, a.require_holdtokens, a.require_buy, a.short_content, a.is_recommend,
    b.nickname, b.avatar, b.is_recommend AS user_is_recommend,
    c.real_read_count AS \`read\`, c.likes,

    t5.platform as pay_platform, t5.symbol as pay_symbol, t5.price as pay_price, t5.decimals as pay_decimals, t5.stock_quantity as pay_stock_quantity,
    t7.id as token_id, t6.amount as token_amount, t7.name as token_name, t7.symbol as token_symbol, t7.decimals  as token_decimals

    FROM posts a
    LEFT JOIN users b ON a.uid = b.id
    LEFT JOIN post_read_count c ON a.id = c.post_id

    LEFT JOIN product_prices t5
    ON a.id = t5.sign_id
    LEFT JOIN post_minetokens t6
    ON a.id = t6.sign_id
    LEFT JOIN minetokens t7
    ON t7.id = t6.token_id

    WHERE a.uid IN (:uIds) AND a.\`status\` = 0 AND a.channel_id = :channel
    ORDER BY a.create_time DESC
    LIMIT :start, :end;

    SELECT COUNT(*) AS count FROM posts a
    WHERE a.uid IN (:uIds) AND a.\`status\` = 0 AND a.channel_id = :channel;
    `;
    const queryResult = await this.app.mysql.query(
      sql,
      { start: (page - 1) * pagesize, end: 1 * pagesize, uIds: followIds, channel }
    );

    const posts = queryResult[0];
    const amount = queryResult[1];
    if (posts.length === 0) {
      return { count: 0, list: [] };
    }
    const emailMask = this.ctx.helper.emailMask;
    const list = posts.map(post => {
      const author = emailMask(post.author);
      return { ...post, author };
    });

    // 返沪用户是否发币
    const listFormat = await this.service.token.mineToken.formatListReturnTokenInfo(list, 'uid');

    return {
      count: amount[0].count,
      list: listFormat,
    };
  }

  async scoreRank(page = 1, pagesize = 20, filter = 7) {
    let count, ids;

    if ((filter & 6) === 6 && !await this.app.redis.exists('post:hot:filter:6')) {
      await this.app.redis.pipeline()
        .zinterstore('post:hot:filter:6_common', 2, 'post:hot:filter:2', 'post:hot:filter:4', 'WEIGHTS', 1, 0)
        .expire('post:hot:filter:6_common', 10)
        .zunionstore('post:hot:filter:6', 3, 'post:hot:filter:2', 'post:hot:filter:4', 'post:hot:filter:6_common', 'WEIGHTS', 1, 1, -1)
        .expire('post:hot:filter:6', 300)
        .exec();
    }

    if (filter === 6) {
      ids = await this.app.redis.zrevrange('post:hot:filter:6', (page - 1) * pagesize, page * pagesize - 1);
      count = Number(await this.app.redis.zcard('post:hot:filter:6'));
    } else {
      const keys = new Set();
      // 免费
      if ((filter & 1) > 0) keys.add('post:hot:filter:1');

      if ((filter & 6) === 6) {
        keys.add('post:hot:filter:6');
      } else {
        // 持币阅读
        if ((filter & 2) > 0) keys.add('post:hot:filter:2');
        // 需要购买
        if ((filter & 4) > 0) keys.add('post:hot:filter:4');
      }

      if (keys.size === 1) {
        const key = Array.from(keys)[0];

        ids = await this.app.redis.zrevrange(key, (page - 1) * pagesize, page * pagesize - 1);
        count = Number(await this.app.redis.zcard(key));
      } else {
        const key = 'post:hot:filter:' + filter;

        if (await this.app.redis.exists(key)) {
          ids = await this.app.redis.zrevrange(key, (page - 1) * pagesize, page * pagesize - 1);
        } else {
          const pipeline = this.app.redis.multi();
          pipeline.zunionstore(key, keys.size, Array.from(keys)).zrevrange(key, (page - 1) * pagesize, page * pagesize - 1);
          pipeline.expire(key, 300);

          const resultSet = await pipeline.exec();
          ids = resultSet[1][1];
        }

        count = Number(await this.app.redis.zcard(key));
      }
    }

    ids = ids.map(id => Number(id));

    return { count, list: await this.getPostList(ids) };
  }
  // 推荐分数排序(默认方法)(new format)(count-list格式)
  async scoreRankSlow_backup(page = 1, pagesize = 20, author = null, channel = null, extra = null, filter = 0) {

    // 获取文章列表, 分为商品文章和普通文章
    // 再分为带作者和不带作者的情况.

    const totalSQL = 'SELECT COUNT(*) AS count FROM posts ';
    let whereSQL = 'WHERE status = 0 ';

    if (author) {
      whereSQL += 'AND uid = :author ';
    }
    const channelId = parseInt(channel);
    if (channel !== null) {
      if (isNaN(channelId)) {
        return 2;
      }
      whereSQL += 'AND channel_id = ' + channelId + ' ';
    }

    if (typeof filter === 'string') filter = parseInt(filter);

    if (filter > 0) {
      const conditions = [];

      // 免费
      if ((filter & 1) > 0) {
        conditions.push('(require_holdtokens = 0 AND require_buy = 0)');
      }

      // 持币阅读
      if ((filter & 2) > 0) {
        conditions.push('require_holdtokens = 1');
      }

      // 需要购买
      if ((filter & 4) > 0) {
        conditions.push('require_buy = 1');
      }

      whereSQL += 'AND (' + conditions.join(' OR ') + ') ';
    }
    const postIds = await this.service.hot.list(page, pagesize, 1);

    const sqlCode = totalSQL + whereSQL + ';';
    const queryResult = await this.app.mysql.query(
      sqlCode,
      { author, start: (page - 1) * pagesize, end: 1 * pagesize }
    );

    const amount = queryResult[0];

    if (postIds.length === 0) {
      return { count: 0, list: [] };
    }

    const extraItem = {};
    if (extra) {
      const extraSplit = extra.split(',');
      _.each(extraSplit, row => {
        if (row === 'short_content') {
          extraItem.short_content = true;
        }
      });
    }

    const postList = await this.getPostList(postIds, extraItem);

    return { count: amount.count, list: postList };
  }
  // 推荐分数排序(默认方法)(new format)(count-list格式)
  async scoreRankSlow(page = 1, pagesize = 20, channel = 1) {
    const postIds = await this.service.hot.list(page, pagesize, channel);
    if (postIds === null || postIds.length <= 0) {
      return {
        count: 0,
        list: [],
      };
    }
    const sql = `SELECT a.id, a.uid, a.author, a.title, a.hash, a.create_time, a.cover, a.require_holdtokens, a.require_buy, a.short_content, a.is_recommend,
      b.nickname, b.avatar, b.is_recommend AS user_is_recommend,
      c.real_read_count AS \`read\`, c.likes,

      t5.platform as pay_platform, t5.symbol as pay_symbol, t5.price as pay_price, t5.decimals as pay_decimals, t5.stock_quantity as pay_stock_quantity,
      t7.id as token_id, t6.amount as token_amount, t7.name as token_name, t7.symbol as token_symbol, t7.decimals  as token_decimals

      FROM posts a
      LEFT JOIN users b ON a.uid = b.id
      LEFT JOIN post_read_count c ON a.id = c.post_id

      LEFT JOIN product_prices t5
      ON a.id = t5.sign_id AND t5.category = 0
      LEFT JOIN post_minetokens t6
      ON a.id = t6.sign_id
      LEFT JOIN minetokens t7
      ON t7.id = t6.token_id

      WHERE a.id IN (:postIds)
      ORDER BY FIELD(a.id, :postIds);

      SELECT COUNT(*) AS count FROM posts a
      WHERE a.\`status\` = 0 AND a.channel_id = :channel;`;

    const queryResult = await this.app.mysql.query(
      sql,
      { start: (page - 1) * pagesize, end: 1 * pagesize, postIds, channel }
    );

    const posts = queryResult[0];
    const amount = queryResult[1];

    if (posts.length === 0) {
      return { count: 0, list: [] };
    }

    const len = posts.length;
    const id2posts = {};
    for (let i = 0; i < len; i++) {
      const row = posts[i];
      row.tags = [];
      id2posts[row.id] = row;
      postIds.push(row.id);
    }
    const tagSql = 'SELECT p.sid, p.tid, t.name, t.type FROM post_tag p LEFT JOIN tags t ON p.tid = t.id WHERE sid IN (:signId);';

    const tagResult = await this.app.mysql.query(
      tagSql,
      { signId: postIds }
    );
    const tagResultLen = tagResult.length;
    for (let i = 0; i < tagResultLen; i++) {
      const row = tagResult[i];
      const id = row.sid;
      id2posts[id].tags.push({
        id: row.tid, name: row.name, type: row.type,
      });
    }
    // Frank - 这里要展开屏蔽邮箱地址的魔法了
    const emailMask = this.ctx.helper.emailMask;
    const list = posts.map(post => {
      const author = emailMask(post.author);
      return { ...post, author };
    });

    // 返沪用户是否发币
    const listFormat = await this.service.token.mineToken.formatListReturnTokenInfo(list, 'uid');

    return { count: amount[0].count, list: listFormat };
  }

  // 发布时间排序()(new format)(count-list格式)
  async timeRank(page = 1, pagesize = 20, filter = 7) {
    const key = `post:time:filter:${filter}:${(page - 1) * pagesize}-${page * pagesize - 1}`;

    const count = await this.app.redis.zcard(`post:hot:filter:${filter}`);

    let ids = await this.app.redis.lrange(key, 0, pagesize - 1);
    if (ids.length === 0) {

      const conditions = [];
      // 免费
      if ((filter & 1) > 0) conditions.push('(require_holdtokens = 0 AND require_buy = 0)');
      // 持币阅读
      if ((filter & 2) > 0) conditions.push('require_holdtokens = 1');
      // 需要购买
      if ((filter & 4) > 0) conditions.push('require_buy = 1');

      const sql = `SELECT id FROM posts WHERE status = 0 AND channel_id = 1 AND (${conditions.join(' OR ')}) ORDER BY time_down ASC, id DESC LIMIT :start, :end;`;

      ids = (await this.app.mysql.query(sql, { start: (page - 1) * pagesize, end: 1 * pagesize })).map(row => row.id);

      await this.app.redis.multi()
        .rpush(key, ids)
        .expire(key, 300)
        .exec();
    }

    return { count, list: await this.getPostList(ids) };
  }
  async timeRankSlow(page = 1, pagesize = 20, author = null, channel = null, filter = 0, showingDeleted = false) {

    // 获取文章列表, 分为商品文章和普通文章
    // 再分为带作者和不带作者的情况.
    let whereSQL = 'WHERE a.channel_id = :channel ';
    if (!showingDeleted) whereSQL += ' AND a.\`status\` = 0 ';
    if (author) whereSQL += ' AND a.uid = :author ';

    if (typeof filter === 'string') filter = parseInt(filter);

    if (filter > 0) {
      const conditions = [];
      // 免费
      if ((filter & 1) > 0) {
        conditions.push('(require_holdtokens = 0 AND require_buy = 0)');
      }
      // 持币阅读
      if ((filter & 2) > 0) {
        conditions.push('require_holdtokens = 1');
      }
      // 需要购买
      if ((filter & 4) > 0) {
        conditions.push('require_buy = 1');
      }
      whereSQL += 'AND (' + conditions.join(' OR ') + ') ';
    }

    const sql = `SELECT a.id, a.uid, a.author, a.title, a.status, a.hash, a.create_time, a.cover, a.require_holdtokens, a.require_buy, a.short_content, a.is_recommend,
      b.nickname, b.avatar, b.is_recommend AS user_is_recommend,
      c.real_read_count AS \`read\`, c.likes,
      t5.platform as pay_platform, t5.symbol as pay_symbol, t5.price as pay_price, t5.decimals as pay_decimals, t5.stock_quantity as pay_stock_quantity,
      t7.id as token_id, t6.amount as token_amount, t7.name as token_name, t7.symbol as token_symbol, t7.decimals  as token_decimals

      FROM posts a
      LEFT JOIN users b ON a.uid = b.id
      LEFT JOIN post_read_count c ON a.id = c.post_id
      LEFT JOIN product_prices t5
      ON a.id = t5.sign_id AND t5.category = 0
      LEFT JOIN post_minetokens t6
      ON a.id = t6.sign_id
      LEFT JOIN minetokens t7
      ON t7.id = t6.token_id

      ${whereSQL}
      ORDER BY a.time_down ASC, a.id DESC LIMIT :start, :end;
      SELECT COUNT(*) AS count FROM posts a
      ${whereSQL};`;
    const queryResult = await this.app.mysql.query(
      sql,
      { author, start: (page - 1) * pagesize, end: 1 * pagesize, channel }
    );

    const posts = queryResult[0];
    const amount = queryResult[1];

    if (posts.length === 0) {
      return { count: 0, list: [] };
    }
    const postIds = [];
    const len = posts.length;
    const id2posts = {};
    for (let i = 0; i < len; i++) {
      const row = posts[i];
      row.tags = [];
      id2posts[row.id] = row;
      postIds.push(row.id);
    }
    const tagSql = 'SELECT p.sid, p.tid, t.name, t.type FROM post_tag p LEFT JOIN tags t ON p.tid = t.id WHERE sid IN (:signId);';

    const tagResult = await this.app.mysql.query(
      tagSql,
      { signId: postIds }
    );
    const tagResultLen = tagResult.length;
    for (let i = 0; i < tagResultLen; i++) {
      const row = tagResult[i];
      const id = row.sid;
      id2posts[id].tags.push({
        id: row.tid, name: row.name, type: row.type,
      });
    }
    // Frank - 这里要展开屏蔽邮箱地址的魔法了
    const emailMask = this.ctx.helper.emailMask;
    const list = posts.map(post => {
      const author = emailMask(post.author);
      return { ...post, author };
    });

    // 返沪用户是否发币
    const listFormat = await this.service.token.mineToken.formatListReturnTokenInfo(list, 'uid');

    return { count: amount[0].count, list: listFormat };
  }

  /**
   * 获取文章修改历史
   * @param {number} articleId 文章ID
   * @param {boolean} isFullHistory 是否获取全部历史，false 则返回最新一条
   * @return {Array} 历史记录，若 `isFullHistory` 为 false 则是长度为1的数组
   */
  async getArticlesHistory(articleId, isFullHistory = true) {
    const records = await this.app.mysql.select('post_ipfs', {
      where: { articleId },
      columns: [ 'id', 'htmlHash', 'createdAt' ], // 要查询的表字段
      orders: [[ 'id', 'desc' ]],
    });
    return isFullHistory ? records : records.slice(0, 1);
  }

  async getByPostIds(postIds = []) {
    if (postIds === null || postIds.length <= 0) {
      return [];
    }
    const sql = `SELECT a.id, a.uid, a.author, a.title, a.hash, a.create_time, a.cover, a.require_holdtokens, a.require_buy, a.short_content, a.is_recommend,
      b.nickname, b.avatar, b.is_recommend AS user_is_recommend,
      c.real_read_count AS \`read\`, c.likes,

      t5.platform as pay_platform, t5.symbol as pay_symbol, t5.price as pay_price, t5.decimals as pay_decimals, t5.stock_quantity as pay_stock_quantity,
      t7.id as token_id, t6.amount as token_amount, t7.name as token_name, t7.symbol as token_symbol, t7.decimals  as token_decimals

      FROM posts a
      LEFT JOIN users b ON a.uid = b.id
      LEFT JOIN post_read_count c ON a.id = c.post_id

      LEFT JOIN product_prices t5
      ON a.id = t5.sign_id AND t5.category = 0
      LEFT JOIN post_minetokens t6
      ON a.id = t6.sign_id
      LEFT JOIN minetokens t7
      ON t7.id = t6.token_id

      WHERE a.id IN (:postIds)
      ORDER BY FIELD(a.id, :postIds);`;

    const queryResult = await this.app.mysql.query(
      sql,
      { postIds }
    );

    const posts = queryResult;

    if (posts.length === 0) {
      return { count: 0, list: [] };
    }

    const len = posts.length;
    const id2posts = {};
    for (let i = 0; i < len; i++) {
      const row = posts[i];
      row.tags = [];
      id2posts[row.id] = row;
      postIds.push(row.id);
    }
    const tagSql = 'SELECT p.sid, p.tid, t.name, t.type FROM post_tag p LEFT JOIN tags t ON p.tid = t.id WHERE sid IN (:signid);';

    const tagResult = await this.app.mysql.query(
      tagSql,
      { signid: postIds }
    );
    const tagResultLen = tagResult.length;
    for (let i = 0; i < tagResultLen; i++) {
      const row = tagResult[i];
      const id = row.sid;
      id2posts[id].tags.push({
        id: row.tid, name: row.name, type: row.type,
      });
    }
    // Frank - 这里要展开屏蔽邮箱地址的魔法了
    const emailMask = this.ctx.helper.emailMask;
    const list = posts.map(post => {
      const author = emailMask(post.author);
      return { ...post, author };
    });
    return list;
  }

  // (new format)(count-list格式)
  async getPostByTag(page = 1, pagesize = 20, extra = null, tagId) {

    const totalSql = 'SELECT COUNT(*) AS count FROM post_tag a LEFT JOIN posts b ON a.sid = b.id ';
    const listSql = 'SELECT a.sid, a.tid, b.title FROM post_tag a LEFT JOIN posts b ON a.sid = b.id ';
    const whereSql = 'WHERE a.tid = :tid AND b.status = 0 ';
    const orderSql = 'ORDER BY b.id DESC LIMIT :start, :end';

    const sqlCode = totalSql + whereSql + ';' + listSql + whereSql + orderSql + ';';
    const queryResult = await this.app.mysql.query(
      sqlCode,
      { tid: tagId, start: (page - 1) * pagesize, end: 1 * pagesize }
    );

    const amount = queryResult[0];
    const posts = queryResult[1];

    // 将文章id转为Array
    const postIds = [];
    _.each(posts, row => {
      postIds.push(row.sid);
    });

    if (postIds.length === 0) {
      // return [];
      return { count: 0, list: [] };
    }

    const extraItem = {};
    if (extra) {
      const extraSplit = extra.split(',');
      _.each(extraSplit, row => {
        if (row === 'short_content') {
          extraItem.short_content = true;
        }
      });
    }

    const postList = await this.getPostList(postIds, extraItem);

    return { count: amount[0].count, list: postList };
  }

  // 赞赏次数排序(new format)(count-list格式)
  async supportRank(page = 1, pagesize = 20, channel = null, extra = null) {

    const totalSql = 'SELECT COUNT(*) AS count FROM posts p ';
    const listSql = 'SELECT p.id, c.support_count FROM posts p LEFT JOIN post_read_count c ON c.post_id = p.id ';
    let whereSql = 'WHERE p.status = 0 ';
    const orderSql = 'ORDER BY c.support_count DESC, p.id DESC LIMIT :start, :end';
    // 获取文章id列表, 按照统计表的赞赏次数排序
    const channelId = parseInt(channel);
    if (channel !== null) {
      if (isNaN(channelId)) {
        return 2;
      }
      whereSql += 'AND p.channel_id = ' + channelId + ' ';
    }
    const sqlCode = totalSql + whereSql + ';' + listSql + whereSql + orderSql + ';';
    // 在support表中, 由赞赏次数获得一个文章的排序, 并且已经确保文章是没有被删除的
    const queryResult = await this.app.mysql.query(
      sqlCode,
      { start: (page - 1) * pagesize, end: 1 * pagesize }
    );

    const amount = queryResult[0];
    const posts = queryResult[1];

    // 将文章id转为Array
    const postIds = [];
    _.each(posts, row => {
      postIds.push(row.id);
    });

    if (postIds.length === 0) {
      // return [];
      return { count: 0, list: [] };
    }

    const extraItem = {};
    if (extra) {
      const extraSplit = extra.split(',');
      _.each(extraSplit, row => {
        if (row === 'short_content') {
          extraItem.short_content = true;
        }
      });
    }

    let postList = await this.getPostList(postIds, extraItem);

    // 由赞赏次数进行排序
    // 还没加上时间降序
    postList = postList.sort((a, b) => {
      if (a.ups === b.ups) {
        return a.id > b.id ? -1 : 1;
      }
      return a.ups > b.ups ? -1 : 1;
    });

    return { count: amount[0].count, list: postList };
  }

  // 分币种的赞赏金额排序
  // 请注意因为"后筛选"导致的不满20条,进而前端无法加载的问题.
  // 暂时不使用， 因此没有维护
  async amountRank(page = 1, pagesize = 20, symbol = 'EOS', channel = null) {

    let posts = null;
    let sqlCode = '';

    // 获取文章id列表, 按照指定的币种赞赏金额排序
    if (symbol.toUpperCase() === 'EOS') {
      sqlCode = 'SELECT p.id, c.eos_value_count AS count ';
    } else {
      sqlCode = 'SELECT p.id, c.ont_value_count AS count ';
    }
    sqlCode += 'FROM posts p '
      + 'LEFT JOIN post_read_count c ON c.post_id = p.id '
      + 'WHERE p.status = 0 ';
    const channelId = parseInt(channel);
    if (channel !== null) {
      if (isNaN(channelId)) {
        return 2;
      }
      sqlCode += 'AND p.channel_id = ' + channelId + ' ';
    }
    sqlCode += 'ORDER BY count DESC, p.id DESC LIMIT :start, :end;';
    posts = await this.app.mysql.query(
      sqlCode,
      { start: (page - 1) * pagesize, end: 1 * pagesize, symbol: symbol.toUpperCase() }
    );

    // 将文章id转为Array
    const postIds = [];
    _.each(posts, row => {
      postIds.push(row.id);
    });

    if (postIds.length === 0) {
      return [];
      // return { count: 0, list: [] };
    }

    // 调用getPostList函数获得文章的具体信息
    // 此时序列已经被打乱了
    let postList = await this.getPostList(postIds);

    // 重新由赞赏金额进行排序
    // 还没加上时间降序
    switch (symbol.toUpperCase()) {
      case 'EOS':
        postList = postList.sort((a, b) => {
          if (a.eosvalue === b.eosvalue) {
            return a.id > b.id ? -1 : 1;
          }
          return a.eosvalue > b.eosvalue ? -1 : 1;
        });
        break;

      case 'ONT':
        postList = postList.sort((a, b) => {
          if (a.ontvalue === b.ontvalue) {
            return a.id > b.id ? -1 : 1;
          }
          return a.ontvalue > b.ontvalue ? -1 : 1;
        });
        break;
    }

    return postList;
  }

  // 获取用户赞赏过的文章(new format)(count-list格式)
  async supportedPosts(page = 1, pagesize = 20, userid = null, channel = null) {

    // 没写用户
    if (userid === null) {
      return 2;
    }

    const totalSql = 'SELECT COUNT(*) AS count FROM supports s INNER JOIN posts p ON s.signid = p.id ';
    const listSql = 'SELECT s.create_time, signid FROM supports s INNER JOIN posts p ON s.signid = p.id ';
    const orderSql = 'ORDER BY s.create_time DESC LIMIT :start, :end';
    let whereSql = 'WHERE s.status = 1 AND p.status = 0 AND s.uid = :uid ';

    const channelId = parseInt(channel);
    if (channel) {
      if (isNaN(channelId)) {
        return 2;
      }
      whereSql += 'AND p.channel_id = ' + channelId + ' ';
    }

    const sqlCode = totalSql + whereSql + ';' + listSql + whereSql + orderSql + ';';
    const queryResult = await this.app.mysql.query(
      sqlCode,
      { uid: userid, start: (page - 1) * pagesize, end: 1 * pagesize }
    );

    const amount = queryResult[0];
    const posts = queryResult[1];

    const postIds = [];
    _.each(posts, row => {
      postIds.push(row.signid);
    });

    if (postIds.length === 0) {
      // return [];
      return { count: 0, list: [] };
    }

    let postList = await this.getPostList(postIds);

    _.each(postList, row2 => {
      _.each(posts, row => {
        if (row.signid === row2.id) {
          row2.support_time = row.create_time;
        }
      });
    });

    postList = postList.sort((a, b) => {
      return b.id - a.id;
    });

    return { count: amount[0].count, list: postList };
  }

  async recommendPosts(amount = 5) {
    let ids = await this.app.redis.zrevrange('post:recommend', 0, amount);
    if (ids.length === 0) {
      ids = (await this.app.mysql.query('SELECT id FROM posts WHERE is_recommend = 1 AND status = 0 AND channel_id = 1;')).map(row => row.id);

      const pipeline = this.app.redis.multi();
      for (const id of ids) {
        pipeline.zadd('post:recommend', id, id);
      }
      await pipeline.expire('post:recommend', 300).exec();

      ids = await this.app.redis.zrevrange('post:recommend', 0, amount);
    }

    return await this.getPostList(ids);
  }
  async recommendPostsSlow(channel = null, amount = 5) {

    let sqlCode = '';
    sqlCode = 'SELECT id FROM posts '
      + 'WHERE is_recommend = 1 AND status = 0 ';
    const channelId = parseInt(channel);
    if (channel !== null) {
      if (isNaN(channelId)) {
        return 2;
      }
      sqlCode += 'AND channel_id = ' + channelId + ' ';
    }
    sqlCode += 'ORDER BY id DESC LIMIT :amountNum;';
    const amountNum = parseInt(amount);
    if (isNaN(amountNum)) {
      return 2;
    }
    const posts = await this.app.mysql.query(
      sqlCode,
      { amountNum }
    );

    const postIds = [];
    _.each(posts, row => {
      postIds.push(row.id);
    });

    if (postIds.length === 0) {
      return [];
      // return { count: 0, list: [] };
    }

    const postList = await this.getPostList(postIds);

    return postList;
  }

  // 获取文章的列表, 用于成片展示文章时, 会被其他函数调用
  async getPostList(signIds, extraItem = null) {

    let postList = [];

    if (signIds.length === 0) {
      return postList;
    }
    // 查询文章和作者的信息, 结果是按照时间排序
    // 如果上层也需要按照时间排序的, 则无需再排, 需要其他排序方式则需再排
    let sqlCode = 'SELECT a.id, a.uid, a.author, a.title,';
    if (extraItem) {
      if (extraItem.short_content) {
        sqlCode += ' a.short_content,';
      }
    }

    sqlCode += ' a.hash, a.create_time, a.cover, a.require_holdtokens, a.require_buy, a.is_recommend, b.nickname, b.avatar FROM posts a';
    sqlCode += ' LEFT JOIN users b ON a.uid = b.id WHERE a.id IN (:signIds) AND a.status = 0 ORDER BY FIELD(a.id, :signIds);';
    postList = await this.app.mysql.query(
      sqlCode,
      { signIds }
    );

    const hashs = [];

    // 准备需要返回的数据
    _.each(postList, row => {
      row.read = 0;
      row.eosvalue = 0;
      row.ups = 0;
      row.ontvalue = 0;
      row.tags = [];
      hashs.push(row.hash);
    });

    // 有关阅读次数,赞赏金额,赞赏次数的统计
    // 还有产品信息， 标签
    const statsQuery = await this.app.mysql.query(
      'SELECT post_id AS id, real_read_count AS num, sale_count AS sale, support_count AS ups, eos_value_count AS eosvalue, ont_value_count AS ontvalue, likes'
      + ' FROM post_read_count WHERE post_id IN (:signid);'
      + 'SELECT sign_id, symbol, price, decimals FROM product_prices WHERE sign_id IN (:signid) AND category = 0;'
      + 'SELECT p.sid, p.tid, t.name, t.type FROM post_tag p LEFT JOIN tags t ON p.tid = t.id WHERE sid IN (:signid);',
      { signid: signIds }
    );

    const stats = statsQuery[0];
    const products = statsQuery[1];
    const tags = statsQuery[2];

    // 分配数值到每篇文章
    _.each(postList, row => {
      // 基础统计数据
      _.each(stats, row2 => {
        if (row.id === row2.id) {
          row.read = row2.num;
          row.sale = row2.sale;
          row.eosvalue = row2.eosvalue;
          row.ups = row2.ups;
          row.ontvalue = row2.ontvalue;
          row.likes = row2.likes;
        }
      });
      // 如果有标签的话，其标签数据
      _.each(tags, row4 => {
        if (row.id === row4.sid) {
          row.tags.push({ id: row4.tid, name: row4.name, type: row4.type });
        }
      });
    });

    // 如果是包括产品的话，其产品数据
    if (products.length) {
      _.each(postList, row => {
        _.each(products, row3 => {
          if (row.id === row3.sign_id) {
            if (row3.symbol === 'EOS') {
              row.eosprice = row3.price;
              row.eosdecimals = row3.decimals;
            } else if (row3.symbol === 'ONT') {
              row.ontprice = row3.price;
              row.ontdecimals = row3.decimals;
            }
          }
        });
      });
    }

    return postList;
  }

  // 删除文章
  async delete(id, userid) {
    try {
      const row = {
        status: 1,
      };

      const options = {
        where: {
          id,
          uid: userid, // 只能自己的文章
        },
      };

      // todo，待验证，修改不改变内容，影响行数应该为0
      const result = await this.app.mysql.update('posts', row, options);

      this.service.cacheAsync.delete(id);

      return result.affectedRows === 1;
    } catch (err) {
      this.logger.error('PostService::delete error: %j', err);
    }
    return false;
  }

  async transferOwner(uid, signid, current_uid) {
    const post = await this.app.mysql.get('posts', { id: signid });
    if (!post) {
      return 2;
    }

    if (post.uid !== current_uid) {
      return 3;
    }

    const user = await this.service.account.binding.get2({ id: uid });
    // const user = await this.app.mysql.get('users', { id: uid });
    if (!user) {
      return 4;
    }

    if (!user.accept) {
      return 5;
    }
    // 记录转让文章常用候选列表
    await this.service.history.put('post', uid);

    // github文章需要单独处理
    if (post.hash.substring(0, 2) === 'Gh') {
      const githubTransfer = await this.service.github.transferGithub(signid, uid, 'md', 'source');
      if (githubTransfer !== 0) {
        return githubTransfer;
      }
    }

    const conn = await this.app.mysql.beginTransaction();
    try {
      await conn.update('posts', {
        username: user.username,
        author: user.username,
        uid,
        platform: user.platform,
      }, { where: { id: post.id } });

      await conn.insert('post_transfer_log', {
        postid: signid,
        fromuid: current_uid,
        touid: uid,
        type: 'post',
        create_time: moment().format('YYYY-MM-DD HH:mm:ss'),
      });

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      this.ctx.logger.error(err);
      return 6;
    }

    return 0;
  }

  async uploadImage(filename, fileLocation) {
    const ctx = this.ctx;

    let result = null;
    try {
      result = await ctx.oss.put(filename, fileLocation);
      await fs.unlinkSync(fileLocation);
    } catch (err) {
      this.app.logger.error('PostService:: uploadImage error: %j', err);
      return 2;
    }

    if (!result) {
      return 3;
    }

    this.app.logger.info('PostService:: uploadImage success: ' + filename);
    return 0;
  }

  /**
   * @deprecated
   * @param {object} data the data to be uploaded to IPFS
   * @return {string} the IPFS hash
   */
  async ipfsUpload(data) {
    let add = null;
    try {
      add = await this.service.ipfs.add(data);
    } catch (err) {
      this.logger.error('PostService:: ipfsUpload Error', err);
      return null;
    }
    return add; // add[0].hash
  }

  async ipfsCatch(hash) {
    let data = null;
    try {
      data = await this.service.ipfs.cat(hash);
    } catch (err) {
      this.logger.error('PostService:: ipfsCatch Error', err.message);
      return null;
    }
    return data;
  }

  async stats() {
    let userCount = await this.app.redis.hget('user:stat', 'count');
    if (userCount === null) {
      userCount = (await this.app.mysql.query('SELECT COUNT(1) as count FROM users;'))[0].count;
      await this.app.redis.hset('user:stat', 'count', userCount);
    }

    let postCount = await this.app.redis.hget('post:stat', 'count');
    if (postCount === null) {
      postCount = (await this.app.mysql.query('SELECT COUNT(1) as count FROM posts WHERE status = 0;'))[0].count;
      await this.app.redis.hset('post:stat', 'count', postCount);
    }

    let userPoints = await this.app.redis.hget('user:stat', 'point');
    if (userPoints === null) {
      userPoints = (await this.app.mysql.query('SELECT SUM(amount) as amount FROM ,assets;_points;'))[0].amount;
      await this.app.redis.hset('user:stat', 'point', userPoints);
    }

    return {
      users: Number(userCount),
      articles: Number(postCount),
      points: Number(userPoints),
    };
  }

  // 持币阅读
  async addMineTokens(current_uid, id, tokens) {
    const post = await this.get(id);
    if (!post) {
      return -1;
    }

    if (post.uid !== current_uid) {
      return -2;
    }

    const conn = await this.app.mysql.beginTransaction();
    try {
      await conn.query('DELETE FROM post_minetokens WHERE sign_id = ?;', [ id ]);
      let require = 0;
      for (const token of tokens) {
        if (token.amount > 0) {
          require = 1;
          await conn.insert('post_minetokens', {
            sign_id: id,
            token_id: token.tokenId,
            amount: token.amount,
            create_time: moment().format('YYYY-MM-DD HH:mm:ss'),
          });
        }
      }

      await conn.update('posts',
        {
          require_holdtokens: require,
        },
        {
          where: {
            id,
          },
        });

      await conn.commit();

      // if (require) {
      //   await this.app.redis.multi()
      //     .zrem('post:hot:filter:1', id)
      //     .zadd('post:hot:filter:2', post.hot_score, id)
      //     .exec();
      // } else {
      //   await this.app.redis.multi()
      //     .zrem('post:hot:filter:2', id)
      //     .zadd('post:hot:filter:1', post.hot_score, id)
      //     .exec();
      // }

      return 0;
    } catch (e) {
      await conn.rollback();
      this.ctx.logger.error(e);
      return -3;
    }
  }

  // 添加持币编辑
  async addEditMineTokens(current_uid, id, tokens) {
    const post = await this.get(id);
    if (!post) {
      return -1;
    }

    if (post.uid !== current_uid) {
      return -2;
    }

    const conn = await this.app.mysql.beginTransaction();
    try {
      await conn.query('DELETE FROM edit_minetokens WHERE sign_id = ?;', [ id ]);
      let require = 0;
      for (const token of tokens) {
        if (token.amount > 0) {
          require = 1;
          await conn.insert('edit_minetokens', {
            sign_id: id,
            token_id: token.tokenId,
            amount: token.amount,
            create_time: moment().format('YYYY-MM-DD HH:mm:ss'),
          });
        }
      }

      await conn.update('posts',
        {
          editor_require_holdtokens: require,
        },
        {
          where: {
            id,
          },
        });

      await conn.commit();

      return 0;
    } catch (e) {
      await conn.rollback();
      this.ctx.logger.error(e);
      return -3;
    }
  }

  // 获取阅读文章需要持有的tokens
  async getMineTokens(signId) {
    const tokens = await this.app.mysql.query('SELECT t.id, p.amount, t.name, t.symbol, t.decimals, t.logo FROM post_minetokens p INNER JOIN minetokens t ON p.token_id = t.id WHERE p.sign_id = ?;',
      [ signId ]);
    return tokens;
  }

  // 获取编辑文章需要持有的tokens
  async getEditMineTokens(signId) {
    const tokens = await this.app.mysql.query('SELECT t.id, p.amount, t.name, t.symbol, t.decimals, t.logo FROM edit_minetokens p INNER JOIN minetokens t ON p.token_id = t.id WHERE p.sign_id = ?;',
      [ signId ]);
    return tokens;
  }

  // 获取用户持币情况
  // id：文章的Id
  async getHoldMineTokens(signId, userId) {
    let tokens = [];
    const readTokens = await this.getMineTokens(signId);
    if (readTokens !== null) {
      tokens = readTokens;
    }
    const editTokens = await this.getEditMineTokens(signId);

    // 吧持币编辑的的数据去重后加到一起
    for (let i = 0; i < editTokens.length; i++) {
      if (tokens.findIndex(mineToken => mineToken.id === editTokens[i].id) === -1) {
        tokens.push(editTokens[i]);
      }
    }

    const myTokens = [];

    if (tokens && tokens.length > 0) {
      for (const token of tokens) {
        const amount = await this.service.token.mineToken.balanceOf(userId, token.id);
        token.amount = amount;
        myTokens.push(token);
      }
    }
    return myTokens;
  }

  // 判断持币阅读
  async isHoldMineTokens(signId, userId) {
    const tokens = await this.getMineTokens(signId);
    if (tokens === null || tokens.length === 0) {
      return true;
    }

    if (tokens && tokens.length > 0) {
      for (const token of tokens) {
        const amount = await this.service.token.mineToken.balanceOf(userId, token.id);
        if (amount < token.amount) {
          return false;
        }
      }
    }
    return true;
  }
  // 添加文章付费阅读
  async addArticlePay(userId, signId, price, tokenId) {
    const category = 0;
    const post = await this.get(signId);
    if (!post) return -1;
    if (post.uid !== userId) return -2;
    // 0代表cny
    let symbol = 'CNY';
    let decimals = 4;
    if (tokenId !== 0) {
      const token = await this.service.token.mineToken.get(tokenId);
      if (!token) return -4;
      symbol = token.symbol;
      decimals = token.decimals;
    }
    const conn = await this.app.mysql.beginTransaction();
    try {
      await conn.query('DELETE FROM product_prices WHERE sign_id = ? AND category = ?;', [ signId, category ]);
      // 默认CNY定价
      await conn.insert('product_prices', {
        sign_id: signId,
        title: post.title,
        sku: signId,
        stock_quantity: 0,
        token_id: tokenId,
        platform: 'cny',
        symbol,
        price,
        decimals,
        status: 1,
        category,
      });
      await conn.update('posts',
        { require_buy: 1 },
        { where: { id: signId } }
      );
      await conn.commit();
      return 0;
    } catch (e) {
      await conn.rollback();
      this.ctx.logger.error(e);
      return -3;
    }
  }

  // todo：拆分出来
  async addPrices(userId, signId, price, category = 0) {
    const post = await this.get(signId);
    if (!post) {
      return -1;
    }

    if (post.uid !== userId) {
      return -2;
    }

    const conn = await this.app.mysql.beginTransaction();
    try {
      await conn.query('DELETE FROM product_prices WHERE sign_id = ? AND category = ?;', [ signId, category ]);
      // 默认CNY定价
      await conn.insert('product_prices', {
        sign_id: signId,
        title: post.title,
        sku: signId,
        stock_quantity: 0,
        platform: 'cny',
        symbol: 'CNY',
        price,
        decimals: 4,
        status: 1,
        category,
      });
      if (category !== 1) {
        this.logger.info('service post addPrices start...');
        const updateResult = await conn.update('posts',
          {
            require_buy: 1,
          },
          {
            where: {
              id: signId,
            },
          }
        );
        this.logger.info('service post addPrices result:', updateResult);
      }

      await conn.commit();

      /* await this.app.redis.multi()
        .zrem('post:hot:filter:1', id)
        .zadd('post:hot:filter:4', post.hot_score, id)
        .exec(); */

      return 0;
    } catch (e) {
      await conn.rollback();
      this.ctx.logger.error(e);
      return -3;
    }
  }

  async delPrices(userId, signId, category = 0) {
    const post = await this.get(signId);
    if (!post) {
      return -1;
    }

    if (post.uid !== userId) {
      return -2;
    }

    const conn = await this.app.mysql.beginTransaction();
    try {
      await conn.query('DELETE FROM product_prices WHERE sign_id = ? AND category = ?;', [ signId, category ]);

      if (category !== 1) {
        this.logger.info('service post delPrices start...');
        const updateResult = await conn.update('posts',
          {
            require_buy: 0,
          },
          {
            where: {
              id: signId,
            },
          });
        this.logger.info('service post addPrices result:', updateResult);
      }

      await conn.commit();

      // await this.app.redis.multi()
      //   .zrem('post:hot:filter:4', id)
      //   .zadd('post:hot:filter:1', post.hot_score, id)
      //   .exec();

      return 0;
    } catch (e) {
      await conn.rollback();
      this.ctx.logger.error(e);
      return -3;
    }
  }

  async addBookmark(userId, postId) {
    const { existence } = (await this.app.mysql.query('SELECT EXISTS (SELECT 1 FROM posts WHERE id = ?) existence;', [ postId ]))[0];
    if (!existence) {
      return null;
    }

    const { affectedRows } = await this.app.mysql.query('INSERT IGNORE post_bookmarks VALUES(?, ?, ?);', [ userId, postId, moment().format('YYYY-MM-DD HH:mm:ss') ]);

    return affectedRows === 1;
  }

  async removeBookmark(userId, postId) {
    const { existence } = (await this.app.mysql.query('SELECT EXISTS (SELECT 1 FROM posts WHERE id = ?) existence;', [ postId ]))[0];
    if (!existence) {
      return null;
    }

    const { affectedRows } = await this.app.mysql.delete('post_bookmarks', {
      uid: userId,
      pid: postId,
    });

    return affectedRows === 1;
  }

  async uploadArticleToIpfs({
    title, description, displayName, data, isEncrypt = false, uid }) {
    let markdown = data.content;
    let metadata = JSON.stringify(data);
    description = await this.wash(description);
    // 如果需要加密，则替换渲染HTML文章内容
    if (isEncrypt) {
      markdown = `${description}
很抱歉这是一篇付费/持币阅读文章，内容已被加密。
若需要阅读更多内容，请返回到 Matataki 查看原文`;
      metadata = JSON.stringify(this.service.cryptography.encrypt(metadata));
    }

    // 渲染html并上传
    const renderedHtml = articleToHtml({
      title,
      author: {
        nickname: displayName,
        uid: uid || this.ctx.user.id,
        username: displayName,
      },
      description,
      datePublished: new Date(),
      markdown,
    });
    // 上传的data是json对象， 需要字符串化
    const uuid = v4();
    const metadataKey = `mttk_post_${uuid}`;
    const htmlKey = `mttk_post_rendered_${uuid}`;
    const metadataHash = await this.service.ipfs.add(metadata, metadataKey);
    const htmlHash = await this.service.ipfs.add(renderedHtml, htmlKey);
    return { metadataHash, htmlHash };
  }
  async uploadArticleToGithub({
    postId, title, /* description, *//* displayName, */ data, uid, publish_or_edit = 'publish', tags = [] }) {
    // let markdown = data.content;
    const metadata = data.content;
    // description = await this.wash(description);
    // 如果需要加密，则替换渲染HTML文章内容
    //     if (isEncrypt) {
    //       markdown = `${description}
    // 很抱歉这是一篇付费/持币阅读文章，内容已被加密。
    // 若需要阅读更多内容，请返回到 Matataki 查看原文`;
    //       metadata = JSON.stringify(this.service.cryptography.encrypt(metadata));
    //     }
    // 渲染html并上传
    // const renderedHtml = articleToHtml({
    //   title,
    //   author: {
    //     nickname: displayName,
    //     uid: uid || this.ctx.user.id,
    //     username: displayName,
    //   },
    //   description,
    //   datePublished: new Date(),
    //   markdown: data.content,
    // });
    // 上传的data是json对象， 需要字符串化
    // const [ metadataHash, htmlHash ] = await Promise.all([
    //   this.service.github.writeToGithub(uid, metadata, title, 'json', 'salt1'),
    //   this.service.github.writeToGithub(uid, renderedHtml, title, 'html', 'salt2'),
    // ]);
    // return { metadataHash, htmlHash };
    let metadataHash;
    let htmlHash;

    if (publish_or_edit === 'edit') {
      htmlHash = metadataHash = await this.service.github.updateGithub(postId, metadata, title, 'md', 'source', tags);
      //  await this.service.github.updateGithub(postId, renderedHtml, 'html');
    } else {
      htmlHash = metadataHash = await this.service.github.writeToGithub(uid, metadata, title, 'md', 'salt1', 'source', tags);
      //  await this.service.github.writeToGithub(uid, renderedHtml, title, 'html', 'salt2');
    }

    return { metadataHash, htmlHash };
  }


}

module.exports = PostService;
