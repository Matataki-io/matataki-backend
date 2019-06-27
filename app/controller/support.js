'use strict';

const Controller = require('../core/base_controller');
const _ = require('lodash');
const consts = require('../service/consts');

class SupportController extends Controller {

  constructor(ctx) {
    super(ctx);
  }

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

    let referreruid = parseInt(referrer);

    if (isNaN(referreruid)) {
      referreruid = 0;
    }

    if (referrer) {
      if (referreruid === this.ctx.user.id) {
        return ctx.msg.referrNoYourself;
      }
      const refUser = await this.service.user.find(referreruid);
      if (refUser === null) {
        return ctx.msg.referrerNotExist;
      }
    }

    // 保存赞赏
    const supportId = await this.service.support.create(this.ctx.user.id, signId, contract, symbol, amount, referreruid, platform);

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

  // 待删除，转移到comment.js
  async comments() {

    const ctx = this.ctx;

    const { pagesize = 20, page = 1, signid } = this.ctx.query;

    // singid缺少,此种情况用户正常使用时候不会出现
    if (!signid) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    const shares = await this.service.support.commentList(parseInt(signid), parseInt(page), parseInt(pagesize));

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
    const userid = ctx.user.id;

    const { page = 1, pagesize = 20 } = ctx.query;

    const products = await this.service.support.getUserProducts(page, pagesize, userid);

    if (products === null) {
      ctx.body = ctx.msg.failure;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = products;
  }

}

module.exports = SupportController;
