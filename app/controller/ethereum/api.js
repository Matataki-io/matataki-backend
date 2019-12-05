'use strict';
const Controller = require('../../core/base_controller');

class EthereumAPIController extends Controller {
  async getTransaction() {
    const { ctx } = this;
    const { txHash } = ctx.params;
    try {
      const result = await this.service.ethereum.web3.getTransaction(txHash);
      ctx.body = ctx.msg.success;
      ctx.body.data = { result };
    } catch (error) {
      this.logger.error('getTransaction error: ', error);
      ctx.body = ctx.msg.failure;
      ctx.body.data = { error };
    }
  }
}

module.exports = EthereumAPIController;
