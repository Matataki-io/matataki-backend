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
      console.log("create order", signId);
      return this.response(401, "signId required")
    }
    console.log("create order");
    if (!contract) {
      return this.response(401, "contract required")
    }
    if (!symbol) {
      return this.response(401, "symbol required")
    }
    if (!amount) {
      return this.response(401, "amount required")
    }
    if (num === 0) {
      return this.response(401, "num required")
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
        'INSERT INTO orders (uid, signid, contract, symbol, num, amount, referreruid, platform, status, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ? ,?, ?)',
        [this.ctx.user.id, signId, contract, symbol, num, amount_copy, referreruid, platform, 0, now]
      );

      const updateSuccess = result.affectedRows === 1;

      const oid = result.insertId;

      if (updateSuccess) {
        this.ctx.body = this.ctx.msg.success;
        this.ctx.body.data = oid;
      } else {
        this.response(500, "create order error")
      }
    } catch (err) {
      console.log(err);
      this.ctx.logger.error('create order error', err, this.ctx.user.id, signId, symbol, amount);
      this.response(500, "create order error");
    }
  }


}

module.exports = OrderController;
