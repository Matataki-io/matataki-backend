'use strict';
const moment = require('moment');
const Service = require('egg').Service;
const consts = require('./consts');

class directTradeService extends Service {
  /**
   * 创建直接交易市场
   * @param {*} {
   *     uid,
   *     tokenId,
   *     price,
   *   }
   * @return {*} 返回创建是否成功
   * @memberof TradeService
   */
  async createMarket({
    uid,
    tokenId,
    price,
  }) {
    if (!price || parseInt(price) <= 0) {
      return -7;
    }
    const token = await this.service.token.mineToken.getToken({ id: tokenId });
    if (!token) {
      this.logger.error('service::TradeService createMarket error, cannot get token by id: %j', tokenId);
      return -1;
    }

    const marketExist = await this.getByTokenId(tokenId);
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
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    try {
      const result = await conn.insert('direct_trade_market', {
        uid,
        token_id: tokenId,
        market,
        price,
        exchange_uid,
        amount: 0,
        create_time: now,
        update_time: now,
        status: 0,
      });
      await conn.commit();
      this.logger.info('service::TradeService createMarket success, result: %j', result);
      return result.insertId;
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
    if (!amount || parseInt(amount) <= 0) {
      return -7;
    }
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    const market = await this.getByTokenId(tokenId);
    if (!market) {
      this.logger.info('service::TradeService updateMarketAmount error, cannot get market by uid & tokenId: %j', { uid, tokenId });
      return -1;
    }
    // 查看用户token余额
    const token_balance = await this.service.token.mineToken.balanceOf(uid, tokenId);
    if (token_balance < amount) {
      this.logger.error('service::TradeService updateMarket error token_balance < amount, ', { token_balance, amount });
      return -2;
    }
    const conn = await this.app.mysql.beginTransaction();
    const exchange_uid = market.exchange_uid;
    // 转移资产
    const transferResult = await this.service.token.mineToken.transferFrom(tokenId, uid, exchange_uid, amount, '', consts.mineTokenTransferTypes.direct_trade, conn);
    // 转移资产失败
    if (!transferResult) {
      await conn.rollback();
      this.logger.error('service::TradeService updateMarket error, transfer token error, Result: %j', transferResult);
      return -3;
    }
    const row = {
      amount: market.amount + amount,
      update_time: now,
    };
    try {
      const result = conn.update('direct_trade_market', row, {
        where: { id: market.id },
      });
      await conn.commit();
      this.logger.info('service::TradeService updateMarket success, result: %j', result);
      return market.id;
    } catch (error) {
      await conn.rollback();
      this.logger.error('service::TradeService updateMarket  error: %j', error);
      return -4;
    }
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

  /**
   * 直接购买添加交易日志
   * @param {*} {
   *     uid,  // 购买者
   *     marketId,  // 交易市场ID
   *     amount, // 购买数量
   *   }
   * @param {*} conn mysql事务
   * @return {*} 返回添加是否成功
   * @memberof directTradeService
   */
  async createLog({ uid, marketId, amount }, conn) {
    const market = await this.app.mysql.get('direct_trade_market', { id: marketId });
    if (!market) {
      this.logger.info('service::TradeService createLog error, cannot get market id: %j', { marketId });
      return -1;
    }
    const { token_id, price } = market;
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    const result = await conn.insert('direct_trade_log', {
      uid,
      token_id,
      market_id: marketId,
      price,
      amount,
      create_time: now,
    });
    return result.insertId;
  }
  async getByTokenId(tokenId) {
    const market = await this.app.mysql.get('direct_trade_market', { token_id: tokenId });
    return market;
  }
  async get(id) {
    const market = await this.app.mysql.query(`
      SELECT t1.id, t1.uid, t1.token_id, t1.market, t1.price, t1.amount, t1.create_time, t1.update_time, t1.exchange_uid,
      t2.username, t2.nickname, t2.avatar,
      t3.name as token_name, t3.symbol, t3.logo
      FROM direct_trade_market t1
      LEFT JOIN users t2 ON t1.uid = t2.id
      LEFT JOIN minetokens t3 ON t1.token_id = t3.id
      WHERE t1.status = 0 AND t1.amount > 0 AND t1.id = ?;`, [ id ]);
    if (market.length <= 0) return null;
    const _market = market[0];
    console.log(_market);
    const balance = await this.service.token.mineToken.balanceOf(_market.exchange_uid, _market.token_id);
    _market.balance = balance;
    return _market;
  }
  async isMarketEnabled(tokenId) {
    const market = await this.app.mysql.get('direct_trade_market', { token_id: tokenId });
    if (!market || market.status === 1 || market.amount === 0) return null;
    return market;
  }
  /**
   * 创建虚拟账号
   * @param {*} symbol token symbol
   * @return {Number} 返回创建的uid
   * @memberof directTradeService
   */
  async createVisualUser(symbol) {
    const username = this.config.user.tradeUserPrefix + symbol;
    const platform = 'cny';
    // 虚拟账号
    let exchangeUser = await this.service.auth.getUser(username, platform);
    if (!exchangeUser) {
      try {
        await this.service.auth.insertUser(username, '', platform, 'ss', '', 'cv46BYasKvID933R', 0); // todo：确认该类账号不可从前端登录
      } catch (e) {
        this.logger.error('directTradeService.createVisualUser exception. %j', e);
        return -1;
      }
      exchangeUser = await this.service.auth.getUser(username, platform);
      await this.service.user.setAvatar('/avatar/trade.png', exchangeUser.id);
    }

    return exchangeUser.id;
  }
  /**
   * 从直接交易市场购买
   * @param {*} userId 购买者id
   * @param {*} tokenId token id
   * @param {*} cny_amount 需付款cny
   * @param {*} token_amount 购买token数量
   * @param {*} conn mysql连接
   * @return {Number} 0为成功
   * @memberof directTradeService
   */
  async buy(userId, tokenId, cny_amount, token_amount, conn) {
    /* const balance = await this.service.assets.balanceOf(market.exchange_uid, 'CNY');
    // 资产是否充足
    if (balance < token_amount) {
      await conn.rollback();
      this.logger.error('directTradeService.buy error: market balance not enough.');
      return -1;
    } */
    const market = await this.isMarketEnabled(tokenId);
    if (!market) {
      this.logger.error('directTradeService.buy error: market not exist.');
      return -1;
    }

    // 转移token， exchange_uid -> userId，直购交易所到购买者
    const transferResult = await this.service.token.mineToken.transferFrom(tokenId, market.exchange_uid, userId, token_amount, '', consts.mineTokenTransferTypes.direct_trade, conn);
    // 转移资产失败
    if (!transferResult) {
      this.logger.error('directTradeService.buy exception. transfer token error: %j', transferResult);
      return -2;
    }

    // 转移cny，userId -> market.uid 购买者到市场创建者
    const cnyTransferResult = await this.service.assets.transferFrom('CNY', userId, market.uid, cny_amount, conn);
    // 转移资产失败
    if (!cnyTransferResult) {
      this.logger.error('directTradeService.buy exception. transfer cny error: %j', cnyTransferResult);
      return -3;
    }
    await this.createLog({
      uid: userId, marketId: market.id, amount: token_amount,
    }, conn);

    return 0;
  }
  async list(pi, pz, orderBy, sort) {
    const orderByArr = [ 'create_time', 'update_time', 'amount', 'price' ];
    const sortArr = [ 'desc', 'asc' ];
    if (!orderBy) orderBy = 'amount';
    if (!sort) sort = 'desc';
    if (!orderByArr.includes(orderBy.toLowerCase()) || !sortArr.includes(sort.toLowerCase())) {
      return -1;
    }
    const orderByStr = `ORDER BY t1.${orderBy} ${sort}`;
    const queryResult = await this.app.mysql.query(`
      SELECT t1.id, t1.uid, t1.token_id, t1.market, t1.price, t1.amount, t1.create_time, t1.update_time,
      t2.username, t2.nickname, t2.avatar,
      t3.name as token_name, t3.symbol, t3.logo
      FROM direct_trade_market t1
      LEFT JOIN users t2 ON t1.uid = t2.id
      LEFT JOIN minetokens t3 ON t1.token_id = t3.id
      WHERE t1.status = 0 AND t1.amount > 0
      ${orderByStr} LIMIT ? ,? ;
      SELECT count(*) as count from direct_trade_market WHERE status = 0 AND amount > 0;
    `, [ (pi - 1) * pz, 1 * pz ]);
    const list = queryResult[0];
    const count = queryResult[1][0].count;
    return {
      list,
      count,
    };
  }
}

module.exports = directTradeService;
