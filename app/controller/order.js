'use strict';

const Controller = require('../core/base_controller');
const _ = require('lodash');
const consts = require('../service/consts');

class OrderController extends Controller {

  async create() {
    const { ctx } = this;
    const { signId, contract, symbol, amount, platform, num = 0, comment, referrer } = ctx.request.body;

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
    // 判断推荐人
    if (referreruid > 0) {
      if (referreruid === this.ctx.user.id) {
        return ctx.msg.referrNoYourself;
      }
      const refUser = await this.service.user.find(referreruid);
      if (refUser === null) {
        return ctx.msg.referrerNotExist;
      }
    }

    // const m = ctx.msg.get(1);
    const orderId = await this.service.shop.order.create(this.ctx.user.id, signId, contract, symbol, amount, platform, num, referreruid);

    // 失败
    if (orderId <= 0) {
      switch (orderId) {
        case -1:
          this.ctx.body = ctx.msg.postCannotBuy;
          break;
        case -2:
          this.ctx.body = ctx.msg.postPriceError;
          break;
        case -3:
          this.ctx.body = ctx.msg.failure;
          break;
        case -99:
          this.ctx.body = ctx.msg.serverError;
          break;
      }
      return;
    }

    // 处理评论内容
    if (comment && _.trim(comment).length > 0 && orderId > 0) {
      await this.service.comment.create(ctx.user.id, ctx.user.username, signId, _.trim(comment), consts.commentTypes.order, orderId);
    }

    const ret = ctx.msg.success;
    ret.data = { orderId };
    this.ctx.body = ret;
  }

  async myProducts() {

    const ctx = this.ctx;
    const userid = ctx.user.id;

    const { page = 1, pagesize = 20 } = ctx.query;

    const products = await this.service.shop.order.getUserProducts(page, pagesize, userid);

    if (products === null) {
      ctx.body = ctx.msg.failure;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = products;
  }

}

module.exports = OrderController;
