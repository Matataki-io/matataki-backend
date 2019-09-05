'use strict';

const Controller = require('../core/base_controller');
const _ = require('lodash');
const consts = require('../service/consts');

class OrderController extends Controller {

  async create() {
    const { ctx } = this;
    const { signId, contract, symbol, amount, platform, num = 0, comment, referrer } = ctx.request.body;

    if (!signId) {
      this.logger.info('create order', signId);
      console.log('create order', signId);
      return this.response(403, 'signId required');
    }
    this.logger.info('create order');
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
      // 不能是自己
      if (referreruid === this.ctx.user.id) {
        this.ctx.body = ctx.msg.referrerNoYourself;
        return;
      }

      // 判断是否可以当推荐人
      const flag = await this.service.mechanism.payContext.canBeReferrer(referreruid, signId);
      if (!flag) {
        this.ctx.body = ctx.msg.referrerNotExist;
        return;
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

  // 保存交易hash
  async saveTxhash() {
    const { ctx } = this;
    const { orderId, txhash } = this.ctx.request.body;
    const result = await this.service.shop.order.saveTxhash(orderId, ctx.user.id, txhash);

    ctx.body = ctx.msg.success;
  }

  async myProducts() {

    const ctx = this.ctx;
    const userid = ctx.user.id;

    const { page = 1, pagesize = 20 } = ctx.query;

    if (isNaN(parseInt(page)) || isNaN(parseInt(pagesize))) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    const products = await this.service.shop.order.getUserProducts(page, pagesize, userid);

    if (products === null) {
      ctx.body = ctx.msg.failure;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = products;
  }

}

module.exports = OrderController;
