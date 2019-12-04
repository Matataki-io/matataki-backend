'use strict';
const Controller = require('../../core/base_controller');

class FanPiaoController extends Controller {
  async issue() {
    const ctx = this.ctx;
    // 取出发币参数
    const { name, symbol, decimals = 18, cap, initialSupply } = ctx.request.body;
    try {
      // 交易成功的内容都在options里
      const txHash = await this.service.ethereum.fanPiao.issueFanPiao(name, symbol, decimals, cap, initialSupply);
      ctx.body = ctx.msg.success;
      ctx.body.data = { status: 'pending', txHash };
    } catch (error) {
      this.logger.error('issue fanpiao error: ', error);
      ctx.body = ctx.msg.failure;
      ctx.body.data = error;
    }
  }

  async estimateGas() {
    const ctx = this.ctx;
    // 取出发币参数
    const { name, symbol, decimals = 18, cap } = ctx.request.body;
    try {
      // 交易成功的内容都在options里
      const estimatedGas = await this.service.ethereum.fanPiao.estimateGas(name, symbol, decimals, cap);
      ctx.body = ctx.msg.success;
      ctx.body.data = { estimatedGas };
    } catch (error) {
      this.logger.error('estimateGas error: ', error);
      ctx.body = ctx.msg.failure;
      ctx.body.data = error;
    }
  }

}

module.exports = FanPiaoController;
