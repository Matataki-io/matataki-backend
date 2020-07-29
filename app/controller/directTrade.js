'use strict';
const { Controller } = require('egg');

class DirectTradeController extends Controller {
  async createMarket() {
    const { ctx } = this;
    const { tokenId, amount, price } = ctx.request.body;
    const uid = ctx.user.id;
    const result = await this.service.directTrade.createMarket({
      uid,
      tokenId,
      amount: parseInt(amount),
      price: parseInt(price),
    });
    if (result < 0) {
      ctx.body = {
        ...ctx.msg.failure,
        data: result,
      };
    } else {
      ctx.body = {
        ...ctx.msg.success,
        data: result,
      };
    }
  }
  async getMarket() {
    const { ctx } = this;
    const uid = ctx.user.id;
    const token = await this.service.token.mineToken.getByUserId(uid);
    if (!token) {
      ctx.body = ctx.msg.failure;
      return;
    }
    const market = await this.service.directTrade.getMarket(token.id);
    if (!market) {
      ctx.body = ctx.msg.failure;
      return;
    }
    ctx.body = {
      ...ctx.msg.success,
      data: market,
    };
  }
}

module.exports = DirectTradeController;
