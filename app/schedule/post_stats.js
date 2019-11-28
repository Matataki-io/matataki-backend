const { Subscription } = require('egg');

class PostStatsCache extends Subscription {
  static get schedule() {
      return {
          interval: '1h',
          type: 'all',
          immediate: true
      };
  }

  async subscribe() {
    if (!this.ctx.app.cache)
      this.ctx.app.cache = {}

    const sql = `SELECT COUNT(1) as count FROM users;
      SELECT COUNT(1) as count FROM posts;
      SELECT SUM(amount) as amount FROM assets_points;`;

    const queryResult = await this.app.mysql.query(sql);

    this.ctx.app.cache.postStats = { users: queryResult[0][0].count, articles: queryResult[1][0].count, points: queryResult[2][0].amount };
  }
}

module.exports = PostStatsCache;
