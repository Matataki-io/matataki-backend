'use strict';

const Controller = require('egg').Controller;

class AssetController extends Controller {
  // 查询当前用户CNY余额
  async getBalance() {
    const ctx = this.ctx;
    let { symbol } = ctx.query;
    if (!symbol) {
      symbol = 'CNY';
    }
    const balance = await this.ctx.service.assets.balanceOf(ctx.user.id, symbol);
    ctx.body = balance;
  }
}

module.exports = AssetController;
