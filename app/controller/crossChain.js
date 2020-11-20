'use strict';

const Controller = require('../core/base_controller');

class CrossChainController extends Controller {
  async createPeggedTokenOnBSCForAdmin() {
    // 无任何检测，仅限工程师，请设置好接口的权限！！！
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

  async createPeggedTokenOnBSCForAdminById() {
    // 无任何检测，仅限工程师，请设置好接口的权限！！！
    const { ctx } = this;
    const { id } = ctx.params;
    const token = await this.service.token.mineToken.get(id);
    if (!token) {
      ctx.body = ctx.msg.failure;
      ctx.status = 400;
      ctx.body.message = 'Token not exist';
      return;
    }
    const { name, symbol, decimals } = token
    const result = await this.service.token.crosschain._createPeggedTokenOnBsc(name, symbol, Number(decimals));
    if (result.statusCode !== 201) {
      ctx.body = ctx.msg.failure;
      ctx.body.data = { error: 'Something bad happened, please contact Matataki Team ASAP.' };
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = result.data.hash;
  }


  async withdrawToBsc() {
    const { ctx } = this;
    const tokenId = ctx.params.id;
    const { target, amount } = ctx.request.body;
    if (isNaN(amount) || amount <= 0) {
      ctx.body = ctx.msg.failure;
      ctx.status = 400;
      ctx.body.message = 'Use legit amount';
      return;
    }
    if (target.slice(0, 2) !== '0x' || target.length !== 42) {
      ctx.body = ctx.msg.failure;
      ctx.status = 400;
      ctx.body.message = 'Use legit ethereum address';
      return;
    }
    const currentBalance = Number(await ctx.service.token.mineToken.balanceOf(ctx.user.id, tokenId));
    if (currentBalance < amount) {
      ctx.body = ctx.msg.failure;
      ctx.status = 400;
      ctx.body.message = "You don't have so much token to do that, please check and try again.";
      return;
    }

    const token = await this.service.token.mineToken.get(tokenId);
    if (!token) {
      ctx.body = ctx.msg.failure;
      ctx.status = 400;
      ctx.body.message = 'Token not exist';
      return;
    }
    const { data } = await this.service.token.crosschain.getAddressFromNameAndSymbol(token.name, token.symbol);
    if (!data.isTokenDeployed) {
      ctx.body = ctx.msg.failure;
      ctx.status = 400;
      ctx.body.message = 'Pegged Token was not deployed.';
      return;
    }
    try {
      const permit = await this.service.token.mineToken.withdrawToBsc(tokenId, ctx.user.id, target, amount, data.addressLookUpBySymbol);
      ctx.body = {
        ...ctx.msg.success,
        data: { permit },
      };
    } catch (error) {
      ctx.body = ctx.msg.failure;
      ctx.status = 400;
      ctx.body.data = { error };
    }
  }

  async getMyIssuedPermit() {
    const { ctx } = this;
    const permits = await this.service.token.crosschain.getMyIssuedPermits(ctx.user.id);
    ctx.body = {
      ...ctx.msg.success,
      data: { permits },
    };
  }

  async signMintPermit() {
    // 无任何检测，仅限工程师，请设置好接口的权限！！！
    const { ctx } = this;
    const { token, to, value } = ctx.request.body;
    const latestNonce = await this.service.token.crosschain.getNonceOf(token, to);
    const result = await this.service.token.crosschain.issueMintPermit(token, to, value, latestNonce);
    ctx.body = ctx.msg.success;
    ctx.body.data = result;
  }

  async getMintPermitNonceOf() {
    const { ctx } = this;
    const { tokenOnBsc, walletOnBsc } = ctx.params;
    const result = await this.service.token.crosschain.getNonceOf(tokenOnBsc, walletOnBsc);

    ctx.body = ctx.msg.success;
    ctx.body.data = { nonce: result, token: tokenOnBsc, forWho: walletOnBsc };
  }

  async getBscAddress() {
    const { ctx } = this;
    const tokenId = ctx.params.id;
    const token = await this.service.token.mineToken.get(tokenId);
    if (!token) {
      ctx.body = ctx.msg.failure;
      ctx.status = 400;
      ctx.body.message = 'Token not exist';
      return;
    }
    const tokenAddress = await this.service.token.crosschain.getAddressFromNameAndSymbol(token.name, token.symbol);
    ctx.body = {
      ...ctx.msg.success,
      data: tokenAddress.data,
    };
  }

  async isPermitUsed() {
    const { ctx } = this;
    const { tokenOnBsc, walletOnBsc, nonce } = ctx.params;
    const result = await this.service.token.crosschain.isPermitUsed(tokenOnBsc, walletOnBsc, nonce);

    ctx.body = ctx.msg.success;
    ctx.body.data = { isPermitUsed: result, nonce, token: tokenOnBsc, forWho: walletOnBsc };
  }
}

module.exports = CrossChainController;
