'use strict';
const { Controller } = require('egg');

class DirectTradeController extends Controller {
  async create() {
    const { ctx } = this;
    const { price } = ctx.request.body;
    const uid = ctx.user.id;
    const token = await this.service.token.mineToken.getByUserId(uid);
    if (!token) {
      ctx.body = ctx.msg.failure;
      return;
    }
    let result = 0;
    result = await this.service.directTrade.createMarket({
      uid,
      tokenId: token.id,
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
  async update() {
    const { ctx } = this;
    const { amount } = ctx.request.body;
    const uid = ctx.user.id;
    const token = await this.service.token.mineToken.getByUserId(uid);
    if (!token) {
      ctx.body = ctx.msg.failure;
      return;
    }
    const result = await this.service.directTrade.updateMarketAmount({
      uid,
      tokenId: token.id,
      amount: parseInt(amount),
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
    const market = await this.service.directTrade.getByTokenId(token.id);
    if (!market) {
      ctx.body = ctx.msg.failure;
      return;
    }
    ctx.body = {
      ...ctx.msg.success,
      data: market,
    };
  }
  async index() {
    const { ctx } = this;
    const { pi = 1, pz = 10, order = '', sort = '' } = ctx.query;
    const list = await this.service.directTrade.list(parseInt(pi), parseInt(pz), order || '', sort || '');
    ctx.body = {
      ...ctx.msg.success,
      data: list,
    };
  }
  async show() {
    const { ctx } = this;
    const id = ctx.params.id;
    const market = await this.service.directTrade.get(id);
    ctx.body = {
      ...ctx.msg.success,
      data: market,
    };
  }
}

module.exports = DirectTradeController;
