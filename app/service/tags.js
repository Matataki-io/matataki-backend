
'use strict';
const Service = require('egg').Service;

class TagService extends Service {
  async postList(page = 1, pagesize = 20, tagId, orderBy = '', order = 'desc') {
    // 获取文章列表, 分为商品文章和普通文章
    // 再分为带作者和不带作者的情况.
    if (![ 'create_time', 'hot_score' ].includes(orderBy.toLowerCase())) return -1;
    if (![ 'desc', 'asc' ].includes(order.toLowerCase())) return -1;
    const whereSql = 'WHERE a.channel_id = 1 AND a.\`status\` = 0 AND t.tid = :tid ';
    const orderSql = `ORDER BY a.${orderBy} ${order}, a.id DESC `;

    const sql = `SELECT a.id, a.uid, a.author, a.title, a.status, a.hash, a.create_time, a.cover, a.require_holdtokens, a.require_buy, a.short_content,
      b.nickname, b.avatar,
      c.real_read_count AS \`read\`, c.likes,
      t5.platform as pay_platform, t5.symbol as pay_symbol, t5.price as pay_price, t5.decimals as pay_decimals, t5.stock_quantity as pay_stock_quantity,
      t7.id as token_id, t6.amount as token_amount, t7.name as token_name, t7.symbol as token_symbol, t7.decimals  as token_decimals
      FROM post_tag t
      LEFT JOIN posts a ON t.sid = a.id
      LEFT JOIN users b ON a.uid = b.id
      LEFT JOIN post_read_count c ON a.id = c.post_id
      LEFT JOIN product_prices t5 ON a.id = t5.sign_id
      LEFT JOIN post_minetokens t6 ON a.id = t6.sign_id
      LEFT JOIN minetokens t7 ON t7.id = t6.token_id
      ${whereSql}
      ${orderSql}
      LIMIT :start, :end;
      SELECT COUNT(*) AS count FROM post_tag t LEFT JOIN posts a ON t.sid = a.id
      ${whereSql};`;
    const queryResult = await this.app.mysql.query(
      sql,
      { tid: tagId, start: (page - 1) * pagesize, end: 1 * pagesize }
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
    return { count: amount[0].count, list };
  }
  async getTagList(k, offset, orderBy, order) {
    if (![ 'create_time', 'num' ].includes(orderBy.toLowerCase())) return -1;
    if (![ 'desc', 'asc' ].includes(order.toLowerCase())) return -1;
    try {
      const whereSql = ' WHERE p.`status` = 0 AND p.channel_id = 1';
      const orderSql = ' ORDER BY ' + orderBy + ' ' + order;
      const queryResult = await this.app.mysql.query(`
        SELECT COUNT(DISTINCT sid) AS num, t.id, t.name, t.create_time, t.type FROM post_tag pt
        LEFT JOIN tags t ON pt.tid = t.id
        LEFT JOIN posts p ON p.id = pt.sid
        ${whereSql}
        GROUP BY tid
        ${orderSql}
        LIMIT ?,?;

        SELECT COUNT(tid) as count
        FROM (
        SELECT tid FROM post_tag pt
        LEFT JOIN posts p ON p.id = pt.sid
        ${whereSql}
        GROUP BY tid
        ) T;`, [ offset, k ]);
      const list = queryResult[0];
      const count = queryResult[1];
      return { count: count[0].count, list };
    } catch (error) {
      return {
        count: 0,
        list: [],
      };
    }
  }
  async hottestTags({ pageSize, day }) {
    this.logger.info('hottestTags', pageSize, day);

    try {
      const sql = `SELECT pt.tid AS id, t.\`name\`, COUNT(t.\`name\`) AS count
      FROM post_tag pt LEFT JOIN posts p ON pt.sid = p.id LEFT JOIN tags t ON pt.tid = t.id
      WHERE p.title != '' AND pt.sid != 1 AND pt.sid != 0
      AND DATE_SUB(CURDATE(), INTERVAL ? DAY) <= DATE(p.create_time)
      GROUP BY t.\`name\`, pt.tid
      ORDER BY \`count\` DESC LIMIT 0, ?;`;

      const results = await this.app.mysql.query(sql, [ day, pageSize ]);

      return results;
    } catch (error) {
      this.logger.error('hottestTags error', error.toString());
      return [];
    }
  }
}
module.exports = TagService;
