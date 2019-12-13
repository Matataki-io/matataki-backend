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

  async _send() {
    /**
     * 这个函数可以利用操作员帐户直接把token从别人帐户转账出去
     * 很危险！！！ 这个接口应该仅供开发测试用
     * 请实际开发该功能使用时，设置好限制措施！
     */
    const ctx = this.ctx;
    // 取出发币参数
    const { from, to, amount } = ctx.request.body;
    try {
      // _token_contract_dev 应该到时候替换成实际的token合约地址
      const _token_contract_dev = '0xf4F6f5878662dcB4ac404D69da0eEaEe5092bC8E';
      // from 应该限制为用户当前帐户的以太坊钱包（不能代替别人）
      const txHash = await this.service.ethereum.fanPiao._operatorSend(_token_contract_dev, from, to, amount);
      ctx.body = ctx.msg.success;
      ctx.body.data = { status: 'pending', txHash };
    } catch (error) {
      this.logger.error('_send error: ', error);
      ctx.body = ctx.msg.failure;
      ctx.body.data = { error };
    }
  }


}

module.exports = FanPiaoController;
