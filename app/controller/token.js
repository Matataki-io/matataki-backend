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

  async minetokenDetail() {
    const ctx = this.ctx;
    // user id
    const user_id = ctx.user.id;
    // 根据user_id查找用户发行的token
    const token = await ctx.service.token.mineToken.getByUserId(user_id);
    let exchange = null;
    if (token) {
      const balance = await ctx.service.token.mineToken.balanceOf(user_id, token.id);
      token.balance = balance;
      exchange = await ctx.service.token.exchange.detail(token.id);
    }
    ctx.body = {
      ...ctx.msg.success,
      data:
      {
        token,
        exchange,
      },
    };
  }
  async allToken() {
    const ctx = this.ctx;
    const { pagesize = 10, page = 1, search = '' } = this.ctx.query;
    const result = await ctx.service.exchange.getAllToken(parseInt(page), parseInt(pagesize), search);
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }
  // token流水详情
  async userTokenFlow() {
    const { ctx } = this;
    const { pagesize = 10, page = 1 } = ctx.query;
    // user id
    const user_id = ctx.user.id;
    // 根据user_id查找用户发行的token
    const token = await ctx.service.token.mineToken.getByUserId(user_id);
    if (token === null) {
      ctx.body = {
        ...ctx.msg.success,
        data: {},
      };
      return;
    }
    const token_id = token.id;
    const result = await ctx.service.exchange.getFlowDetail(token_id, parseInt(page), parseInt(pagesize));
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }
  // 用户视角下token流水
  async tokenFlow() {
    const { ctx } = this;
    const { tokenId, pagesize = 10, page = 1 } = ctx.query;
    console.log(ctx.user);
    // user id
    const user_id = ctx.user.id;
    const result = await ctx.service.exchange.getUserFlowDetail(user_id, tokenId, parseInt(page), parseInt(pagesize));
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }

  // 查看token的日志
  async getTokenLogs() {
    const { ctx } = this;
    const { tokenId, pagesize = 10, page = 1 } = ctx.query;
    const result = await ctx.service.token.mineToken.getTokenLogs(tokenId, parseInt(page), parseInt(pagesize));
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }

  // 查看用户的token日志
  async getUserLogs() {
    const { ctx } = this;
    const { pagesize = 10, page = 1 } = ctx.query;
    const result = await ctx.service.token.mineToken.getUserLogs(ctx.user.id, parseInt(page), parseInt(pagesize));
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }

}

module.exports = TokenController;
