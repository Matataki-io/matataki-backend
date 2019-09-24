'use strict';

const Controller = require('../core/base_controller');

class MineTokenController extends Controller {
  async create() {
    const ctx = this.ctx;

    await ctx.service.token.exchange.addLiquidity(5);
    return;

    const { name, symbol, decimals } = this.ctx.request.body;
    const result = await ctx.service.token.mineToken.create(ctx.user.id, name, symbol, decimals);
    if (result === -1) {
      ctx.body = ctx.msg.tokenAlreadyCreated;
    } else if (result === -2) {
      ctx.body = ctx.msg.tokenSymbolDuplicated;
    } else if (result === 0) {
      ctx.body = ctx.msg.failure;
    } else {
      ctx.body = ctx.msg.success;
    }
  }

  async mint() {
    const ctx = this.ctx;
    const { amount } = this.ctx.request.body;
    const result = await ctx.service.token.mineToken.mint(ctx.user.id, ctx.user.id, amount, this.clientIP);
    ctx.body = result === 0 ? ctx.msg.success : ctx.msg.failure;
  }

  async transfer() {
    const ctx = this.ctx;
    const { tokenId, to, amount } = this.ctx.request.body;
    const result = await ctx.service.token.mineToken.transferFrom(tokenId, ctx.user.id, to, amount, this.clientIP);
    ctx.body = result ? ctx.msg.success : ctx.msg.failure;
  }

}

module.exports = MineTokenController;
