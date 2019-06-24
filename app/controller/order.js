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
      referrer } = this.ctx.request.body;

    if (!signId) {
      console.log('create order', signId);
      return this.response(401, 'signId required');
    }
    console.log('create order');
    if (!contract) {
      return this.response(401, 'contract required');
    }
    if (!symbol) {
      return this.response(401, 'symbol required');
    }
    if (!amount) {
      return this.response(401, 'amount required');
    }
    if (num === 0) {
      return this.response(401, 'num required');
    }
    if (!platform) {
      return this.response(401, 'platform required');
    }
    if (!(platform === 'eos' || platform === 'ont')) {
      return this.response(401, 'platform not support');
    }

    let referreruid = parseInt(referrer);

    if (isNaN(referreruid)) {
      referreruid = 0;
    }

    this.ctx.body = await this.service.shop.order.create(signId, contract, symbol, amount, platform, num, referrer);
  }

}

module.exports = OrderController;
