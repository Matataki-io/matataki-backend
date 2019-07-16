'use strict';

const Controller = require('../core/base_controller');

class TagController extends Controller {

  async tags() {
    try {
      const tags = await this.app.mysql.query("select id, name from tags where type = 'post'");

      this.ctx.body = this.ctx.msg.success;
      this.ctx.body.data = tags;
    } catch (err) {
      this.ctx.logger.error('get tags error', err);
      this.ctx.body = this.ctx.msg.failure;
    }
  }

}

module.exports = TagController;
