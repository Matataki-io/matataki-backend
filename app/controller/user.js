'use strict';

const Controller = require('../core/base_controller');
const moment = require('moment');
var _ = require('lodash');
const ONT = require('ontology-ts-sdk');
class UserController extends Controller {

  async user() {
    const ctx = this.ctx;

    const id = ctx.params.id;

    const details = await this.service.user.getUserById(id);

    if (details === null) {
      ctx.body = ctx.msg.userNotExist;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = details;
  }

  async tokens() {
    const { page = 1, symbol = "EOS" } = this.ctx.query;
    let pagesize = 20;

    // 1. 历史总创作收入 (sign income)
    const tokens = await this.app.mysql.query(
      'select id, contract, symbol, amount, platform from assets where uid = ? and symbol= ? ',
      [ this.ctx.user.id, symbol ]
    );

    const logs = await this.app.mysql.query(
      'select a.contract, a.symbol, a.amount, a.type, a.create_time, a.signid, a.trx, a.toaddress, a.memo, a.status, b.title from assets_change_log a left join posts b on a.signid = b.id where a.uid = ? and a.symbol = ? order by a.create_time desc limit ? ,? ',
      [ this.ctx.user.id, symbol, (page - 1) * pagesize, pagesize ]
    );

    let totalSignIncome = await this.app.mysql.query(
      'select sum(amount) as totalSignIncome from assets_change_log where type = ? and uid = ? and symbol = ?',
      [ "sign income", this.ctx.user.id, symbol ]
    );

    let totalShareIncome = await this.app.mysql.query(
      'select sum(amount) as totalShareIncome from assets_change_log where type = ? and uid = ? and symbol = ?',
      [ "share income", this.ctx.user.id, symbol ]
    );

    let totalShareExpenses = await this.app.mysql.query(
      'select sum(amount) as totalShareExpenses from assets_change_log where type = ? and uid = ? and symbol = ?',
      [ "support expenses", this.ctx.user.id, symbol ]
    );

    let balance = 0;
    if (tokens && tokens.length > 0) {
      balance = tokens[0].amount;
    }

    let result = {
      balance: balance,                                                   // 余额（待提现）
      totalSignIncome: totalSignIncome[0].totalSignIncome || 0,           // 总创作收入
      totalShareIncome: totalShareIncome[0].totalShareIncome || 0,        // 总打赏收入 
      totalShareExpenses: totalShareExpenses[0].totalShareExpenses || 0,  // 总打赏支出
      logs: logs                                                          // 流水（之后再来处理分页）
    }

    this.ctx.body = this.ctx.msg.success;
    this.ctx.body.data = result;
  }

  async balance() {

    const tokens = await this.app.mysql.query(
      'select contract, symbol, amount, platform from assets where uid = ? ',
      [ this.ctx.user.id ]
    );

    for (let i = 0; i < tokens.length; i++) {
      let token = tokens[i];
      let value = await this.app.mysql.query(
        'select sum(amount) as value from assets_change_log where uid = ? and symbol = ? and type in (?)',
        [ this.ctx.user.id, token.symbol, [ "sign income", "share income" ]]
      );

      tokens[i].totalIncome = value[0].value || 0;
    }


    this.ctx.body = this.ctx.msg.success;
    this.ctx.body.data = tokens;
  }

  async setAvatar() {

    const ctx = this.ctx;

    const { avatar = '' } = ctx.request.body;

    const userid = ctx.user.id;

    try {
      const now = moment().format('YYYY-MM-DD HH:mm:ss');

      // 如果ID不存在, 会以此ID创建一条新的用户数据, 不过因为jwt secret不会被知道, 所以对外不会发生
      const result = await this.app.mysql.query(
        'INSERT INTO users (id, avatar, create_time) VALUES ( ?, ?, ?) ON DUPLICATE KEY UPDATE avatar = ?',
        [userid, avatar, now, avatar]
      );

      const updateSuccess = result.affectedRows >= 1;

      if (updateSuccess) {
        ctx.body = ctx.msg.success;
      } else {
        ctx.body = ctx.msg.failure;
      }
    } catch (err) {
      this.logger.error('UserController:: updateAvatar Error: %j', err);
      ctx.body = ctx.msg.failure;
    }
  }

  // 将设置用户邮箱、昵称、个性签名合而为一
  async setProfile() {
    const ctx = this.ctx;
    const { email = null, nickname = null, introduction = null, accept = false } = ctx.request.body;

    const setResult = await this.service.user.setProfile(ctx.user.id, email, nickname, introduction, accept);
    if (setResult === 4) {
      ctx.body = ctx.msg.userIntroductionInvalid;
      return;
    } else if (setResult === 7) {
      ctx.body = ctx.msg.nicknameInvalid;
      return;
    } else if (setResult === false) {
      ctx.body = ctx.msg.failure;
      return;
    }

    ctx.body = ctx.msg.success;
  }

  async getUserDetails() {
    const ctx = this.ctx;

    const details = await this.service.user.getUserDetails(ctx.user.id, ctx.user.platform);
    if (details === null) {
      ctx.body = ctx.msg.userNotExist;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = details;
  }

  isInteger(amount) {
    return typeof amount === 'number' && amount % 1 === 0;
  }

  async withdraw() {
    const ctx = this.ctx;
    const { contract, symbol, amount, platform, toaddress, memo, publickey, sign } = ctx.request.body;

    let verifyStatus = true;
    // 验证提现地址合法性
    if (platform === 'eos') {
      verifyStatus = await this.service.user.isEosAddress(toaddress);
      if (verifyStatus === false) {
        ctx.body = ctx.msg.eosAddressInvalid;
        return;
      }
    } else if (platform === 'ont') {
      verifyStatus = await this.service.user.isOntAddress(toaddress);
      if (verifyStatus === false) {
        ctx.body = ctx.msg.ontAddressInvalid;
        return;
      }
    }

    // 签名验证
    try {
      if ('eos' === ctx.user.platform) {
        // EOS最小提现 (测试先不限制)
        // if(amount < 10000){
        //   return this.response(401, "EOS withdtaw amount must greater than 1 ");
        // }

        let sign_data = `${toaddress} ${contract} ${symbol} ${amount}`;
        if ("ont" === platform) {
          sign_data = `${toaddress.slice(0, 12)} ${toaddress.slice(12, 24)} ${toaddress.slice(24, 36)} ${contract.slice(0, 12)} ${contract.slice(12, 24)} ${contract.slice(24, 36)} ${symbol} ${amount}`;
        }
        console.log("debug for withdraw", ctx.user.platform, sign_data, publickey, sign);
        await this.eos_signature_verify(ctx.user.username, sign_data, sign, publickey);
      } else if ('ont' === ctx.user.platform) {
        // ONT最小提现 (测试先不限制)
        // if(amount < 30000){
        //   return this.response(401, "ONT withdtaw amount must greater than 3 ONT");
        // }

        let sign_data = `${toaddress} ${contract} ${symbol} ${amount}`;
        const msg = ONT.utils.str2hexstr(sign_data);
        await this.ont_signature_verify(msg, sign, publickey, publickey, sign);
      } else if (ctx.user.platform === 'github') {
        this.logger.info('UserController:: withdraw: There is a github user withdrawing...');
      } else {
        ctx.body = ctx.msg.postPublishSignVerifyError;  //'platform not support';
        return;
      }
    } catch (err) {
      console.log("signature_verify error", err);
      ctx.body = ctx.msg.postPublishSignVerifyError;  //err.message;
      return;
    }

    let asset = await this.app.mysql.get('assets', { uid: ctx.user.id, symbol: symbol, platform: platform, contract: contract });

    if (!asset) {
      return this.response(401, "not available asset can withdtaw");
    }

    let withdraw_amount = parseInt(amount);

    if (!withdraw_amount) {
      return this.response(401, "invalid amount");
    }

    if (withdraw_amount <= 0) {
      return this.response(401, "invalid amount");
    }

    if (!toaddress) {
      return this.response(401, "withdraw address required");
    }

    if ('ont' === platform) {
      let num = withdraw_amount / 10000;
      if (!this.isInteger(num)) {
        return this.response(401, "ONT withdraw only support Integer");
      }
    }

    let transfer_memo = memo ? memo : "Withdraw from Smart Signature";

    try {
      const conn = await this.app.mysql.beginTransaction();

      try {
        // for update 锁定table row
        let result = await conn.query('SELECT * FROM assets WHERE id=? limit 1 FOR UPDATE;', [asset.id]);

        asset = result[0];

        if (withdraw_amount > asset.amount) {
          throw new Error("withdraw amount should less than balance");
        }

        let remind_amount = asset.amount - withdraw_amount;

        await conn.update("assets", {
          amount: remind_amount
        }, { where: { id: asset.id } });

        const now = moment().format('YYYY-MM-DD HH:mm:ss');
        await conn.insert("assets_change_log", {
          uid: ctx.user.id,
          contract: contract,
          symbol: symbol,
          amount: withdraw_amount,
          platform: platform,
          type: "withdraw",
          toaddress: toaddress,
          memo: transfer_memo,
          status: 0,
          create_time: now,
        });

        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      }

      ctx.body = ctx.msg.success;

    } catch (err) {
      ctx.logger.error(err.sqlMessage);
      this.response(500, 'withdraw error ' + err.sqlMessage)
    }
  }

  async search() {
    const { q = "" } = this.ctx.query;

    let user = await this.app.mysql.get("users", { nickname: q });
    if (!user) {
      user = await this.app.mysql.get("users", { username: q });
    }
    
    if (!user) {
      this.ctx.body = ctx.msg.userNotExist;
      return;
    }

    let result = {
      id: user.id,
      avatar: user.avatar || "",
      nickname: user.nickname,
      username: user.username
    };

    this.ctx.body = this.ctx.msg.success;
    this.ctx.body.data = result;
  }

}

module.exports = UserController;
