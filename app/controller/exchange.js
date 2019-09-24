'use strict';

const Controller = require('egg').Controller;

class ExchangeController extends Controller {
  async create() {
    const ctx = this.ctx;

    const { tokenId } = this.ctx.request.body;
    const result = await ctx.service.token.exchange.create(tokenId);
    ctx.body = result > 0 ? ctx.msg.success : ctx.msg.failure;
  }

  async get() {
    const ctx = this.ctx;

    const { tokenId } = this.ctx.query;
    const result = await ctx.service.token.exchange.getExchange(tokenId);
    ctx.body = result > 0 ? ctx.msg.success : ctx.msg.failure;
  }


}

module.exports = ExchangeController;
