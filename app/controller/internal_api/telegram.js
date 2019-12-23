'use strict';

const Controller = require('../../core/base_controller');

class TelegramController extends Controller {
  async getWalletAddressFromTelegramUid() {
    const { ctx } = this;
    const { telegram, blockchain = 'ETH' } = ctx.params;
    const user = await this.app.mysql.get('user_social_accounts', { telegram });
    if (!user) {
      ctx.body = ctx.msg.failure;
      return;
    }
    const { uid } = user;
    const hostingAccount = await this.app.mysql.get('account_hosting', { uid, blockchain });
    if (!hostingAccount) {
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
}

module.exports = TelegramController;
