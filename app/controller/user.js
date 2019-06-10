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


  // async assets() {
  //   const ctx = this.ctx;

  //   const { page = 1, user } = this.ctx.query;
  //   const pagesize = 20;

  //   if (!user) {
  //     ctx.status = 500;
  //     ctx.body = "user required";
  //     return;
  //   }

  //   // 1. 历史总创作收入 (sign income)
  //   const totalSignIncome = await this.app.mysql.query(
  //     'select sum(amount) as totalSignIncome from actions where type = ? and author= ?',
  //     ["bill sign income", user]
  //   );

  //   // 2. 历史总打赏收入 (share income)
  //   const totalShareIncome = await this.app.mysql.query(
  //     'select sum(amount) as totalShareIncome from actions where type = ? and author= ?',
  //     ["bill share income", user]
  //   );

  //   // 3. 历史总打赏支出 (support expenses)
  //   const totalShareExpenses = await this.app.mysql.query(
  //     'select sum(amount) as totalShareExpenses from actions where type = ? and author= ?',
  //     ["bill support expenses", user]
  //   );

  //   let whereOption = {
  //     "act_name": "bill",
  //     "type": ["bill share income", "bill sign income", "bill support expenses"],
  //     "author": user
  //   }

  //   const results = await this.app.mysql.select('actions', {
  //     where: whereOption,
  //     columns: ['author', 'amount', 'sign_id', 'create_time', "type"],
  //     orders: [['create_time', 'desc']],
  //     limit: pagesize,
  //     offset: (page - 1) * pagesize,
  //   });

  //   for (let i = 0; i < results.length; i++) {
  //     if (this.app.post_cache[results[i].sign_id] !== undefined) {
  //       results[i].title = this.app.post_cache[results[i].sign_id].title;
  //     } else {
  //       const post = await this.app.mysql.get('posts', { id: results[i].sign_id });
  //       if (post) {
  //         results[i].title = post.title;
  //         this.app.post_cache[results[i].sign_id] = post;
  //       }
  //     }
  //   }

  //   let resp = {
  //     user: user,
  //     totalSignIncome: totalSignIncome[0].totalSignIncome || 0,
  //     totalShareIncome: totalShareIncome[0].totalShareIncome || 0,
  //     totalShareExpenses: totalShareExpenses[0].totalShareExpenses || 0,
  //     history: results
  //   }

  //   ctx.body = resp;
  //   ctx.status = 200;
  // }

  async tokens() {
    const { page = 1, symbol = "EOS" } = this.ctx.query;
    let pagesize = 20;
    let user;

    try {
      user = await this.get_user();
    } catch (err) {
      this.ctx.status = 401;
      this.ctx.body = err.message;
      return;
    }

    // 1. 历史总创作收入 (sign income)
    const tokens = await this.app.mysql.query(
      'select id, contract, symbol, amount, platform from assets where uid = ? and symbol= ? ',
      [user.id, symbol]
    );

    const logs = await this.app.mysql.query(
      'select a.contract, a.symbol, a.amount, a.type, a.create_time, a.signid, a.trx, a.toaddress, a.memo, a.status, b.title from assets_change_log a left join posts b on a.signid = b.id where a.uid = ? and a.symbol = ? order by a.create_time desc limit ? ,? ',
      [user.id, symbol, (page - 1) * pagesize, pagesize]
    );

    let totalSignIncome = await this.app.mysql.query(
      'select sum(amount) as totalSignIncome from assets_change_log where type = ? and uid = ? and symbol = ?',
      ["sign income", user.id, symbol]
    );

    let totalShareIncome = await this.app.mysql.query(
      'select sum(amount) as totalShareIncome from assets_change_log where type = ? and uid = ? and symbol = ?',
      ["share income", user.id, symbol]
    );

    let totalShareExpenses = await this.app.mysql.query(
      'select sum(amount) as totalShareExpenses from assets_change_log where type = ? and uid = ? and symbol = ?',
      ["support expenses", user.id, symbol]
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
    const ctx = this.ctx;

    let user;

    try {
      user = await this.get_user();
    } catch (err) {
      this.ctx.status = 401;
      this.ctx.body = err.message;
      return;
    }

    const tokens = await this.app.mysql.query(
      'select contract, symbol, amount, platform from assets where uid = ? ',
      [user.id]
    );

    for (let i = 0; i < tokens.length; i++) {
      let token = tokens[i];
      let value = await this.app.mysql.query(
        'select sum(amount) as value from assets_change_log where uid = ? and symbol = ? and type in (?)',
        [user.id, token.symbol, ["sign income", "share income"]]
      );

      tokens[i].totalIncome = value[0].value || 0;
    }


    this.ctx.body = this.ctx.msg.success;
    this.ctx.body.data = tokens;
  }

  // async setNickname() {

  //   const ctx = this.ctx;

  //   const { nickname = '' } = ctx.request.body;

  //   let nickname_regex = /^[\u4e00-\u9fa5_a-zA-Z0-9_]{1,12}$/;

  //   if (!nickname_regex.test(nickname)) {
  //     ctx.status = 400;
  //     ctx.body = 'bad request: 昵称长度不超得过12位，且不可包含字符';
  //     return;
  //   }

  //   const current_user = this.get_current_user();

  //   try {
  //     this.checkAuth(current_user);
  //   } catch (err) {
  //     ctx.status = 401;
  //     ctx.body = err.message;
  //     return;
  //   }


  //   try {
  //     const user = await this.app.mysql.get('users', { nickname: nickname });

  //     if (user) {
  //       ctx.body = {
  //         msg: 'duplicate nickname',
  //       };
  //       ctx.status = 500;
  //       return;
  //     }

  //     const now = moment().format('YYYY-MM-DD HH:mm:ss');

  //     const result = await this.app.mysql.query(
  //       'INSERT INTO users (id ,username, nickname, create_time)'
  //       + ' VALUES (null, ?, ?, ?) ON DUPLICATE KEY UPDATE nickname = ?',
  //       [current_user, nickname, now, nickname]
  //     );

  //     const updateSuccess = result.affectedRows >= 1;

  //     if (updateSuccess) {
  //       ctx.status = 201;
  //     } else {
  //       ctx.status = 500;
  //     }
  //   } catch (err) {
  //     console.log(err);
  //     ctx.body = {
  //       msg: 'setNickname error: ' + err.sqlMessage,
  //     };
  //     ctx.status = 500;
  //   }
  // }


  // async setEmail() {

  //   const ctx = this.ctx;

  //   const { email = '' } = ctx.request.body;

  //   const current_user = this.get_current_user();

  //   try {
  //     this.checkAuth(current_user);
  //   } catch (err) {
  //     ctx.status = 401;
  //     ctx.body = err.message;
  //     return;
  //   }


  //   try {
  //     const user = await this.app.mysql.get('users', { email: email });

  //     if (user) {
  //       ctx.body = {
  //         msg: 'duplicate Email',
  //       };
  //       ctx.status = 500;
  //       return;
  //     }

  //     const now = moment().format('YYYY-MM-DD HH:mm:ss');

  //     const result = await this.app.mysql.query(
  //       'INSERT INTO users (id ,username, email, create_time)'
  //       + ' VALUES (null, ?, ?, ?) ON DUPLICATE KEY UPDATE email = ?',
  //       [current_user, email, now, email]
  //     );

  //     const updateSuccess = result.affectedRows >= 1;

  //     if (updateSuccess) {
  //       ctx.status = 201;
  //     } else {
  //       ctx.status = 500;
  //     }
  //   } catch (err) {
  //     console.log(err);
  //     ctx.body = {
  //       msg: 'setEmail error: ' + err.sqlMessage,
  //     };
  //     ctx.status = 500;
  //   }
  // }


  async setAvatar() {

    const ctx = this.ctx;

    const { avatar = '' } = ctx.request.body;

    const current_user = this.get_current_user();

    try {
      this.checkAuth(current_user);
    } catch (err) {
      ctx.status = 401;
      ctx.body = err.message;
      return;
    }

    try {
      const now = moment().format('YYYY-MM-DD HH:mm:ss');

      const result = await this.app.mysql.query(
        'INSERT INTO users (username, avatar, create_time) VALUES ( ?, ?, ?) ON DUPLICATE KEY UPDATE avatar = ?',
        [current_user, avatar, now, avatar]
      );

      const updateSuccess = result.affectedRows >= 1;

      if (updateSuccess) {
        ctx.status = 201;
      } else {
        ctx.status = 500;
      }
    } catch (err) {
      ctx.logger.error(err.sqlMessage);
      ctx.body = {
        msg: 'setAvatar error: ' + err.sqlMessage,
      };
      ctx.status = 500;
    }
  }

  // async setIntroduction() {
  //   const ctx = this.ctx;
  //   const { introduction = '' } = ctx.request.body;

  //   const updateResult = await this.service.user.setUserIntroduction(introduction, ctx.user.username);

  //   if (updateResult === 4) {
  //     ctx.body = ctx.msg.userIntroductionInvalid;
  //     return;
  //   }

  //   if (updateResult === false) {
  //     ctx.body = ctx.msg.failure;
  //     return;
  //   }

  //   ctx.body = ctx.msg.success;
  // }

  // 将设置用户邮箱、昵称、个性签名合而为一
  async setProfile() {
    const ctx = this.ctx;
    const { email = null, nickname = null, introduction = null } = ctx.request.body;

    const setResult = await this.service.user.setProfile(ctx.user.username, email, nickname, introduction);
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

    const details = await this.service.user.getUserDetails(ctx.user.username);
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

}

module.exports = UserController;
