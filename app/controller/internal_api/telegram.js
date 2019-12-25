'use strict';

const Controller = require('../../core/base_controller');

class TelegramController extends Controller {
  async getWalletAddressFromTelegramUid() {
    const { ctx } = this;
    const { account, blockchain = 'ETH' } = ctx.params;
    const user = await this.app.mysql.get('user_accounts', { platform: 'telegram', account });
    if (!user) {
      ctx.status = 404;
      ctx.body = ctx.msg.failure;
      return;
    }
    const { uid } = user;
    const hostingAccount = await this.app.mysql.get('account_hosting', { uid, blockchain });
    if (!hostingAccount) {
      ctx.status = 404;
      ctx.body = ctx.msg.failure;
      return;
    }
    ctx.body = {
      code: 0,
      data: {
        public_key: hostingAccount.public_key,
      },
    };

  }
  async getAssociatedInfo() {
    const { ctx } = this;
    const { account } = ctx.params;

    let [user] = await this.app.mysql.query(`SELECT id, nickname, email, username FROM users WHERE id = (SELECT uid FROM user_accounts WHERE platform = 'telegram' AND account = ?)`, [account]);
    if (!user) {
      user = null;
    } else {
      user = {
        id: user.id,
        name: user.nickname || this.service.user.maskEmailAddress(user.email) || user.username,
      };
    }

    let minetoken = user ? await this.app.mysql.get('minetokens', { uid: user.id }) : null;
    if (minetoken) {
      minetoken = {
        id: minetoken.id,
        name: minetoken.name,
        symbol: minetoken.symbol
      };
    }

    ctx.body = {
      ...ctx.msg.success,
      data: {
        user,
        minetoken,
      },
    };
  }
}

module.exports = TelegramController;
