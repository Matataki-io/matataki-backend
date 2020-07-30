'use strict';
const { Controller } = require('egg');

class DirectTradeController extends Controller {
  async create() {
    const { ctx } = this;
    const { price } = ctx.request.body;
    const uid = ctx.user.id;
    const token = await this.service.token.mineToken.getByUserId(uid);
    if (!token) {
      ctx.body = ctx.msg.tokenNotExist;
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
    const { amount, enabled } = ctx.request.body;
    const uid = ctx.user.id;
    const token = await this.service.token.mineToken.getByUserId(uid);
    if (!token) {
      ctx.body = ctx.msg.tokenNotExist;
      return;
    }
    let result = 0;
    if (amount) {
      result = await this.service.directTrade.updateMarketAmount({
        uid,
        tokenId: token.id,
        amount: parseInt(amount),
      });
    } else {
      result = await this.service.directTrade.update({
        uid,
        tokenId: token.id,
        enabled,
      });
    }
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
      ctx.body = ctx.msg.tokenNotExist;
      return;
    }
    const market = await this.service.directTrade.getByTokenId(token.id);
    if (!market) {
      ctx.body = ctx.msg.marketNotExist;
      return;
    }
    const _market = await this.service.directTrade.get(market.id);
    ctx.body = {
      ...ctx.msg.success,
      data: _market,
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
    let id = ctx.params.id;
    const { type = 'tokenId' } = ctx.query;
    if (type === 'tokenId') {
      const market = await this.service.directTrade.getByTokenId(id);
      if (!market) {
        ctx.body = ctx.msg.marketNotExist;
        return;
      }
      id = market.id;
    }
    const market = await this.service.directTrade.get(id);
    ctx.body = {
      ...ctx.msg.success,
      data: market,
    };
  }
}

module.exports = DirectTradeController;
