'use strict';

const Controller = require('../core/base_controller');
const moment = require('moment');

class OrderController extends Controller {

  constructor(ctx) {
    super(ctx);
  }

  async create() {

    const { signId,
      contract,
      symbol,
      amount,
      platform,
      num = 0,
      comment,
      referrer } = this.ctx.request.body;

    if (!signId) {
      console.log('create order', signId);
      return this.response(403, 'signId required');
    }
    console.log('create order');
    if (!contract) {
      return this.response(403, 'contract required');
    }
    if (!symbol) {
      return this.response(403, 'symbol required');
    }
    if (!amount) {
      return this.response(403, 'amount required');
    }
    if (num === 0) {
      return this.response(403, 'num required');
    }
    if (!platform) {
      return this.response(403, 'platform required');
    }
    if (!(platform === 'eos' || platform === 'ont')) {
      return this.response(403, 'platform not support');
    }

    let referreruid = parseInt(referrer);

    if (isNaN(referreruid)) {
      referreruid = 0;
    }

    const result = await this.service.shop.order.create(signId, contract, symbol, amount, platform, num, referreruid);
    // todo：处理评论内容
    this.ctx.body = result;
  }

}

module.exports = OrderController;
