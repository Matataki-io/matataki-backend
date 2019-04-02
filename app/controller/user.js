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


  async assets() {
    const ctx = this.ctx;

    const { page = 1, user } = this.ctx.query;
    const pagesize = 20;

    if (!user) {
      ctx.status = 500;
      ctx.body = "user required";
      return;
    }

    // 1. 历史总创作收入 (sign income)
    const totalSignIncome = await this.app.mysql.query(
      'select sum(amount) as totalSignIncome from actions where type = ? and author= ?',
      ["bill sign income", user]
    );

    // 2. 历史总打赏收入 (share income)
    const totalShareIncome = await this.app.mysql.query(
      'select sum(amount) as totalShareIncome from actions where type = ? and author= ?',
      ["bill share income", user]
    );

    // 3. 历史总打赏支出 (support expenses)
    const totalShareExpenses = await this.app.mysql.query(
      'select sum(amount) as totalShareExpenses from actions where type = ? and author= ?',
      ["bill support expenses", user]
    );

    let whereOption = {
      "act_name": "bill",
      "type": ["bill share income", "bill sign income", "bill support expenses"],
      "author": user
    }

    const results = await this.app.mysql.select('actions', {
      where: whereOption,
      columns: ['author', 'amount', 'sign_id', 'create_time', "type"],
      orders: [['create_time', 'desc']],
      limit: pagesize,
      offset: (page - 1) * pagesize,
    });

    let resp = {
      user: user,
      totalSignIncome: totalSignIncome[0].totalSignIncome || 0,
      totalShareIncome: totalShareIncome[0].totalShareIncome || 0,
      totalShareExpenses: totalShareExpenses[0].totalShareExpenses || 0,
      history: results
    }

    ctx.body = resp;
    ctx.status = 200;
  }


}

module.exports = UserController;
