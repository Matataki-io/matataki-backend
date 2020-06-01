
'use strict';
const Service = require('egg').Service;

class TagService extends Service {
  async postList(page = 1, pagesize = 20, tagId, orderBy = '', order = 'desc') {
    // 获取文章列表, 分为商品文章和普通文章
    // 再分为带作者和不带作者的情况.
    if (![ 'create_time', 'hot_score' ].includes(orderBy.toLowerCase())) return -1;
    if (![ 'desc', 'asc' ].includes(order.toLowerCase())) return -1;
    const wheresql = 'WHERE a.channel_id = 1 AND a.\`status\` = 0 AND t.tid = :tid ';
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
      ${wheresql} 
      ${orderSql}
      LIMIT :start, :end;
      SELECT COUNT(*) AS count FROM post_tag t LEFT JOIN posts a ON t.sid = a.id
      ${wheresql};`;
    const queryResult = await this.app.mysql.query(
      sql,
      { tid: tagId, start: (page - 1) * pagesize, end: 1 * pagesize }
    );

    const posts = queryResult[0];
    const amount = queryResult[1];

    if (posts.length === 0) {
      return { count: 0, list: [] };
    }
    const postids = [];
    const len = posts.length;
    const id2posts = {};
    for (let i = 0; i < len; i++) {
      const row = posts[i];
      row.tags = [];
      id2posts[row.id] = row;
      postids.push(row.id);
    }
    const tagSql = 'SELECT p.sid, p.tid, t.name, t.type FROM post_tag p LEFT JOIN tags t ON p.tid = t.id WHERE sid IN (:signid);';

    const tagResult = await this.app.mysql.query(
      tagSql,
      { signid: postids }
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
}
module.exports = TagService;
