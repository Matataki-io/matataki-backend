'use strict';
const moment = require('moment');
const Service = require('egg').Service;

class TradeService extends Service {
  /**
   * 创建直接交易市场
   * @param {*} {
   *     uid,
   *     tokenId,
   *     amount,
   *   }
   * @return {*} 返回创建是否成功
   * @memberof TradeService
   */
  async createMarket({
    uid,
    tokenId,
    amount,
  }) {
    const token = await this.service.token.mineToken.getToken({ id: tokenId });
    if (!token) {
      this.logger.info('service::TradeService createMarket error, cannot get token by id: %j', tokenId);
      return -1;
    }
    const market = token.symbol + '_CNY';
    const price = 10000;
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    const result = await this.app.mysql.insert('direct_trade_market', {
      uid,
      token_id: tokenId,
      market,
      price,
      amount,
      create_time: now,
      update_time: now,
    });
    const insertSuccess = result.affectedRows === 1;
    return insertSuccess;
  }
  /**
   * 更新市场数量
   * @param {*} { uid, tokenId, amount }
   * @return {Boolean} 更新是否成功
   * @memberof TradeService
   */
  async updateMarketAmount({ uid, tokenId, amount }) {
    const { app } = this;
    const now = app.mysql.literals.now();
    const market = await app.mysql.get('direct_trade_market', { uid, token_id: tokenId });
    if (!market) {
      this.logger.info('service::TradeService updateMarketAmount error, cannot get market by uid & tokenId: %j', { uid, tokenId });
      return -1;
    }
    const row = {
      amount: market.amount + amount,
      update_time: now,
    };
    const result = app.mysql.update('direct_trade_market', row, {
      where: { id: market.id },
    });
    const updateSuccess = result.affectedRows === 1;
    return updateSuccess;
  }

  /**
   * 直接购买添加交易日志
   * @param {*} {
   *     uid,  // 购买者
   *     marketId,  // 交易市场ID
   *     amount, // 购买数量
   *   }
   * @return {*} 返回添加是否成功
   * @memberof TradeService
   */
  async createLog({ uid, marketId, amount }) {
    const market = await this.app.mysql.get('direct_trade_market', { id: marketId });
    if (!market) {
      this.logger.info('service::TradeService createLog error, cannot get market id: %j', { marketId });
      return -1;
    }
    const { token_id, price } = market;
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    const result = await this.app.mysql.insert('direct_trade_market', {
      uid,
      token_id,
      market_id: marketId,
      price,
      amount,
      create_time: now,
      update_time: now,
    });
    const insertSuccess = result.affectedRows === 1;
    return insertSuccess;
  }
}

module.exports = TradeService;
