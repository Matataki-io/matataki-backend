'use strict';
const Service = require('egg').Service;
const moment = require('moment');
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

  async addReference({ uid, signId, url, title, summary, cover }, conn) {
    /* if (!await this.service.references.hasReferencePermission(uid, signId)) {
      return -1;
    } */

    let ref_sign_id = 0;
    if (this.service.references.checkInnerPost(url)) {
      ref_sign_id = this.service.references.extractSignId(url);
    }

    try {
      const sql = ` INSERT INTO post_references (sign_id, ref_sign_id, url, title, summary, number, create_time, status, cover) 
                  SELECT :sign_id, :ref_sign_id, :url, :title, :summary, (SELECT IFNULL(MAX(number), 0) + 1 FROM post_references WHERE sign_id=:sign_id), :time, 0, :cover
                  ON DUPLICATE KEY UPDATE title = :title, summary = :summary, create_time = :time, status = 0, cover = :cover; `;
      await conn.query(sql, {
        sign_id: signId, ref_sign_id, url, title, summary, time: moment().format('YYYY-MM-DD HH:mm:ss'), cover,
      });

      return 0;
    } catch (e) {
      this.ctx.logger.error(e);
      return -1;
    }
  }
  async create(data, refs) {
    const conn = await this.app.mysql.beginTransaction();
    try {
      const result = await conn.insert('posts', {
        ...data,
        channel_id: SHARE_CHANNEL_ID,
      });
      if (result.affectedRows === 1) {
        // 创建统计表栏目
        await conn.query(
          'INSERT INTO post_read_count(post_id, real_read_count, sale_count, support_count, eos_value_count, ont_value_count)'
          + ' VALUES(?, 0, 0, 0 ,0, 0);',
          [ result.insertId ]
        );
      }
      const signId = result.insertId;
      const uid = this.ctx.user.id;
      for (const ref of refs) {
        const { url, title, summary, cover } = ref;
        const result = await this.addReference({
          uid, signId, url, title, summary, cover,
        }, conn);
        if (result < 0) {
          conn.rollback();
          return -1;
        }
      }
      conn.commit();
      return signId;
    } catch (err) {
      await conn.rollback();
      this.logger.error('ShareService::create error: %j', err);
      return -1;
    }
  }
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
  async timeRank(page = 1, pagesize = 20) {
    const wheresql = 'WHERE a.\`status\` = 0 AND a.channel_id = 3 ';
    const sql = `SELECT a.id, a.uid, a.author, a.title, a.hash, a.create_time, a.cover, a.require_holdtokens, a.require_buy, 
      b.nickname, b.avatar, 
      c.real_read_count AS \`read\`, c.likes 
      FROM posts a
      LEFT JOIN users b ON a.uid = b.id 
      LEFT JOIN post_read_count c ON a.id = c.post_id 
      ${wheresql} 
      ORDER BY a.time_down ASC, a.id DESC LIMIT :start, :end;
      SELECT COUNT(*) AS count FROM posts a
      ${wheresql};`;
    const queryResult = await this.app.mysql.query(
      sql,
      { start: (page - 1) * pagesize, end: 1 * pagesize }
    );
    const posts = queryResult[0];
    const count = queryResult[1][0].count;
    const postids = [];
    const len = posts.length;
    const id2posts = {};
    for (let i = 0; i < len; i++) {
      const row = posts[i];
      posts[i].refs = [];
      posts[i].beRefs = [];
      id2posts[row.id] = row;
      postids.push(row.id);
    }
    const refResult = await this.getRef(postids);
    const refs = refResult[0],
      beRefs = refResult[1],
      refsLen = refs.length,
      beRefsLen = beRefs.length;
    // 引用
    for (let i = 0; i < refsLen; i++) {
      const id = refs[i].sign_id;
      id2posts[id].refs.push(refs[i]);
    }
    // 被引用
    for (let i = 0; i < beRefsLen; i++) {
      const id = beRefs[i].ref_sign_id;
      id2posts[id].beRefs.push(beRefs[i]);
    }
    return {
      count,
      list: posts,
    };
  }
  async hotRank(page = 1, pagesize = 20) {
    const wheresql = 'WHERE a.\`status\` = 0 AND a.channel_id = 3 ';
    const sql = `SELECT a.id, a.uid, a.author, a.title, a.hash, a.create_time, a.cover, a.require_holdtokens, a.require_buy, 
      b.nickname, b.avatar, 
      c.real_read_count AS \`read\`, c.likes 
      FROM posts a
      LEFT JOIN users b ON a.uid = b.id 
      LEFT JOIN post_read_count c ON a.id = c.post_id 
      ${wheresql}
      ORDER BY hot_score DESC, id DESC LIMIT :start, :end;
      SELECT COUNT(*) AS count FROM posts a
      ${wheresql};`;
    const queryResult = await this.app.mysql.query(
      sql,
      { start: (page - 1) * pagesize, end: 1 * pagesize }
    );
    const posts = queryResult[0];
    const count = queryResult[1][0].count;
    const postids = [];
    const len = posts.length;
    const id2posts = {};
    for (let i = 0; i < len; i++) {
      const row = posts[i];
      posts[i].refs = [];
      posts[i].beRefs = [];
      id2posts[row.id] = row;
      postids.push(row.id);
    }
    const refResult = await this.getRef(postids);
    const refs = refResult[0],
      beRefs = refResult[1],
      refsLen = refs.length,
      beRefsLen = beRefs.length;
    // 引用
    for (let i = 0; i < refsLen; i++) {
      const id = refs[i].sign_id;
      id2posts[id].refs.push(refs[i]);
    }
    // 被引用
    for (let i = 0; i < beRefsLen; i++) {
      const id = beRefs[i].ref_sign_id;
      id2posts[id].beRefs.push(beRefs[i]);
    }
    return {
      count,
      list: posts,
    };
  }
  async getRef(postids) {
    const refResult = await this.app.mysql.query(
      `SELECT t1.sign_id, t1.ref_sign_id, t1.url, t1.title, t1.summary, t1.cover, t1.create_time, t1.number,
      t2.channel_id,
      t3.username, t3.email, t3.nickname, t3.platform, t3.avatar
      FROM post_references t1
      LEFT JOIN posts t2
      ON t1.ref_sign_id = t2.id
      LEFT JOIN users t3
      ON t2.uid = t3.id
      WHERE sign_id IN ( :postids ) AND t1.status = 0;
      SELECT t1.sign_id, t1.ref_sign_id, t1.url, t1.title, t1.summary, t1.cover, t1.create_time, t1.number,
      t2.channel_id,
      t3.username, t3.email, t3.nickname, t3.platform, t3.avatar
      FROM post_references t1
      LEFT JOIN posts t2
      ON t1.sign_id = t2.id
      LEFT JOIN users t3
      ON t2.uid = t3.id
      WHERE ref_sign_id IN ( :postids ) AND t1.status = 0;`,
      { postids }
    );
    return refResult;
  }
  async timeRankSlow(page = 1, pagesize = 20, author = null, filter = 0) {

    // 获取文章列表, 分为商品文章和普通文章
    // 再分为带作者和不带作者的情况.

    const totalsql = 'SELECT COUNT(*) AS count FROM posts ';
    const listsql = 'SELECT id FROM posts ';
    let wheresql = `WHERE status = 0 AND channel_id = ${SHARE_CHANNEL_ID} `;

    if (author) wheresql += 'AND uid = :author ';

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

      wheresql += 'AND (' + conditions.join(' OR ') + ') ';
    }

    const ordersql = 'ORDER BY time_down ASC, id DESC LIMIT :start, :end';
    const sqlcode = totalsql + wheresql + ';' + listsql + wheresql + ordersql + ';';
    const queryResult = await this.app.mysql.query(
      sqlcode,
      { author, start: (page - 1) * pagesize, end: 1 * pagesize }
    );

    const amount = queryResult[0];
    const posts = queryResult[1];

    // TBD: 有无文章接口都要改成一致！
    if (posts.length === 0) {
      // return [];
      return { count: 0, list: [] };
    }

    const postids = [];
    for (let i = 0; i < posts.length; i++) {
      postids.push(posts[i].id);
    }

    const postList = await this.getPostList(postids, {});

    return { count: amount[0].count, list: postList };
  }
  // 推荐分数排序(默认方法)(new format)(count-list格式)
  async scoreRankSlow(page = 1, pagesize = 20, author = null, filter = 0) {

    // 获取文章列表, 分为商品文章和普通文章
    // 再分为带作者和不带作者的情况.

    const totalsql = 'SELECT COUNT(*) AS count FROM posts ';
    const listsql = 'SELECT id FROM posts ';
    let wheresql = `WHERE status = 0 AND channel_id = ${SHARE_CHANNEL_ID} `;

    if (author) {
      wheresql += 'AND uid = :author ';
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

      wheresql += 'AND (' + conditions.join(' OR ') + ') ';
    }

    const ordersql = 'ORDER BY hot_score DESC, id DESC LIMIT :start, :end';
    const sqlcode = totalsql + wheresql + ';' + listsql + wheresql + ordersql + ';';
    const queryResult = await this.app.mysql.query(
      sqlcode,
      { author, start: (page - 1) * pagesize, end: 1 * pagesize }
    );

    const amount = queryResult[0];
    const posts = queryResult[1];

    if (posts.length === 0) {
      return { count: 0, list: [] };
    }

    const postids = [];
    for (let i = 0; i < posts.length; i++) {
      postids.push(posts[i].id);
    }

    let postList = await this.getPostList(postids, { hot_score: true });

    // 由赞赏次数进行排序
    // 还没加上时间降序
    postList = postList.sort((a, b) => {
      if (a.hot_score === b.hot_score) {
        return a.id > b.id ? -1 : 1;
      }
      return a.hot_score > b.hot_score ? -1 : 1;
    });

    // 必须删掉hot_score， 不随接口返回
    for (let i = 0; i < postList.length; i++) {
      delete postList[i].hot_score;
    }

    return { count: amount[0].count, list: postList };
  }
  async getPostList(signids) {

    let postList = [];

    if (signids.length === 0) {
      return postList;
    }
    // 查询文章和作者的信息, 结果是按照时间排序
    // 如果上层也需要按照时间排序的, 则无需再排, 需要其他排序方式则需再排
    const sql = `
      SELECT a.id, a.uid, a.author, a.title, a.hash, a.create_time, a.cover, a.require_holdtokens, a.require_buy, b.nickname, b.avatar FROM posts a
      LEFT JOIN users b ON a.uid = b.id WHERE a.id IN (?) AND a.status = 0 ORDER BY id DESC;`;
    postList = await this.app.mysql.query(
      sql,
      [ signids ]
    );

    // 有关阅读次数,赞赏金额,赞赏次数的统计
    // 还有产品信息， 标签
    const stats = await this.app.mysql.query(
      `SELECT post_id AS id, real_read_count AS num, sale_count AS sale, support_count AS ups, eos_value_count AS eosvalue, ont_value_count AS ontvalue, likes
       FROM post_read_count WHERE post_id IN (:signid);`,
      { signid: signids }
    );

    for (let i = 0; i < postList.length; i++) {
      const row = postList[i];
      for (let j = 0; j < stats.length; j++) {
        const row2 = stats[j];
        if (row.id === row2.id) {
          row.read = row2.num;
          row.likes = row2.likes;
        }
      }
    }

    return postList;
  }

}

module.exports = ShareService;
