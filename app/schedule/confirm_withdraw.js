const Subscription = require('egg').Subscription;
const EOS = require('eosjs');
const ONT = require('ontology-ts-sdk');
const moment = require('moment');
const axios = require("axios");

class ConfirmWithdraw extends Subscription {

  constructor(ctx) {
    super(ctx);
    this.eosClient = EOS({
      broadcast: true,
      sign: true,
      chainId: ctx.app.config.eos.chainId,
      keyProvider: [ctx.app.config.eos.keyProvider],
      httpEndpoint: ctx.app.config.eos.httpEndpoint,
    });
  }

  static get schedule() {
    return {
      interval: '5s',
      type: 'all',
    };
  }

  async subscribe() {
    const results = await this.app.mysql.query(`select * from withdraws where status=1 limit 10`);

    if (results.length === 0)
      return

    for (let i = 0; i < results.length; i++) {
      const withdraw = results[i];
      if ("eos" === withdraw.platform) {
        await this.eos_trx_confirm(withdraw);
      } else if ("ont" === withdraw.platform) {
        await this.ont_trx_confirm(withdraw);
      }
    }
  }

  async eos_trx_confirm(withdraw) {
    try {
      let trx = await this.eosClient.getTransaction(withdraw.trx);

      let block_num = trx.block_num;
      let last_irreversible_block = trx.last_irreversible_block;

      if (last_irreversible_block >= block_num && trx.trx.receipt.status == "executed") {
        console.log("交易已确认", last_irreversible_block - block_num, trx.trx.receipt.status)
        await this.do_confirm(withdraw);
      } else {
         console.log("交易未确认", last_irreversible_block - block_num, trx.trx.receipt.status)
      }
    } catch (err) {
      this.ctx.logger.error(err);
    }

  }

  async ont_trx_confirm(withdraw) {

  }

  async do_confirm(withdraw) {
    try {
      let result = await this.app.mysql.update("withdraws", {
        status: 2,
      }, { where: { id: withdraw.id } });

      console.log("do_confirm transfer success");

    } catch (err) {
      this.ctx.logger.error(err);
    }

  }


}

module.exports = ConfirmWithdraw;