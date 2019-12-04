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
      const txHash = await this.service.ethereum.web3Service.issueFanPiao(name, symbol, decimals, cap, initialSupply);
      ctx.body = ctx.msg.success;
      ctx.body.data = { status: 'pending', txHash };
    } catch (error) {
      this.logger.error('issue fanpiao error: ', error);
      ctx.body = ctx.msg.failure;
      ctx.body.data = error;
    }
  }

  async getAccounts() {
    const ctx = this.ctx;
    const accounts = await this.service.ethereum.web3Service.getAccounts();
    ctx.body = ctx.msg.success;
    ctx.body.data = accounts;
  }

  async estimateGas() {
    const ctx = this.ctx;
    // 取出发币参数
    const { name, symbol, decimals = 18, cap } = ctx.request.body;
    try {
      // 交易成功的内容都在options里
      const estimatedGas = await this.service.ethereum.web3Service.estimateGasForDeploy(name, symbol, decimals, cap);
      ctx.body = ctx.msg.success;
      ctx.body.data = { estimatedGas };
    } catch (error) {
      ctx.body = ctx.msg.failure;
      ctx.body.data = error;
    }
  }

}

module.exports = TestWeb3Controller;
