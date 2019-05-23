const Subscription = require('egg').Subscription;
const EOS = require('eosjs');
const ONT = require('ontology-ts-sdk');
const moment = require('moment');
const axios = require("axios");

class ProcessWithdraw extends Subscription {

  constructor(ctx) {
    super(ctx);
    this.eosClient = EOS({
      broadcast: true,
      sign: true,
      chainId: ctx.app.config.eos.chainId,
      keyProvider: [ctx.app.config.eos.withdraw_pri],
      httpEndpoint: ctx.app.config.eos.httpEndpoint,
    });
  }

  static get schedule() {
    return {
      interval: '10s',
      type: 'all',
    };
  }

  async subscribe() {
    // if (this.ctx.app.config.isDebug) return;

    const results = await this.app.mysql.query(`select * from withdraws where status=0 limit 10`);

    if (results.length === 0)
      return

    for (let i = 0; i < results.length; i++) {
      const withdraw = results[i];
      if ("eos" === withdraw.platform) {
        await this.eos_transfer(withdraw);
      } else if ("ont" === withdraw.platform) {
        await this.ont_transfer(withdraw);
      }
    }
  }

  async eos_transfer(withdraw) {
    console.log("ProcessWithdraw EOS", withdraw);

    try {

      let res = await this.eosClient.transaction({
        actions: [{
          account: withdraw.contract,
          name: 'transfer',
          authorization: [{ actor: this.ctx.app.config.eos.withdraw_account, permission: 'active' }],
          data: {
            "from": this.ctx.app.config.eos.withdraw_account,
            "to": withdraw.toaddress,
            "quantity": `${(withdraw.amount / 10000).toFixed(4)} ${withdraw.symbol}`,
            "memo": withdraw.memo || ""
          }
        }]
      })

      let trx = res.transaction_id;

      let result = await this.app.mysql.update("withdraws", {
        status: 1,
        trx:trx
      }, { where: { id: withdraw.id } });

      console.log("transfer success");

    } catch (err) {
      this.ctx.logger.error(err);
    }

  
  }

  async ont_transfer(withdraw) {

   
  }



}

module.exports = ProcessWithdraw;