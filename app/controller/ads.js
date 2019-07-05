'use strict';

const Controller = require('../core/base_controller');
const moment = require('moment');
var _ = require('lodash');

class AdsController extends Controller {

  async statistics() {
    try {
      const count = await this.app.mysql.query("select count(*) as count from orange_actions where act_name='incomelog' and amount < 0;");

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

  async submit() {
    const ctx = this.ctx;
    const { title = '', url = '', link = '', content = ''} = ctx.request.body;

    try {
      const result = await this.eosClient.getTableRows({
        json: 'true',
        code: this.ctx.app.config.eos.orange_contract,
        scope: this.ctx.app.config.eos.orange_contract,
        table: 'global',
        limit: 1
      });

      let global = result.rows[0];
      const user = ctx.user;

      // console.log("submit ad", global, user.username, title, url, link);

      if (global && global.last_buyer == user.username) {

        const now = moment().format('YYYY-MM-DD HH:mm:ss');
        await this.app.mysql.query(
          'INSERT INTO ads(id, uid, title, url, link, content, create_time, update_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE uid = ?, title=?, url=?, link=?, content=?, update_time = ?;',
          [1, user.id, title, url, link, content, now, now,
            user.id, title, url, link, content, now]
        );

        ctx.body = ctx.msg.success;
      } else {
        ctx.logger.error("submit ad error, wrong user");
        this.response(500, "submit ad error, wrong user");
      }
    } catch (err) {
      ctx.logger.error("submit ad error", err);
      this.response(500, "submit ad error");
    }
  }

  async ad() {
    try {
      const ads = await this.app.mysql.query(
        'select a.title, a.url, a.link, a.content, b.username, b.id as uid  from ads a left join users b on a.uid = b.id where a.id = 1'
      );

      this.ctx.body = this.ctx.msg.success;
      this.ctx.body.data = ads[0];
    } catch (err) {
      this.ctx.logger.error("get ad error", err);
      this.response(500, "get ad error");
    }
  }

}

module.exports = AdsController;
