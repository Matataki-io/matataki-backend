'use strict';

const Controller = require('../core/base_controller');
const moment = require('moment');
var _ = require('lodash');

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

    let email = "";
    let nickname = "";
    let avatar = "";
    let introduction = '';
    const user = await this.app.mysql.get('users', { username: username });
    if (user) {
      avatar = user.avatar || "";
      email = user.email || "";
      nickname = user.nickname || "";
      introduction = user.introduction || '';
    }

    const result = {
      username,
      email,
      nickname,
      avatar,
      introduction,
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

    for (let i = 0; i < results.length; i++) {
      if (this.app.post_cache[results[i].sign_id] !== undefined) {
        results[i].title = this.app.post_cache[results[i].sign_id].title;
      } else {
        const post = await this.app.mysql.get('posts', { id: results[i].sign_id });
        if (post) {
          results[i].title = post.title;
          this.app.post_cache[results[i].sign_id] = post;
        }
      }
    }

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

  async tokens() {

    let user ; 

    try {
      user = await this.get_user();
    } catch (err) {
      this.ctx.status = 401;
      this.ctx.body = err.message;
      return;
    }

    // 1. 历史总创作收入 (sign income)
    const result = await this.app.mysql.query(
      'select id, contract, symbol, amount, platform from assets where uid = ? ',
      [user.id]
    );

    this.ctx.body = result;
    this.ctx.status = 200;
  }

  async setNickname() {

    const ctx = this.ctx;

    const { nickname = '' } = ctx.request.body;

    let nickname_regex = /^[\u4e00-\u9fa5_a-zA-Z0-9_]{1,12}$/;

    if (!nickname_regex.test(nickname)) {
      ctx.status = 400;
      ctx.body = 'bad request: 昵称长度不超得过12位，且不可包含字符';
      return;
    }

    const current_user = this.get_current_user();

    try {
      this.checkAuth(current_user);
    } catch (err) {
      ctx.status = 401;
      ctx.body = err.message;
      return;
    }


    try {
      const user = await this.app.mysql.get('users', { nickname: nickname });

      if (user) {
        ctx.body = {
          msg: 'duplicate nickname',
        };
        ctx.status = 500;
        return;
      }

      const now = moment().format('YYYY-MM-DD HH:mm:ss');

      const result = await this.app.mysql.query(
        'INSERT INTO users (id ,username, nickname, create_time)'
        + ' VALUES (null, ?, ?, ?) ON DUPLICATE KEY UPDATE nickname = ?',
        [ current_user, nickname, now, nickname ]
      );

      const updateSuccess = result.affectedRows >= 1;

      if (updateSuccess) {
        ctx.status = 201;
      } else {
        ctx.status = 500;
      }
    } catch (err) {
      console.log(err);
      ctx.body = {
        msg: 'setNickname error: ' + err.sqlMessage,
      };
      ctx.status = 500;
    }
  }


  async setEmail() {

    const ctx = this.ctx;

    const { email = '' } = ctx.request.body;

    const current_user = this.get_current_user();

    try {
      this.checkAuth(current_user);
    } catch (err) {
      ctx.status = 401;
      ctx.body = err.message;
      return;
    }


    try {
      const user = await this.app.mysql.get('users', { email: email });

      if (user) {
        ctx.body = {
          msg: 'duplicate Email',
        };
        ctx.status = 500;
        return;
      }

      const now = moment().format('YYYY-MM-DD HH:mm:ss');

      const result = await this.app.mysql.query(
        'INSERT INTO users (id ,username, email, create_time)'
        + ' VALUES (null, ?, ?, ?) ON DUPLICATE KEY UPDATE email = ?',
        [ current_user, email, now, email ]
      );

      const updateSuccess = result.affectedRows >= 1;

      if (updateSuccess) {
        ctx.status = 201;
      } else {
        ctx.status = 500;
      }
    } catch (err) {
      console.log(err);
      ctx.body = {
        msg: 'setEmail error: ' + err.sqlMessage,
      };
      ctx.status = 500;
    }
  }


  async setAvatar() {

    const ctx = this.ctx;

    const { avatar = '' } = ctx.request.body;

    const current_user = this.get_current_user();

    try {
      this.checkAuth(current_user);
    } catch (err) {
      ctx.status = 401;
      ctx.body = err.message;
      return;
    }

    try {
      const now = moment().format('YYYY-MM-DD HH:mm:ss');

      const result = await this.app.mysql.query(
        'INSERT INTO users (username, avatar, create_time) VALUES ( ?, ?, ?) ON DUPLICATE KEY UPDATE avatar = ?',
        [current_user, avatar, now, avatar]
      );

      const updateSuccess = result.affectedRows >= 1;

      if (updateSuccess) {
        ctx.status = 201;
      } else {
        ctx.status = 500;
      }
    } catch (err) {
      ctx.logger.error(err.sqlMessage);
      ctx.body = {
        msg: 'setAvatar error: ' + err.sqlMessage,
      };
      ctx.status = 500;
    }
  }

  async setIntroduction() {
    const ctx = this.ctx;
    const { introduction = '' } = ctx.request.body;

    const updateResult = await this.service.user.setUserIntroduction(introduction, ctx.user.username);

    if (updateResult === 4) {
      ctx.body = ctx.msg.userIntroductionInvalid;
      return;
    }

    if (updateResult === false) {
      ctx.body = ctx.msg.failure;
      return;
    }

    ctx.body = ctx.msg.success;
  }

  async getUserDetails() {
    const ctx = this.ctx;

    const details = await this.service.user.getUserDetails(ctx.user.username);
    if (details === null) {
      ctx.body = ctx.msg.userNotExist;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = details;
  }
}

module.exports = UserController;
