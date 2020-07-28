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
}

module.exports = DirectTradeController;
