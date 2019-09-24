'use strict';

const Controller = require('../core/base_controller');

class TokenController extends Controller {
  async tokenList() {
    const ctx = this.ctx;
    // 用户id
    const user_id = ctx.user.id;
    // token list
    const result = ctx.service.exchange.getTokenListByUser(user_id);
    // TODO
    ctx.body = result;
  }

  async userList() {
    const ctx = this.ctx;
    // user id
    const user_id = ctx.user.id;
    // 根据user_id查找用户发行的token
    const token_id = '';
    // token list
    const result = ctx.service.exchange.getUserListByToken(token_id);
    // TODO
    ctx.body = result;
  }

  async tokenDetail() {
    const ctx = this.ctx;
    // user id
    const user_id = ctx.user.id;
    // 根据user_id查找用户发行的token
    const token_id = '';
  }
}

module.exports = TokenController;
