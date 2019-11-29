'use strict';

const Controller = require('../core/base_controller');

class TagController extends Controller {

  async tags() {
    const { type } = this.ctx.query;
    if (type === 'post') {
      this.ctx.body = this.ctx.msg.success;
      this.ctx.body.data = this.ctx.app.cache.post.tags;
      this.ctx.logger.debug('tag cache');
      return;
    }

    let sqlcode = '';
    if (type) {
      sqlcode = 'SELECT id, name, type FROM tags WHERE type = ?;';
    } else {
      sqlcode = 'SELECT id, name, type FROM tags;';
    }
    try {
      const tags = await this.app.mysql.query(
        sqlcode,
        [ type ]
      );

      this.ctx.body = this.ctx.msg.success;
      this.ctx.body.data = tags;
    } catch (err) {
      this.ctx.logger.error('TagController:: get tags error', err);
      this.ctx.body = this.ctx.msg.failure;
    }
  }

}

module.exports = TagController;
