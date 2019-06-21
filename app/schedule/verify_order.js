const Subscription = require('egg').Subscription;
const EOS = require('eosjs');
const ONT = require('ontology-ts-sdk');
const moment = require('moment');
const axios = require('axios');
const consts = require('../service/consts');

class VerifyOrder extends Subscription {

  constructor(ctx) {
    super(ctx);
    this.eosClient = EOS({
      broadcast: true,
      sign: true,
      chainId: ctx.app.config.eos.chainId,
      keyProvider: [ ctx.app.config.eos.keyProvider ],
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
    // if (this.ctx.app.config.isDebug) return;

    const expire = moment().subtract(1, 'hours').format('YYYY-MM-DD HH:mm:ss');

    const results = await this.app.mysql.query(`select * from orders where status=0 and create_time>'${expire}' limit 10`);
    console.log(results);
    if (results.length === 0) { return; }

    for (let i = 0; i < results.length; i++) {
      const order = results[i];
      if (order.platform === 'eos') {
        await this.eos_verify(order);
      } else if (order.platform === 'ont') {
        await this.ont_verify(order);
      }
    }
  }

  async eos_verify(order) {
    const user = await this.app.mysql.get('users', { id: order.uid });

    // 根据 signid 去合约中取 table row，Limit 为username
    // 取到则继续验证 amount， contract ，symbol， referrer， 验证通过才进入结算
    try {
      const result = await this.eosClient.getTableRows({
        json: 'true',
        code: this.ctx.app.config.eos.contract,
        scope: user.username,
        table: 'orders',
        limit: 1,
        lower_bound: order.id,
      });

      if (result && result.rows && result.rows.length > 0) {
        const row = result.rows[0];

        let verifyPass = false;

        const reffer = await this.app.mysql.get('users', { id: order.referreruid });
        const reffer_name = reffer ? reffer.username : '';

        let contract_ref = row.ref;
        if (contract_ref === 'null') {
          contract_ref = '';
        }

        const strs = row.amount.split(' ');
        const amount = parseFloat(strs[0]) * 10000;
        const symbol = strs[1];

        if (row.contract === order.contract
          && row.user === user.username
          && symbol === order.symbol
          && amount === order.amount
          && contract_ref === reffer_name
        ) {
          verifyPass = true;
        }

        console.log('user,', user);
        console.log('reffer,', reffer);
        console.log('contract,', row);
        console.log('mysql', order);
        console.log('verifyPass', verifyPass);

        if (verifyPass) {
          await this.passVerify(order);
        }

      } else {
        console.log('table row not found');
      }

    } catch (err) {
      console.log('get table row err', err);
    }

  }

  async ont_verify(order) {
    // TODO 等待本体合约的实现
  }

  async passVerify(order) {
    order.action = consts.payActions.buy;
    this.service.mechanism.payContext.handling(order);
  }

}

module.exports = VerifyOrder;
