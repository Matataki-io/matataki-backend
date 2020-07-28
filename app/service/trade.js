'use strict';
const moment = require('moment');
const Service = require('egg').Service;
const consts = require('./consts');

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
    price,
  }) {
    const token = await this.service.token.mineToken.getToken({ id: tokenId });
    if (!token) {
      this.logger.error('service::TradeService createMarket error, cannot get token by id: %j', tokenId);
      return -1;
    }
    // 查看用户token余额
    const token_balance = await this.service.token.mineToken.balanceOf(uid, tokenId);
    if (token_balance < amount) {
      this.logger.error('service::TradeService createMarket error token_balance < amount, ', { token_balance, amount });
      return -2;
    }

    const marketExist = await this.getMarket(tokenId);
    // 直连交易已存在
    if (marketExist) {
      this.logger.error('service::TradeService createMarket error market already exist ');
      return -3;
    }

    const exchange_uid = await this.createVisualUser(token.symbol);
    // 创建虚拟用户失败
    if (exchange_uid === -1) {
      this.logger.error('service::TradeService createMarket create visual user error');
      return -4;
    }
    const market = token.symbol + '_CNY';

    const conn = await this.app.mysql.beginTransaction();
    // 转移资产
    const transferResult = await this.service.token.mineToken.transferFrom(tokenId, uid, exchange_uid, amount, '', consts.mineTokenTransferTypes.direct_trade, conn);
    // 转移资产失败
    if (!transferResult) {
      await conn.rollback();
      this.logger.error('service::TradeService createMarket error transfer token error, Result: %j', transferResult);
      return -5;
    }
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    try {
      const result = await conn.insert('direct_trade_market', {
        uid,
        token_id: tokenId,
        market,
        price,
        amount,
        exchange_uid,
        create_time: now,
        update_time: now,
      });
      const insertSuccess = result.affectedRows === 1;
      return insertSuccess;
    } catch (error) {
      await conn.rollback();
      this.logger.error('service::TradeService createMarket insert direct_trade_market error, error: %j', error);
      return -6;
    }
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
    const result = await this.app.mysql.insert('direct_trade_log', {
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
  async getMarket(tokenId) {
    const post = await this.app.mysql.get('direct_trade_market', { token_id: tokenId });
    return post;
  }
  // 创建虚拟账号
  async createVisualUser(symbol) {
    // this.service.token.exchange.create()

    const username = this.config.user.tradeUserPrefix + symbol;
    const platform = 'cny';
    // 虚拟账号
    let exchangeUser = await this.service.auth.getUser(username, platform);
    if (!exchangeUser) {
      try {
        await this.service.auth.insertUser(username, '', platform, 'ss', '', 'cv46BYasKvID933R', 0); // todo：确认该类账号不可从前端登录
      } catch (e) {
        this.logger.error('ExchangeService.create exception. %j', e);
        return -1;
      }
      exchangeUser = await this.service.auth.getUser(username, platform);
      await this.service.user.setAvatar('/avatar/trade.png', exchangeUser.id);
    }

    return exchangeUser.id;
  }
}

module.exports = TradeService;
