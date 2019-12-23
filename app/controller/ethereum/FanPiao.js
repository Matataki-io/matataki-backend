'use strict';
const Controller = require('../../core/base_controller');

class FanPiaoController extends Controller {
  async issue() {
    const ctx = this.ctx;
    // 取出发币参数
    const { name, symbol, decimals = 18, initialSupply } = ctx.request.body;
    try {
      // 交易成功返回交易hash
      const txHash = await this.service.ethereum.fanPiao.issue(name, symbol, decimals, initialSupply);
      ctx.body = ctx.msg.success;
      ctx.body.data = { status: 'pending', txHash };
    } catch (error) {
      this.logger.error('issue fanpiao error: ', error);
      ctx.body = ctx.msg.failure;
      ctx.body.data = { error, message: '服务器开小差，请稍后再试' };
    }
  }

  async estimateGas() {
    const ctx = this.ctx;
    try {
      const estimatedGas = await this.service.ethereum.fanPiao.estimateGas();
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
