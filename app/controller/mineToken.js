'use strict';

const Controller = require('../core/base_controller');

class MineTokenController extends Controller {
  async create() {
    const ctx = this.ctx;

    const { name, symbol, decimals } = this.ctx.request.body;
    const result = await ctx.service.token.mineToken.create(ctx.user.id, name, symbol, 4); // decimals默认4位
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
    // amount 客户端*精度，10^decimals
    const { amount } = this.ctx.request.body;
    const result = await ctx.service.token.mineToken.mint(ctx.user.id, ctx.user.id, amount, this.clientIP);
    ctx.body = result === 0 ? ctx.msg.success : ctx.msg.failure;
  }

  async transfer() {
    const ctx = this.ctx;
    const { tokenId, to, amount } = this.ctx.request.body;
    // amount 客户端*精度，10^decimals
    const result = await ctx.service.token.mineToken.transferFrom(tokenId, ctx.user.id, to, amount, this.clientIP);
    ctx.body = result ? ctx.msg.success : ctx.msg.failure;
  }

}

module.exports = MineTokenController;
