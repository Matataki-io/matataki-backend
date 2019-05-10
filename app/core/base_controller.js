'use strict';

const { Controller } = require('egg');
const jwt = require('jwt-simple');
const moment = require('moment');
class BaseController extends Controller {

  constructor(ctx) {
    super(ctx);
    if (!this.app.read_cache) {
      this.app.read_cache = {};
    }
    if (!this.app.value_cache) {
      this.app.value_cache = {};
    }
    if (!this.app.ups_cache) {
      this.app.ups_cache = {};
    }
    if (!this.app.post_cache) {
      this.app.post_cache = {};
    }
  }

  get user() {
    return this.ctx.session.user;
  }

  success(data) {
    this.ctx.body = {
      success: true,
      data,
    };
  }

  notFound(msg) {
    msg = msg || 'not found';
    this.ctx.throw(404, msg);
  }

  response(code, msg) {
    this.ctx.status = code;
    this.ctx.body = { msg: msg };
  }

  checkAuth(username) {
    console.log("checkAuth..", username);

    var token = this.ctx.request.header['x-access-token'];
    if (!token) {
      throw new Error("no access_token");
    }

    // 校验 token， 解密， 验证token的可用性 ，检索里面的用户
    try {
      var decoded = jwt.decode(token, this.app.config.jwtTokenSecret);

      if (decoded.exp <= Date.now()) {
        throw new Error("invaid access_token: expired");
      }

      if (username && username !== decoded.iss) {
        throw new Error("invaid access_token: wrong user");
      }

      return decoded.iss;
    } catch (err) {
      console.log("access token decode err", err);
      throw err;
    }
  }

  get_current_user() {
    var token = this.ctx.request.header['x-access-token'];

    if (!token) {
      return null;
    }

    try {
      var decoded = jwt.decode(token, this.app.config.jwtTokenSecret);
      return decoded.iss;
    } catch (err) {
      return null;
    }
  }

  async get_user() {
    const current_user = this.get_current_user();

    try {
      this.checkAuth(current_user);
    } catch (err) {
      throw err;
    }

    let user = await this.app.mysql.get('users', { username: current_user });

    if (!user) {

      let newuser = await this.app.mysql.insert('users', {
        username: current_user,
        create_time: moment().format('YYYY-MM-DD HH:mm:ss')
      });

      user = await this.app.mysql.get('users', { username: current_user });
    }

    return user;
  }

  async get_or_create_referrer(referrer) {
    try {
      let user = await this.app.mysql.get('users', { username: referrer });

      if (!user) {
        let newuser = await this.app.mysql.insert('users', {
          username: referrer,
          create_time: moment().format('YYYY-MM-DD HH:mm:ss')
        });
        user = await this.app.mysql.get('users', { username: referrer });
      }
      return user;
    } catch (err) {
      return null;
    }
  }

  async get_or_create_user(username, platform) {
    try {
      let user = await this.app.mysql.get('users', { username: username });

      if (!user) {
        let newuser = await this.app.mysql.insert('users', {
          username: username,
          platform: platform,
          create_time: moment().format('YYYY-MM-DD HH:mm:ss')
        });
        user = await this.app.mysql.get('users', { username: username });
      }
      return user;
    } catch (err) {
      return null;
    }
  }

}
module.exports = BaseController;