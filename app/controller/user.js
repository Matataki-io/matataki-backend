'use strict';

const Controller = require('../core/base_controller');

class UserController extends Controller {

  async user() {
    const ctx = this.ctx;

    const username = ctx.params.username;

    // 2.获取某账号关注数
    const follows = await this.app.mysql.query(
      'select count(*) as follows from follows where username = ? and status=1',
      [username]
    );

    // 3.获取某账号粉丝数
    const fans = await this.app.mysql.query(
      'select count(*) as fans from follows where followed = ? and status=1',
      [username]
    );

    var is_follow = false;

    const current_user = this.get_current_user();

    if (current_user) {
      const result = await this.app.mysql.get('follows', { username: current_user, followed: username, status: 1 });
      if (result) {
        is_follow = true;
      }
    }

    const result = {
      username,
      follows: follows[0].follows,
      fans: fans[0].fans,
      is_follow: is_follow
    };

    ctx.logger.info('debug info', result);

    ctx.body = result;
    ctx.status = 200;
  }


  async income() {
    const ctx = this.ctx;

    const username = ctx.params.username;

    // 2.获取某账号关注数
    const follows = await this.app.mysql.query(
      'select count(*) as follows from follows where username = ? and status=1',
      [username]
    );

    // 3.获取某账号粉丝数
    const fans = await this.app.mysql.query(
      'select count(*) as fans from follows where followed = ? and status=1',
      [username]
    );

    var is_follow = false;

    const current_user = this.get_current_user();

    if (current_user) {
      const result = await this.app.mysql.get('follows', { username: current_user, followed: username, status: 1 });
      if (result) {
        is_follow = true;
      }
    }

    const result = {
      username,
      follows: follows[0].follows,
      fans: fans[0].fans,
      is_follow: is_follow
    };

    ctx.logger.info('debug info', result);

    ctx.body = result;
    ctx.status = 200;
  }




}

module.exports = UserController;
