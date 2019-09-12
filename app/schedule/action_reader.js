const Subscription = require('egg').Subscription;
const EOS = require('eosjs');
let _ = require('lodash');

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
      startAt: ctx.app.config.eos.startAt,
      step: 20,
      watchAccount: ctx.app.config.eos.contract,
    };
  }

  static get schedule() {
    return {
      interval: '1s',
      type: 'worker',
    };
  }

  async subscribe() {
    // 废弃
    return;
    if (this.ctx.app.config.isDebug) return;

    let start = this.app.cache || this.config.startAt;

    try {
      var sql = 'select MAX(id) as id from actions';
      let re = await this.app.mysql.query(sql);

      if (re && re[0]) {
        let id = re[0].id;
        if (id > start) {
          start = id;
        } else {
          // console.log("in the end...will fetch last.")
        }
      }

    } catch (err) {
      this.logger.error(err);
      console.log(err);
    }

    this.app.cache = start;

    this.logger.info('sync actions.. start from id', start);
    // 这样打log有没有问题啊..
    this.logger.info('to id', (this.app.cache + this.config.step));
    console.log('sync actions.. start from id', start, 'to id', (this.app.cache + this.config.step));

    let sqls = [];

    try {

      const res = await this.eosClient.getActions({
        account_name: this.config.watchAccount,
        pos: start,
        offset: this.config.step,
      });

      for (let i = 0; i < res.actions.length; i++) {
        const x = res.actions[i];
        let seq = x.account_action_seq;
        let act_account = x.action_trace.act.account;
        let act_receiver = x.action_trace.receipt.receiver;
        let act_name = x.action_trace.act.name;
        let act_data = '';

        let author = '';
        let memo = '';
        let amount = 0;
        let sign_id = null;

        let type = 'other';
        let block_time = x.block_time;
        block_time = moment(block_time).add(8, 'hours').format('YYYY-MM-DD HH:mm:ss');

        // bill type
        if (act_name === 'bill' && act_account === this.config.watchAccount && act_receiver === this.config.watchAccount) {
          act_data = x.action_trace.act.data;

          author = act_data.owner;

          if (act_data.quantity) {
            amount = (act_data.quantity.split(' ')[0] - 0) * 10000;
          }

          sign_id = act_data.signId;
          type = 'bill ' + act_data.type;

          act_data = JSON.stringify(x.action_trace.act.data);
        }

        // 判断是打赏转账类型
        if (act_name == 'transfer' && act_account == 'eosio.token') {

          act_data = x.action_trace.act.data;

          memo = act_data.memo;

          let from = act_data.from;
          let to = act_data.to;
          amount = (act_data.quantity.split(' ')[0] - 0) * 10000;

          act_data = JSON.stringify(x.action_trace.act.data);

          if (to === this.config.watchAccount && memo.includes('share')) {
            type = 'share';
            author = from; // 记录打赏人
            sign_id = memo.split(' ')[1];
          }

          if (to === this.config.watchAccount && memo.includes('support')) {
            type = 'share';
            author = from; // 记录打赏人
            sign_id = memo.split(' ')[1];
          }

          if (memo.includes('claim') && act_receiver === to) {
            type = 'claim';
            author = to; // 记录打赏人
          }

        }

        // 兼容ONT方案， 查询action中是否存在，不存在，则写入 support 和 asset_change_log
        if (type === 'share') {
          const action = await this.app.mysql.get('actions', { id: seq });
          if (!action) {
            const user = await this.app.mysql.get('users', { username: author });

            if (user) {
              const result = await this.app.mysql.query('INSERT INTO supports (uid, signid, contract, symbol, amount, referreruid, platform, status, create_time) VALUES (?, ?, ?, ?, ?, ?, ? ,?, ?)',
                [ user.id, sign_id, 'eosio.token', 'EOS', amount, 0, 'eos', 1, block_time ]
              );
              this.logger.info(result);
              console.log(result);
            }
          }
        }

        if (type === 'bill support expenses') {
          const action = await this.app.mysql.get('actions', { id: seq });
          if (!action) {
            // let post = await this.app.mysql.get("posts", { id: sign_id });
            // let user = await this.app.mysql.get("users", { username: post.username });

            const user = await this.app.mysql.get('users', { username: author });

            if (user) {
              const result = await this.app.mysql.query('INSERT INTO assets_change_log(uid, signid, contract, symbol, amount, platform, type, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [ user.id, sign_id, 'eosio.token', 'EOS', amount, 'eos', 'support expenses', block_time ]
              );
              this.logger.info(result);
              console.log(result);
            }
          }
        }

        if (type === 'bill sign income') {
          const action = await this.app.mysql.get('actions', { id: seq });
          if (!action) {
            const post = await this.app.mysql.get('posts', { id: sign_id });
            let user;
            if (post.platform === 'ont') {
              user = await this.app.mysql.get('users', { username: post.username });
            } else {
              user = await this.app.mysql.get('users', { username: author });
            }

            if (user) {
              const result = await this.app.mysql.query('INSERT INTO assets_change_log(uid, signid, contract, symbol, amount, platform, type, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [ user.id, sign_id, 'eosio.token', 'EOS', amount, 'eos', 'sign income', block_time ]
              );
              this.logger.info(result);
              console.log(result);
              if (user.platform === 'ont') {
                await this.app.mysql.query('INSERT INTO assets(uid, contract, symbol, amount, platform) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?',
                  [ user.id, 'eosio.token', 'EOS', amount, 'eos', amount ]
                );
              }
            }

          }
        }

        if (type === 'bill share income') {
          const action = await this.app.mysql.get('actions', { id: seq });
          if (!action) {
            const post = await this.app.mysql.get('posts', { id: sign_id });

            let user;
            // if (post.platform === "ont") {
            //   user = await this.app.mysql.get("users", { username: post.username });
            // } else {
            user = await this.app.mysql.get('users', { username: author });
            // }

            if (user) {
              const result = await this.app.mysql.query('INSERT INTO assets_change_log(uid, signid, contract, symbol, amount, platform, type, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [ user.id, sign_id, 'eosio.token', 'EOS', amount, 'eos', 'share income', block_time ]
              );
              this.logger.info(result);
              console.log(result);
              if (user.platform === 'ont') {
                await this.app.mysql.query('INSERT INTO assets(uid, contract, symbol, amount, platform) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?',
                  [ user.id, 'eosio.token', 'EOS', amount, 'eos', amount ]
                );
              }
            }
          }
        }

        if (type === 'claim') {
          const action = await this.app.mysql.get('actions', { id: seq });
          if (!action) {
            const user = await this.app.mysql.get('users', { username: author });
            if (user) {
              const result = await this.app.mysql.query('INSERT INTO assets_change_log(uid, signid, contract, symbol, amount, platform, type, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [ user.id, 0, 'eosio.token', 'EOS', (0 - amount), 'eos', 'withdraw', block_time ]
              );
              this.logger.info(result);
              console.log(result);
            }
          }
        }

        var sql = `INSERT INTO actions VALUES (${seq}, '${act_account}', '${act_name}', '${act_data}','${author}', '${memo}', '${amount}', '${sign_id}', '${type}', '${block_time}') ON DUPLICATE KEY UPDATE id='${seq}';`;
        await this.app.mysql.query(sql);
      }

    } catch (err) {
      this.logger.error(err);
      console.log(err);
    }

  }

}

module.exports = ActionReader;
