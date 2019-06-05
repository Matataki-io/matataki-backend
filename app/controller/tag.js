'use strict';

const Controller = require('../core/base_controller');
const moment = require('moment');
var _ = require('lodash');

class TagController extends Controller {

  async tags() {
    try {
      const tags = await this.app.mysql.query('select id, name from tags');

      this.response(200, "success");
      this.ctx.body.data = tags;
    } catch (err) {
      this.ctx.logger.error('get tags error', err);
      this.response(500, "get tags error");
    }
  }

}

module.exports = TagController;
