'use strict';

const Controller = require('../core/base_controller');

class ExchangeController extends Controller {
  async create() {
    const ctx = this.ctx;

    const { tokenId } = ctx.request.body;
    const result = await ctx.service.token.exchange.create(tokenId);

    if (result === -1) {
      ctx.body = ctx.msg.tokenNotExist;
    } else if (result === -2) {
      ctx.body = ctx.msg.exchangeAlreadyCreated;
    } else if (result === 0) {
      ctx.body = ctx.msg.failure;
    } else {
      ctx.body = ctx.msg.success;
    }
  }

  async get() {
    const ctx = this.ctx;

    const { tokenId } = this.ctx.query;
    const result = await ctx.service.token.exchange.getExchange(tokenId);
    if (!result) {
      ctx.body = ctx.msg.failure;
      return;
    }
    ctx.body = ctx.msg.success;
    ctx.body.data = result;
  }

  // todo : 测试代码
  async addLiquidity() {
    const ctx = this.ctx;
    const orderId = parseInt(ctx.request.body.orderId);
    const result = await ctx.service.token.exchange.addLiquidityOrder(orderId);
    ctx.body = ctx.msg.success;
  }

  async removeLiquidity() {
    const ctx = this.ctx;
    const { tokenId, amount, min_cny, min_tokens, deadline } = ctx.request.body;
    const result = await ctx.service.token.exchange.removeLiquidity(ctx.user.id, tokenId, amount, min_cny, min_tokens, deadline);
    ctx.body = ctx.msg.success;
  }

  async cnyToTokenInput() {
    const ctx = this.ctx;
    const orderId = parseInt(ctx.request.body.orderId);
    const result = await ctx.service.token.exchange.cnyToTokenInputOrder(orderId);
    ctx.body = ctx.msg.success;
  }

  async tokenToCnyInput() {
    const ctx = this.ctx;
    const { tokenId, tokens_sold, min_cny, deadline, recipient } = ctx.request.body;
    const result = await ctx.service.token.exchange.tokenToCnyInput(ctx.user.id, tokenId, tokens_sold, min_cny, deadline, recipient, this.clientIP);
    ctx.body = ctx.msg.success;
  }

  async tokenToTokenInput() {
    const ctx = this.ctx;
    const { inTokenId, tokens_sold, min_tokens_bought, deadline, recipient, outTokenId } = ctx.request.body;
    const result = await ctx.service.token.exchange.tokenToTokenInput(ctx.user.id, inTokenId, tokens_sold, min_tokens_bought, deadline, recipient, outTokenId, this.clientIP);
    ctx.body = ctx.msg.success;
  }
  async getTokenAmount() {
    const { ctx } = this;
    const { tokenId, amount = 0 } = ctx.query;
    // 计算使用cny兑换token的数量，以输入的cny数量为准
    const tokenAmount = await ctx.service.token.exchange.getCnyToTokenInputPrice(tokenId, parseFloat(amount));
    if (tokenAmount === -1) {
      ctx.body = ctx.msg.failure;
      return;
    }
    ctx.body = {
      ...ctx.msg.success,
      data: tokenAmount,
    };
  }
  async getCnyAmount() {
    const { ctx } = this;
    const { tokenId, amount = 0 } = ctx.query;
    // 计算使用cny兑换token的数量，以输出的token数量为准
    const cnyAmount = await ctx.service.token.exchange.getCnyToTokenOutputPrice(tokenId, parseFloat(amount));
    if (cnyAmount === -1) {
      ctx.body = ctx.msg.failure;
      return;
    }
    ctx.body = {
      ...ctx.msg.success,
      data: cnyAmount,
    };
  }
  async getCurrentPoolSize() {
    const { ctx } = this;
    const { tokenId } = ctx.query;
    const currentPoolSize = await ctx.service.token.exchange.getCurrentPoolSize(tokenId);
    if (currentPoolSize === -1) {
      ctx.body = {
        ...ctx.msg.success,
        data: {
          cny_amount: 0,
          token_amount: 0,
        },
      };
    } else {
      ctx.body = {
        ...ctx.msg.success,
        data: currentPoolSize,
      };
    }
  }
  async getYourPoolSize() {
    const { ctx } = this;
    const uid = ctx.user.id;
    const { tokenId } = ctx.query;
    const yourPoolSize = await ctx.service.token.exchange.getYourPoolSize(uid, tokenId);
    if (yourPoolSize === -1) {
      ctx.body = {
        ...ctx.msg.success,
        data: {
          cny_amount: 0,
          token_amount: 0,
        },
      };
    } else {
      ctx.body = {
        ...ctx.msg.success,
        data: yourPoolSize,
      };
    }
  }
  async getYourMintToken() {
    const { ctx } = this;
    const { amount, tokenId } = ctx.query;
    const yourMintToken = await ctx.service.token.exchange.getYourMintToken(amount, tokenId);
    if (yourMintToken === -1) {
      ctx.body = {
        ...ctx.msg.success,
        data: amount,
      };
    } else {
      ctx.body = {
        ...ctx.msg.success,
        data: yourMintToken,
      };
    }
  }

}

module.exports = ExchangeController;
