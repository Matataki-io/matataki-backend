'use strict';

const Controller = require('../core/base_controller');

// 仅用于开发调试 service 用途的 controller
// ⚠️ 请设置好接口的权限！！！
class OnlyForDevController extends Controller {
  async getActiveUnderBalanceWallet() {
    const { ctx } = this;
    const result = await this.service.ethereum.etherBalance.getUnderBalanceWallet();
    ctx.body = ctx.msg.success;
    ctx.body.data = { length: result.length, result };
  }

  async justAirDrop() {
    const { ctx } = this;
    const { addresses, amounts } = ctx.request.body;
    try {
      const txHash = await this.service.ethereum
        .etherAirdrop.batchAirdropEther(addresses, amounts);
      ctx.body = ctx.msg.success;
      ctx.body.data = { txHash };
    } catch (error) {
      ctx.body = ctx.msg.failure;
      ctx.body.data = { error };
    }
  }

  async isExistInDB() {
    const { ctx } = this;
    const { txHash } = ctx.params;
    const result = await this.service.token.externalDeposit.isTxNotExistInDB(txHash);
    ctx.body = ctx.msg.success;
    ctx.body.data = { result };
  }

  async createPeggedTokenOnBSC() {
    // @XXX: remove before go mainnet
    const { ctx } = this;
    const { name, symbol, decimals } = ctx.request.body;
    const result = await this.service.token.crosschain._createPeggedTokenOnBsc(name, symbol, Number(decimals));
    if (result.statusCode !== 201) {
      ctx.body = ctx.msg.failure;
      ctx.body.data = { error: 'Something bad happened, please contact Matataki Team ASAP.' };
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = result.data.hash;
  }

  async signMintPermit() {
    // @XXX: remove before go mainnet
    const { ctx } = this;
    const { token, to, value } = ctx.request.body;
    const result = await this.service.token.crosschain.issueMintPermit(token, to, value);
    ctx.body = ctx.msg.success;
    ctx.body.data = result;
  }
}

module.exports = OnlyForDevController;
