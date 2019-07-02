const Subscription = require('egg').Subscription;
const EOS = require('eosjs');
var _ = require('lodash');

const consts = require('../service/consts');

const moment = require('moment');

/**
 *  read actions from eos blockchain
 */
class ActionReader extends Subscription {

  constructor(ctx) {
    super(ctx);
    this.eosClient = EOS({
      chainId: ctx.app.config.eos.chainId,
      httpEndpoint: ctx.app.config.eos.httpEndpoint,
    });

    this.config = {
      startAt: 0,
      step: 5,
      watchAccount: ctx.app.config.eos.orange_contract,
    }
  }

  static get schedule() {
    return {
      interval: '5s',
      type: 'all',
    };
  }

  async subscribe() {
    // if (this.ctx.app.config.isDebug) return;

    var start = this.app.cache || this.config.startAt;

    try {
      var sql = `select MAX(id) as id from orange_actions`;
      var re = await this.app.mysql.query(sql);

      if (re && re[0]) {
        var id = re[0].id;
        if (id > start) {
          start = id;
        } else {
          console.log("in the end...will fetch last.")
        }
      }

    } catch (err) {
      console.log(err)
    }

    this.app.cache = start;

    console.log('sync actions.. start from id', start, "to id", (this.app.cache + this.config.step));

    try {

      let res = await this.eosClient.getActions({
        account_name: this.config.watchAccount,
        pos: start,
        offset: this.config.step
      })

      for (let i = 0; i < res.actions.length; i++) {
        let x = res.actions[i];
        var seq = x.account_action_seq;
        var act_account = x.action_trace.act.account;
        var act_receiver = x.action_trace.receipt.receiver;
        var act_name = x.action_trace.act.name;
        var act_data = null

        let block_time = x.block_time;
        block_time = moment(block_time).add(8, "hours").format("YYYY-MM-DD HH:mm:ss");

        if (act_account === this.config.watchAccount
          && act_name === "incomelog"
          && act_receiver === this.config.watchAccount) {

          act_data = x.action_trace.act.data;

          let action_type = act_data.type;
          let username = act_data.user;

          let quantity = act_data.income.quantity;
          let contract = act_data.income.contract;

          let amount = parseFloat(quantity) * 10000;
          let symbol = quantity.split(" ")[1];

          let ad_hash = act_data.ad_hash;

          let user = await this.app.mysql.get('users', { username: username });

          if (!user) {
            let newuser = await this.app.mysql.insert('users', {
              username: username,
              platform: "eos",
              create_time: moment().format('YYYY-MM-DD HH:mm:ss')
            });
            user = await this.app.mysql.get('users', { username: username });
          }

          if (action_type === "buyad") {
            // 仅记录支出log
            const conn = await this.app.mysql.beginTransaction();
            try {
              await conn.query('INSERT INTO assets_change_log(uid, signid, contract, symbol, amount, platform, type, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [user.id, 0, "eosio.token", "EOS", amount, "eos", consts.assetTypes.buyad, block_time]
              );

              var sql = `INSERT INTO orange_actions VALUES (${seq}, '${act_account}', '${act_name}', '${act_receiver}', '${ad_hash}', '${username}', '${amount}', '${block_time}');`
              await conn.query(sql);

              await conn.commit();
              console.log("record success");
            } catch (err) {
              await conn.rollback();
            }
          }

          if (action_type === "earn") {
            const conn = await this.app.mysql.beginTransaction();
            try {
              await conn.query('INSERT INTO assets_change_log(uid, signid, contract, symbol, amount, platform, type, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [user.id, 0, "eosio.token", "EOS", amount, "eos", consts.assetTypes.earn, block_time]
              );

              await conn.query(
                'INSERT INTO assets(uid, contract, symbol, amount, platform) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?',
                [user.id, "eosio.token", "EOS", amount, "eos", amount]
              );

              var sql = `INSERT INTO orange_actions VALUES (${seq}, '${act_account}', '${act_name}', '${act_receiver}', '${ad_hash}', '${username}', '${amount}', '${block_time}');`
              await conn.query(sql);

              await conn.commit();
              console.log("record success");
            } catch (err) {
              await conn.rollback();
            }
          }

        } else {
          let user = null
          let amount = 0;
          var sql = `INSERT INTO orange_actions VALUES (${seq}, '${act_account}', '${act_name}', '${act_receiver}', null, null, null, '${block_time}');`
          try {
            await this.app.mysql.query(sql);
          } catch (err) {
          }
        }
      }
    } catch (err) {
      console.log(err);
    }
  }
}

module.exports = ActionReader;