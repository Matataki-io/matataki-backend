'use strict';

const Controller = require('../core/base_controller');

class TokenController extends Controller {
  async tokenList() {
    const ctx = this.ctx;
    const { pagesize = 10, page = 1 } = this.ctx.query;
    // 用户id
    const user_id = ctx.user.id;
    // token list
    const result = await ctx.service.exchange.getTokenListByUser(user_id, parseInt(page), parseInt(pagesize));
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }

  async userList() {
    const ctx = this.ctx;
    const { pagesize = 10, page = 1 } = this.ctx.query;
    // user id
    const user_id = ctx.user.id;
    // 根据user_id查找用户发行的token
    const token = await ctx.service.token.mineToken.getByUserId(user_id);
    const token_id = token.id;
    // token list
    const result = await ctx.service.exchange.getUserListByToken(token_id, parseInt(page), parseInt(pagesize));
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }

  async tokenDetail() {
    const ctx = this.ctx;
    // user id
    const user_id = ctx.user.id;
    // 根据user_id查找用户发行的token
    const token = await ctx.service.token.mineToken.getByUserId(user_id);
    const exchange = await ctx.service.token.exchange.detail(token.id);
    ctx.body = {
      ...ctx.msg.success,
      data:
      {
        token,
        exchange,
      },
    };
  }
}

module.exports = TokenController;
