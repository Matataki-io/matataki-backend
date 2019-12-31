'use strict';
const Service = require('egg').Service;
const SHARE_CHANNEL_ID = 3;

class ShareService extends Service {

  constructor(ctx, app) {
    super(ctx, app);
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

  async create(data) {
    try {
      const result = await this.app.mysql.insert('posts', {
        ...data,
        channel_id: SHARE_CHANNEL_ID,
      });
      if (result.affectedRows === 1) {
        // 创建统计表栏目
        await this.app.mysql.query(
          'INSERT INTO post_read_count(post_id, real_read_count, sale_count, support_count, eos_value_count, ont_value_count)'
          + ' VALUES(?, 0, 0, 0 ,0, 0);',
          [ result.insertId ]
        );
        return result.insertId;
      }
    } catch (err) {
      this.logger.error('ShareService::create error: %j', err);
    }
    return 0;
  }
  async getByHash(hash, requireProfile) {
    const posts = await this.app.mysql.query(
      'SELECT id, username, author, title, short_content, hash, status, onchain_status, create_time, fission_factor, '
      + 'cover, is_original, channel_id, fission_rate, referral_rate, uid, is_recommend, category_id, comment_pay_point, require_holdtokens, require_buy FROM posts WHERE hash = ? AND channel_id = ?;',
      [ hash, SHARE_CHANNEL_ID ]
    );

    /* const rows = await this.app.mysql.select('posts', {
      where: {
        hash,
        channel_id: SHARE_CHANNEL_ID,
      },
      columns: ['author', 'title'],
    }); */
    let post = posts[0];
    if (!post) {
      return null;
    }

    if (requireProfile) {
      post = await this.getPostProfile(post);
    }
    post.tokens = await this.getMineTokens(post.id);
    post.username = this.service.user.maskEmailAddress(post.username);
    return post;
  }

  // 根据id获取文章-简单版
  async get(id) {
    const posts = await this.app.mysql.select('posts', {
      where: { id, channel_id: SHARE_CHANNEL_ID },
      columns: [ 'id', 'hash', 'uid', 'title', 'short_content', 'status', 'create_time', 'comment_pay_point', 'channel_id', 'require_buy' ], // todo：需要再增加
    });
    if (posts && posts.length > 0) {
      return posts[0];
    }
    return null;
  }

  // 根据id获取文章
  /*
  查询太多影响性能，修改计划：
    把公共属性和持币阅读权限放到一起返回
    其他和当前登录相关的属性放入新接口返回
  */
  async getById(id) {
    const posts = await this.app.mysql.query(
      'SELECT id, username, author, title, short_content, hash, status, onchain_status, create_time, fission_factor, '
      + 'cover, is_original, channel_id, fission_rate, referral_rate, uid, is_recommend, category_id, comment_pay_point, require_holdtokens, require_buy, cc_license FROM posts WHERE id = ?;',
      [ id ]
    );

    if (posts === null || posts.length === 0) {
      return null;
    }

    let post = posts[0];
    post = await this.getPostProfile(post);
    post.tokens = await this.getMineTokens(id);
    post.username = this.service.user.maskEmailAddress(post.username);
    return post;
  }

}

module.exports = ShareService;
