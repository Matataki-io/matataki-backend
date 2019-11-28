const { Subscription } = require('egg');

class PostCache extends Subscription {

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

    this.ctx.app.cache.post = {
      stats: await this.service.post.stats(),
      tags: await this.app.mysql.query(`SELECT id, name, type FROM tags WHERE type = 'post';`),
      recommend: await this.service.post.recommendPosts(),
      hot: await this.service.post.scoreRank()
    };
  }

}

module.exports = PostCache;
