'use strict';

const Controller = require('../core/base_controller');
const moment = require('moment');

class SupportController extends Controller {

  constructor(ctx) {
    super(ctx);
  }

  async support() {

    const { signId,
      contract,
      symbol,
      amount,
      platform,
      referrer } = this.ctx.request.body;

    if (!signId) {
      return this.response(401, "signId required")
    }
    if (!contract) {
      return this.response(401, "contract required")
    }
    if (!symbol) {
      return this.response(401, "symbol required")
    }
    if (!amount) {
      return this.response(401, "amount required")
    }
    if (!platform) {
      return this.response(401, "platform required")
    }
    if (!("eos" === platform || "ont" === platform)) {
      return this.response(401, "platform not support")
    }

    let referreruid = parseInt(referrer);

    if (isNaN(referreruid)) {
      referreruid = 0;
    }

    if (referrer) {
      if (referreruid === this.ctx.user.id) {
        return this.response(401, "referrer can't be yourself");
      }
      const ref = await this.get_referrer(referreruid);
      if (ref === null) {
        return this.response(401, 'referrer does not exist');
      }
    }

    const now = moment().format('YYYY-MM-DD HH:mm:ss');

    try {
      let amount_copy = amount;

      if (platform === 'ont') {
        amount_copy = amount * 10000;
      }

      const result = await this.app.mysql.query(
        'INSERT INTO supports (uid, signid, contract, symbol, amount, referreruid, platform, status, create_time) VALUES (?, ?, ?, ?, ?, ?, ? ,?, ?)',
        [ this.ctx.user.id, signId, contract, symbol, amount_copy, referreruid, platform, 0, now ]
      );

      const updateSuccess = result.affectedRows === 1;

      if (updateSuccess) {
        this.response(201, "success")
      } else {
        this.response(500, "support error")
      }
    } catch (err) {
      this.ctx.logger.error('support error', err, this.ctx.user.id, signId, symbol, amount);
      this.response(500, "support error, you have supported this post before");
    }
  }

  async comments() {

    const ctx = this.ctx;

    const { pagesize = 20, page = 1, signid } = this.ctx.query;

    // singid缺少,此种情况用户正常使用时候不会出现
    if (!signid) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    const shares = await this.service.support.commentList(signid, page, pagesize);

    if (shares === null) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = shares;
  }

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
