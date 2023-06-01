'use strict';

const Controller = require('../core/base_controller');
const _ = require('lodash');
const consts = require('../service/consts');

class SupportController extends Controller {

  // constructor(ctx) {
  //   super(ctx);
  // }

  async support() {
    const { ctx } = this;
    const { signId, contract, symbol, amount, platform, referrer, comment } = this.ctx.request.body;

    if (!signId) {
      return this.response(403, 'signId required');
    }
    if (!contract) {
      return this.response(403, 'contract required');
    }
    if (!symbol) {
      return this.response(403, 'symbol required');
    }
    if (!amount) {
      return this.response(403, 'amount required');
    }
    if (!platform) {
      return this.response(403, 'platform required');
    }
    if (!(platform === 'eos' || platform === 'ont')) {
      return this.response(403, 'platform not support');
    }

    let referrerUId = parseInt(referrer);

    if (isNaN(referrerUId)) {
      referrerUId = 0;
    }

    if (referrer) {
      // 不能是自己
      if (referrerUId === this.ctx.user.id) {
        this.ctx.body = ctx.msg.referrerNoYourself;
        return;
      }

      // 判断是否可以当推荐人
      const flag = await this.service.mechanism.payContext.canBeReferrer(referrerUId, signId);
      if (!flag) {
        this.ctx.body = ctx.msg.referrerNotExist;
        return;
      }
    }

    // 保存赞赏
    const supportId = await this.service.support.create(this.ctx.user.id, signId, contract, symbol, amount, referrerUId, platform);

    // 失败
    if (supportId <= 0) {
      this.ctx.body = ctx.msg.serverError;
      return;
    }

    // 处理评论内容
    if (comment && _.trim(comment).length > 0 && supportId > 0) {
      await this.service.comment.create(ctx.user.id, ctx.user.username, signId, _.trim(comment), consts.commentTypes.support, supportId);
    }

    const ret = ctx.msg.success;
    ret.data = { supportId };
    this.ctx.body = ret;
  }

  // 保存交易hash
  async saveTxhash() {
    const { ctx } = this;
    const { supportId, txhash } = this.ctx.request.body;
    // const result = await this.service.support.saveTxhash(supportId, ctx.user.id, txhash);
    await this.service.support.saveTxhash(supportId, ctx.user.id, txhash);

    ctx.body = ctx.msg.success;
  }

  // 待删除，转移到comment.js
  async comments() {

    const ctx = this.ctx;

    const { pagesize = 20, page = 1, signid: signId } = this.ctx.query;

    // singId 缺少,此种情况用户正常使用时候不会出现
    if (!signId) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    const shares = await this.service.support.commentList(parseInt(signId), parseInt(page), parseInt(pagesize));

    if (shares === null) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = shares;
  }

  // 待删除，转移到order.js
  async myProducts() {

    const ctx = this.ctx;
    const userId = ctx.user.id;

    const { page = 1, pagesize = 20 } = ctx.query;

    const products = await this.service.support.getUserProducts(page, pagesize, userId);

    if (products === null) {
      ctx.body = ctx.msg.failure;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = products;
  }

}

module.exports = SupportController;
