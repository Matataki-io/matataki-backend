'use strict';
const Controller = require('../../core/base_controller');

class TestWeb3Controller extends Controller {
  create() {
    const ctx = this.ctx;
    const wallet = this.service.ethereum.web3Service.create();
    ctx.body = ctx.msg.success;
    ctx.body.data = wallet;
  }

  async issue() {
    const ctx = this.ctx;
    // 取出发币参数
    const { name, symbol, decimals = 18, cap, initialSupply } = ctx.request.body;
    try {
      // 交易成功的内容都在options里
      const { options, ...restResult } = await this.service.ethereum.web3Service.issueFanPiao(name, symbol, decimals, cap, initialSupply);
      this.logger.info('issue fanpiao result: ', options);
      ctx.body = ctx.msg.success;
      ctx.body.data = options;
      this.logger.debug('debug fanpiao restResult: ', restResult);
    } catch (error) {
      this.logger.error('issue fanpiao error: ', error);
      ctx.body = ctx.msg.failed;
      ctx.body.data = error;
    }
  }

  async getAccounts() {
    const ctx = this.ctx;
    const accounts = await this.service.ethereum.web3Service.getAccounts();
    ctx.body = ctx.msg.success;
    ctx.body.data = accounts;
  }
}

module.exports = TestWeb3Controller;
