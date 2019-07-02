'use strict';

const Controller = require('../core/base_controller');
const moment = require('moment');
var _ = require('lodash');

class AdsController extends Controller {

  async statistics() {
    try {
      const count = await this.app.mysql.query("select count(*) as count from orange_actions where act_name='incomelog' ");

      const users = await this.app.mysql.query("select distinct user from orange_actions where user is not null");

      this.ctx.body = this.ctx.msg.success;
      this.ctx.body.data = {
        play_count: count[0].count,
        user_count: users.length
      };
    } catch (err) {
      this.ctx.logger.error('get statistics error', err);
      this.response(500, "get statistics error");
    }
  }

}

module.exports = AdsController;
