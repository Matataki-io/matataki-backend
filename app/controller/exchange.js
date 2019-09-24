'use strict';

const Controller = require('../core/base_controller');

class ExchangeController extends Controller {
  async create() {
    const ctx = this.ctx;

    const { tokenId } = ctx.request.body;
    const result = await ctx.service.token.exchange.create(tokenId);

    if (result === -1) {
      ctx.body = ctx.msg.tokenNotExist;
    } else if (result === -2) {
      ctx.body = ctx.msg.exchangeAlreadyCreated;
    } else if (result === 0) {
      ctx.body = ctx.msg.failure;
    } else {
      ctx.body = ctx.msg.success;
    }
  }

  async get() {
    const ctx = this.ctx;

    const { tokenId } = this.ctx.query;
    const result = await ctx.service.token.exchange.getExchange(tokenId);
    if (!result) {
      ctx.body = ctx.msg.failure;
      return;
    }
    ctx.body = ctx.msg.success;
    ctx.body.data = result;
  }

  // todo : 测试代码
  async addLiquidity() {
    const ctx = this.ctx;
    const orderId = parseInt(ctx.request.body.orderId);
    const result = await ctx.service.token.exchange.addLiquidity(orderId);
    ctx.body = ctx.msg.success;
  }

  async removeLiquidity() {
    const ctx = this.ctx;
    const { tokenId, amount, min_cny, min_tokens, deadline } = ctx.request.body;
    const result = await ctx.service.token.exchange.removeLiquidity(ctx.user.id, tokenId, amount, min_cny, min_tokens, deadline);
    ctx.body = ctx.msg.success;
  }

  async cnyToTokenInput() {
    const ctx = this.ctx;
    const orderId = parseInt(ctx.request.body.orderId);
    const result = await ctx.service.token.exchange.cnyToTokenInput(orderId);
    ctx.body = ctx.msg.success;
  }

  async tokenToCnyInput() {
    const ctx = this.ctx;
    const { tokenId, tokens_sold, min_cny, deadline, recipient } = ctx.request.body;
    const result = await ctx.service.token.exchange.tokenToCnyInput(ctx.user.id, tokenId, tokens_sold, min_cny, deadline, recipient, this.clientIP);
    ctx.body = ctx.msg.success;
  }

}

module.exports = ExchangeController;
