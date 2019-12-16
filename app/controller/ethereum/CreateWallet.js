'use strict';
const Controller = require('../../core/base_controller');

class TestWeb3Controller extends Controller {
  create() {
    const ctx = this.ctx;
    const wallet = this.service.ethereum.web3.create();
    ctx.body = ctx.msg.success;
    ctx.body.data = wallet;
  }

  async BatchCreateWallet() {
    const users = await this.app.mysql.select('users', { limit: 1000 });
    await Promise.all(users.map(user => {
      return this.service.account.hosting.create(user.id);
    }));
    this.ctx.body = this.ctx.msg.success;
  }
}

module.exports = TestWeb3Controller;
