'use strict';

const { Controller } = require('egg');
const jwt = require('jwt-simple');

class BaseController extends Controller {
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
        throw new Error("access_token has expired");
      }

      if (username && username !== decoded.iss) {
        throw new Error("wrong user");
      }

      return decoded.iss;
    } catch (err) {
      console.log("access token decode err", err);
      throw new Error("invaid access_token");
    }
  }

  get_current_user() {
    console.log("get_current_user.. ");
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



}
module.exports = BaseController;