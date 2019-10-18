'use strict';
const moment = require('moment');
const Service = require('egg').Service;
const consts = require('../consts');
const virtualUserPrefix = 'exchange_';

class ExchangeService extends Service {

  /*
  TODO list
  √ tokenToToken
  √ 精度问题，token和cny都默认精度为4，即1元cny=10000
  √ CNY账号不要插入ES
  √ 控制发行上限1亿
  √ Output为准计算
  √ 验证tokenToTokenOutput、cnyToTokenOutputOrder

    失败直接退款

    控制谁可以发币

    buy_token 改为 buy_token_input

    大数问题，所有的计算在node中计算，使用bignumber.js，数据库使用varchar存储，到时可以放开发行量和decimals
  */

  /*
  与区块链不同的地方是：用户支付的金额，先充值到自己的账号，然后转到到交易对虚拟账号
  而区块链用户支付的eth，天然进入交易对地址
  */

  async create(tokenId) {
    const token = await this.service.token.mineToken.get(tokenId);
    if (!token) {
      return -1;
    }

    const exchange = await this.getExchange(tokenId);
    // 已经存在交易对
    if (exchange) {
      return -2;
    }

    const username = virtualUserPrefix + tokenId;
    const platform = consts.platforms.cny;
    // 虚拟账号
    let exchangeUser = await this.service.auth.getUser(username, platform);
    if (!exchangeUser) {
      try {
        await this.service.auth.insertUser(username, '', platform, 'ss', '', 'cv46BYasKvID933R', 0); // todo：确认该类账号不可从前端登录
      } catch (e) {
        this.logger.error('ExchangeService.create exception. %j', e);
      }
      exchangeUser = await this.service.auth.getUser(username, platform);
    }

    // 创建交易对
    const result = await this.app.mysql.query('INSERT exchanges (token_id, total_supply, create_time, exchange_uid) VALUES(?,?,?,?);',
      [ tokenId, 0, moment().format('YYYY-MM-DD HH:mm:ss'), exchangeUser.id ] // 指定exchange_uid
    );

    return result.insertId;
  }

  async getExchange(tokenId) {
    const exchange = await this.app.mysql.get('exchanges', { token_id: tokenId });
    return exchange;
  }

  async detail(tokenId) {
    const exchange = await this.getExchange(tokenId);
    if (!exchange) {
      return null;
    }

    const token_reserve = await this.service.token.mineToken.balanceOf(exchange.exchange_uid, tokenId);
    const cny_reserve = await this.service.assets.balanceOf(exchange.exchange_uid, 'CNY');

    // exchangeRate = tokenToCnyInput
    exchange.token_reserve = token_reserve;
    exchange.cny_reserve = cny_reserve;

    return exchange;
  }

  // exchanges.total_supply 只有addLiquidity和removeLiquidity时才会改变
  // 订单支付成功的情况下调用
  // 不存在部分退款
  async addLiquidityOrder(orderId) {
    const conn = await this.app.mysql.beginTransaction();
    try {
      // 锁定订单，更新锁，悲观锁
      const result = await conn.query('SELECT * FROM exchange_orders WHERE id = ? AND status = 6 AND type=\'add\' FOR UPDATE;', [ orderId ]);
      if (!result || result.length <= 0) {
        await conn.rollback();
        return -1;
      }

      const order = result[0];
      const userId = order.uid;
      const tokenId = order.token_id;
      // min_liquidity：页面上显示的推算出的做市商份额的最小值
      const min_liquidity = order.min_liquidity;
      // max_tokens：页面上显示的做市商支付的token最大值
      const max_tokens = order.max_tokens;
      // cnyAmount：微信订单实际支付的CNY金额
      const cny_amount = order.cny_amount;
      const token_amount = order.token_amount;
      const deadline = order.deadline;

      // 订单付款成功，给用户充值
      await this.service.assets.recharge(userId, 'CNY', cny_amount, conn);

      const res = await this.addLiquidity(userId, tokenId, cny_amount, token_amount, min_liquidity, max_tokens, deadline, conn);
      if (res < 0) {
        conn.rollback();
        // 交易失败，另起一个事务退钱
        await this.app.mysql.query('UPDATE exchange_orders SET status = 7 WHERE id = ?;', [ orderId ]);
        await this.refundOrder(orderId);
        return -1;
      }

      // 更新exchange_orders
      await conn.query('UPDATE exchange_orders SET status = 9 WHERE id = ?;', [ orderId ]);

      await conn.commit();
      return 0;
    } catch (e) {
      // 有一种可能，两笔订单同时进来，代码同时走到首次add initial_liquidity，一笔订单会失败，这笔订单回退到status=6，成为问题订单，需要再次调用addLiquidity方法触发增加liquidity逻辑
      await conn.rollback();
      this.logger.error('ExchangeService.addLiquidity exception. %j', e);
      // 交易失败，另起一个事务退钱
      await this.app.mysql.query('UPDATE exchange_orders SET status = 7 WHERE id = ?;', [ orderId ]);
      await this.refundOrder(orderId);
      return -1;
    }
  }

  async addLiquidity(userId, tokenId, cny_amount, token_amount, min_liquidity, max_tokens, deadline, conn) {
    // 超时，需要退还做市商的钱
    const timestamp = Math.floor(Date.now() / 1000);
    if (deadline < timestamp) {
      return -1;
    }

    // 如果交易对不存在，首先创建交易对
    await this.create(tokenId);

    // 锁定交易对，悲观锁
    const exchangeResult = await conn.query('SELECT token_id, total_supply, exchange_uid FROM exchanges WHERE token_id=? FOR UPDATE;', [ tokenId ]);
    if (!exchangeResult || exchangeResult.length <= 0) {
      return -1;
    }
    const exchange = exchangeResult[0];

    // 增加liquidity
    if (exchange.total_supply > 0) {
      const total_liquidity = exchange.total_supply;

      const token_reserve = await this.service.token.mineToken.balanceOf(exchange.exchange_uid, tokenId);
      const cny_reserve = await this.service.assets.balanceOf(exchange.exchange_uid, 'CNY');

      // 非首次add，按照当前的价格计算出token数量
      token_amount = cny_amount * token_reserve / cny_reserve + 1;
      // 计算实际份额，如果池子里现有的cny多（也就是有人来拿cny买token），那么liquidity_minted就会变小，也就是同样往池子里打入10000 cny，视cny_reserve多少份额不一样
      // 你打入的钱按照池子里现有的cny_reserve来计算你的份额
      const liquidity_minted = parseInt(cny_amount * total_liquidity / cny_reserve);

      // 不满足token最大值和份额最小值条件
      if (max_tokens < token_amount || liquidity_minted < min_liquidity) {
        return -1;
      }

      // 转移资产
      const transferResult = await this.service.token.mineToken.transferFrom(tokenId, userId, exchange.exchange_uid, token_amount, '', consts.mineTokenTransferTypes.exchange_addliquidity, conn);
      // 转移资产失败
      if (!transferResult) {
        return -1;
      }

      // 转移cny
      const cnyTransferResult = await this.service.assets.transferFrom('CNY', userId, exchange.exchange_uid, cny_amount, conn);
      // 转移cny失败
      if (!cnyTransferResult) {
        return -1;
      }

      // 扩大交易池
      await conn.query('UPDATE exchanges SET total_supply = total_supply + ? WHERE token_id = ?;',
        [ liquidity_minted, tokenId ]
      );

      // 增加份额
      await conn.query('INSERT INTO exchange_balances(uid, token_id, liquidity_balance, create_time) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE liquidity_balance = liquidity_balance + ?;',
        [ userId, tokenId, liquidity_minted, moment().format('YYYY-MM-DD HH:mm:ss'), liquidity_minted ]
      );

      await this.addLiquidityLog(userId, tokenId, cny_amount, token_amount, liquidity_minted, '', conn);
    } else {
      // 首次add
      const initial_liquidity = cny_amount;

      // 转移token
      const transferResult = await this.service.token.mineToken.transferFrom(tokenId, userId, exchange.exchange_uid, token_amount, '', consts.mineTokenTransferTypes.exchange_addliquidity, conn);
      // 转移资产失败
      if (!transferResult) {
        return -1;
      }

      // 转移cny
      const cnyTransferResult = await this.service.assets.transferFrom('CNY', userId, exchange.exchange_uid, cny_amount, conn);
      // 转移资产失败
      if (!cnyTransferResult) {
        return -1;
      }

      // 添加交易池
      await conn.query('UPDATE exchanges SET total_supply = total_supply + ? WHERE token_id = ?;',
        [ initial_liquidity, tokenId ]
      );

      // 增加份额
      await conn.query('INSERT INTO exchange_balances(uid, token_id, liquidity_balance, create_time) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE liquidity_balance = liquidity_balance + ?;',
        [ userId, tokenId, initial_liquidity, moment().format('YYYY-MM-DD HH:mm:ss'), initial_liquidity ]
      );

      await this.addLiquidityLog(userId, tokenId, cny_amount, token_amount, initial_liquidity, '', conn);
    }

    return 0;
  }

  // amount是什么？是以cny衡量的份额
  async removeLiquidity(userId, tokenId, amount, min_cny, min_tokens, deadline, ip) {
    amount = parseInt(amount);
    min_cny = parseInt(min_cny);
    min_tokens = parseInt(min_tokens);

    // 因为不存在等待打包，基本上是实时的交易，所以这里的deadline仅仅是形式而已
    const timestamp = Math.floor(Date.now() / 1000);
    if (deadline < timestamp) {
      return -1;
    }

    if (min_cny <= 0 || min_tokens <= 0) {
      return -1;
    }

    const conn = await this.app.mysql.beginTransaction();
    try {

      let exchange = null;
      // 锁定交易对，这里一定要锁住，防止remove的同时，有人先add
      const result = await conn.query('SELECT token_id, total_supply, exchange_uid FROM exchanges WHERE token_id=? FOR UPDATE;', [ tokenId ]);
      if (!result || result.length <= 0) {
        await conn.rollback();
        return -1;
      }
      exchange = result[0];

      const total_liquidity = exchange.total_supply;

      const token_reserve = await this.service.token.mineToken.balanceOf(exchange.exchange_uid, tokenId);
      const cny_reserve = await this.service.assets.balanceOf(exchange.exchange_uid, 'CNY');
      // 根据用户remove的amount数量计算出cny数量
      const cny_amount = parseInt(amount * cny_reserve / total_liquidity);
      // 计算出token数量
      const token_amount = parseInt(amount * token_reserve / total_liquidity);

      if (cny_amount < min_cny || token_amount < min_tokens) {
        await conn.rollback();
        return -1;
      }

      // 减少个人份额
      const balanceResult = await conn.query('UPDATE exchange_balances SET liquidity_balance = liquidity_balance - ? WHERE uid = ? AND token_id = ? AND liquidity_balance >= ?;',
        [ amount, userId, tokenId, amount ]
      );
      if (balanceResult.affectedRows <= 0) {
        await conn.rollback();
        return -1;
      }

      // 减少total_supply
      const exchangeResult = await conn.query('UPDATE exchanges SET total_supply = total_supply - ? WHERE token_id = ? AND total_supply >= ?;',
        [ amount, tokenId, amount ]
      );
      if (exchangeResult.affectedRows <= 0) {
        await conn.rollback();
        return -1;
      }

      // 转移token
      const tokenTransferResult = await this.service.token.mineToken.transferFrom(tokenId, exchange.exchange_uid, userId, token_amount, ip, consts.mineTokenTransferTypes.exchange_removeliquidity, conn);
      if (!tokenTransferResult) {
        await conn.rollback();
        return -1;
      }

      // 转移cny
      const cnyTransferResult = await this.service.assets.transferFrom('CNY', exchange.exchange_uid, userId, cny_amount, conn);
      if (!cnyTransferResult) {
        await conn.rollback();
        return -1;
      }

      await this.addLiquidityLog(userId, tokenId, cny_amount, token_amount, -amount, ip, conn);

      conn.commit();

      return 0;
    } catch (e) {
      // 有一种可能，两笔订单同时进来，代码同时走到首次add initial_liquidity，一笔订单会失败，这笔订单回退到status=6，成为问题订单，需要再次调用addLiquidity方法触发增加liquidity逻辑
      await conn.rollback();
      this.logger.error('ExchangeService.removeLiquidity exception. %j', e);
      return -1;
    }
  }

  // 以输入为准计算输出的数量
  getInputPrice(input_amount, input_reserve, output_reserve) {
    if (input_reserve <= 0 || output_reserve <= 0) {
      return -1;
    }

    // input_amount = parseInt(input_amount);
    // if (input_amount >= input_reserve) {
    //   return -2;
    // }

    const input_amount_with_fee = input_amount * 997;
    const numerator = input_amount_with_fee * output_reserve;
    const denominator = (input_reserve * 1000) + input_amount_with_fee;
    return parseInt(numerator / denominator);
  }

  // 以输出为准计算输入的数量
  getOutputPrice(output_amount, input_reserve, output_reserve) {
    if (input_reserve <= 0 || output_reserve <= 0) {
      return -1;
    }

    output_amount = parseInt(output_amount);
    if (output_amount >= output_reserve) {
      return -2;
    }

    const numerator = input_reserve * output_amount * 1000;
    const denominator = (output_reserve - output_amount) * 997;
    return parseInt(numerator / denominator + 1);
  }

  // cny兑换token，微信付款订单
  async cnyToTokenInputOrder(orderId) {
    const conn = await this.app.mysql.beginTransaction();
    try {
      // 锁定订单，更新锁，悲观锁
      const result = await conn.query('SELECT * FROM exchange_orders WHERE id = ? AND status = 6 AND type=\'buy_token_input\' FOR UPDATE;', [ orderId ]); // todo: buy_token 改为 buy_token_input
      if (!result || result.length <= 0) {
        await conn.rollback();
        return -1;
      }
      const order = result[0];
      const userId = order.uid;
      const tokenId = order.token_id;
      // min_tokens：页面上显示的可以购买到的最小值
      const min_tokens = order.min_tokens;
      // cnyAmount：微信订单实际支付的CNY金额
      const cny_sold = order.cny_amount;

      // 订单付款成功，给用户充值
      await this.service.assets.recharge(userId, 'CNY', cny_sold, conn);

      const res = await this.cnyToTokenInput(userId, tokenId, cny_sold, min_tokens, order.deadline, order.recipient, conn);
      if (res < 0) {
        // 回滚
        conn.rollback();
        // 交易失败，另起一个事务退钱
        await this.app.mysql.query('UPDATE exchange_orders SET status = 7 WHERE id = ?;', [ orderId ]);
        await this.refundOrder(orderId);
        return -1;
      }

      // 更新exchange_orders
      const updOrderResult = await conn.query('UPDATE exchange_orders SET status = 9 WHERE id = ?;', [ orderId ]);
      if (updOrderResult.affectedRows <= 0) {
        await conn.rollback();
        return -1;
      }

      await conn.commit();
      return 0;
    } catch (e) {
      await conn.rollback();
      this.logger.error('Exchange.cnyToTokenInput exception. %j', e);
      // 交易失败，另起一个事务退钱
      await this.app.mysql.query('UPDATE exchange_orders SET status = 7 WHERE id = ?;', [ orderId ]);
      await this.refundOrder(orderId);
      return -1;
    }
  }

  // 通过cny兑换token，以输入的cny数量为准
  async cnyToTokenInput(userId, tokenId, cny_sold, min_tokens, deadline, recipient, conn) {
    cny_sold = parseInt(cny_sold);
    min_tokens = parseInt(min_tokens);

    // 超时
    const timestamp = Math.floor(Date.now() / 1000);
    if (deadline < timestamp) {
      return -1;
    }

    // 锁定交易对，悲观锁
    const exchangeResult = await conn.query('SELECT token_id, total_supply, exchange_uid FROM exchanges WHERE token_id=? FOR UPDATE;', [ tokenId ]);
    // 没有交易对
    if (!exchangeResult || exchangeResult.length <= 0) {
      return -1;
    }
    const exchange = exchangeResult[0];

    const token_reserve = await this.service.token.mineToken.balanceOf(exchange.exchange_uid, tokenId);
    const cny_reserve = await this.service.assets.balanceOf(exchange.exchange_uid, 'CNY');
    const tokens_bought = this.getInputPrice(cny_sold, cny_reserve, token_reserve);

    // 可兑换的token数量不满足最小值
    if (tokens_bought < min_tokens) {
      return -1;
    }

    // 转移token
    const transferResult = await this.service.token.mineToken.transferFrom(tokenId, exchange.exchange_uid, recipient, tokens_bought, '', consts.mineTokenTransferTypes.exchange_purchase, conn);
    // 转移资产失败
    if (!transferResult) {
      return -1;
    }

    // 转移cny
    const cnyTransferResult = await this.service.assets.transferFrom('CNY', userId, exchange.exchange_uid, cny_sold, conn);
    // 转移资产失败
    if (!cnyTransferResult) {
      return -1;
    }

    await this.addPurchaseLog(userId, 0, cny_sold, tokenId, tokens_bought, recipient, '', conn);

    return 0;
  }

  // 通过cny兑换token，以token数量为准，因为会产生退款
  async cnyToTokenOutputOrder(orderId) {
    const conn = await this.app.mysql.beginTransaction();
    try {
      // 锁定订单，更新锁，悲观锁
      const result = await conn.query('SELECT * FROM exchange_orders WHERE id = ? AND status = 6 AND type=\'buy_token_output\' FOR UPDATE;', [ orderId ]);
      if (!result || result.length <= 0) {
        await conn.rollback();
        return -1;
      }
      const order = result[0];
      const userId = order.uid;
      const tokenId = order.token_id;

      // 页面上显示的购买数量
      const tokens_bought = order.token_amount;
      // 微信订单实际支付的CNY金额
      const cny_sold = order.cny_amount;

      // 订单付款成功，给用户充值
      await this.service.assets.recharge(userId, 'CNY', cny_sold, conn);

      const res = await this.cnyToTokenOutput(userId, tokenId, tokens_bought, cny_sold, order.deadline, order.recipient, conn);
      if (res < 0) {
        // 回滚
        conn.rollback();
        // 交易失败，另起一个事务退钱
        await this.app.mysql.query('UPDATE exchange_orders SET status = 7 WHERE id = ?;', [ orderId ]);
        await this.refundOrder(orderId);
        return -1;
      }

      // 更新exchange_orders
      const updOrderResult = await conn.query('UPDATE exchange_orders SET status = 9 WHERE id = ?;', [ orderId ]);
      if (updOrderResult.affectedRows <= 0) {
        await conn.rollback();
        return -1;
      }

      await conn.commit();
      return 0;
    } catch (e) {
      await conn.rollback();
      this.logger.error('Exchange.cnyToTokenOutputOrder exception. %j', e);
      // 交易失败，另起一个事务退钱
      await this.app.mysql.query('UPDATE exchange_orders SET status = 7 WHERE id = ?;', [ orderId ]);
      await this.refundOrder(orderId);
      return -1;
    }
  }

  // max_cny 订单转入金额，可能存在退款
  async cnyToTokenOutput(userId, tokenId, tokens_bought, max_cny, deadline, recipient, conn) {
    tokens_bought = parseInt(tokens_bought);
    max_cny = parseInt(max_cny);

    const timestamp = Math.floor(Date.now() / 1000);
    if (deadline < timestamp) {
      return -1;
    }

    // 锁定交易对，悲观锁
    const exchangeResult = await conn.query('SELECT token_id, total_supply, exchange_uid FROM exchanges WHERE token_id=? FOR UPDATE;', [ tokenId ]);
    // 没有交易对
    if (!exchangeResult || exchangeResult.length <= 0) {
      return -1;
    }
    const exchange = exchangeResult[0];

    const token_reserve = await this.service.token.mineToken.balanceOf(exchange.exchange_uid, tokenId);
    const cny_reserve = await this.service.assets.balanceOf(exchange.exchange_uid, 'CNY');

    // 计算需要的cny数量
    const cny_sold = this.getOutputPrice(tokens_bought, cny_reserve, token_reserve);
    if (cny_sold <= 0) {
      return -1;
    }

    // 保证不能超过 本次订单支付的金额/tokenToTokenOutput中转的金额
    if (cny_sold > max_cny) {
      return -1;
    }

    // 转移token
    const transferResult = await this.service.token.mineToken.transferFrom(tokenId, exchange.exchange_uid, recipient, tokens_bought, '', consts.mineTokenTransferTypes.exchange_purchase, conn);
    // 转移资产失败
    if (!transferResult) {
      return -1;
    }

    // 转移cny
    const cnyTransferResult = await this.service.assets.transferFrom('CNY', userId, exchange.exchange_uid, cny_sold, conn);
    // 转移资产失败
    if (!cnyTransferResult) {
      return -1;
    }

    await this.addPurchaseLog(userId, 0, cny_sold, tokenId, tokens_bought, recipient, '', conn);

    return 0;
  }

  // 通过token兑换cny，以输入的token数量为准
  async tokenToCnyInput(userId, tokenId, tokens_sold, min_cny, deadline, recipient, ip) {
    tokens_sold = parseInt(tokens_sold);
    min_cny = parseInt(min_cny);

    // 因为不存在等待打包，基本上是实时的交易，所以这里的deadline仅仅是形式而已
    const timestamp = Math.floor(Date.now() / 1000);
    if (deadline < timestamp) {
      return -1;
    }

    // 锁定exchanges
    const conn = await this.app.mysql.beginTransaction();
    try {
      // 锁定交易对
      const result = await conn.query('SELECT token_id, total_supply, exchange_uid FROM exchanges WHERE token_id=? FOR UPDATE;', [ tokenId ]);
      if (!result || result.length <= 0) {
        await conn.rollback();
        return -1;
      }
      const exchange = result[0];

      const token_reserve = await this.service.token.mineToken.balanceOf(exchange.exchange_uid, tokenId);
      const cny_reserve = await this.service.assets.balanceOf(exchange.exchange_uid, 'CNY');
      const cny_bought = this.getInputPrice(tokens_sold, token_reserve, cny_reserve);

      if (cny_bought < min_cny) {
        await conn.rollback();
        return -1;
      }

      // 转移token
      const tokenTransferResult = await this.service.token.mineToken.transferFrom(tokenId, userId, exchange.exchange_uid, tokens_sold, ip, consts.mineTokenTransferTypes.exchange_purchase, conn);
      if (!tokenTransferResult) {
        await conn.rollback();
        return -1;
      }

      // 转移cny
      const cnyTransferResult = await this.service.assets.transferFrom('CNY', exchange.exchange_uid, recipient, cny_bought, conn);
      // 转移资产失败，回滚
      if (!cnyTransferResult) {
        await conn.rollback();
        return -1;
      }

      await this.addPurchaseLog(userId, tokenId, tokens_sold, 0, cny_bought, recipient, ip, conn);

      conn.commit();
      return 0;
    } catch (e) {
      await conn.rollback();
      this.logger.error('ExchangeService.tokenToCnyInput exception. %j', e);
      return -1;
    }
  }

  // 通过token兑换cny，以输出的cny数量为准
  async tokenToCnyOutput(userId, tokenId, cny_bought, max_tokens, deadline, recipient, ip) {
    cny_bought = parseInt(cny_bought);
    max_tokens = parseInt(max_tokens);

    // 因为不存在等待打包，基本上是实时的交易，所以这里的deadline仅仅是形式而已
    const timestamp = Math.floor(Date.now() / 1000);
    if (deadline < timestamp) {
      return -1;
    }

    // 锁定exchanges
    const conn = await this.app.mysql.beginTransaction();
    try {
      // 锁定交易对
      const result = await conn.query('SELECT token_id, total_supply, exchange_uid FROM exchanges WHERE token_id=? FOR UPDATE;', [ tokenId ]);
      if (!result || result.length <= 0) {
        await conn.rollback();
        return -1;
      }
      const exchange = result[0];

      const token_reserve = await this.service.token.mineToken.balanceOf(exchange.exchange_uid, tokenId);
      const cny_reserve = await this.service.assets.balanceOf(exchange.exchange_uid, 'CNY');
      const tokens_sold = this.getOutputPrice(cny_bought, token_reserve, cny_reserve);

      if (tokens_sold > max_tokens) {
        await conn.rollback();
        return -1;
      }

      // 转移token
      const tokenTransferResult = await this.service.token.mineToken.transferFrom(tokenId, userId, exchange.exchange_uid, tokens_sold, ip, consts.mineTokenTransferTypes.exchange_purchase, conn);
      if (!tokenTransferResult) {
        await conn.rollback();
        return -1;
      }

      // 转移cny
      const cnyTransferResult = await this.service.assets.transferFrom('CNY', exchange.exchange_uid, recipient, cny_bought, conn);
      // 转移资产失败，回滚
      if (!cnyTransferResult) {
        await conn.rollback();
        return -1;
      }

      await this.addPurchaseLog(userId, tokenId, tokens_sold, 0, cny_bought, recipient, ip, conn);

      conn.commit();
      return 0;
    } catch (e) {
      await conn.rollback();
      this.logger.error('ExchangeService.tokenToCnyOutput exception. %j', e);
      return -1;
    }
  }

  // 使用token兑换token
  // tokens_sold：要卖出的inTokenId数量
  // min_tokens_bought：要买入的outTokenId最小数量
  async tokenToTokenInput(userId, inTokenId, tokens_sold, min_tokens_bought, deadline, recipient, outTokenId, ip) {
    tokens_sold = parseInt(tokens_sold);
    min_tokens_bought = parseInt(min_tokens_bought);

    // 因为不存在等待打包，基本上是实时的交易，所以这里的deadline仅仅是形式而已
    const timestamp = Math.floor(Date.now() / 1000);
    if (deadline < timestamp) {
      return -1;
    }

    if (inTokenId <= 0 || inTokenId === outTokenId) {
      return -1;
    }

    const conn = await this.app.mysql.beginTransaction();
    try {
      const exchangeResult = await conn.query('SELECT token_id, total_supply, exchange_uid FROM exchanges WHERE token_id=? FOR UPDATE;', [ inTokenId ]);
      if (!exchangeResult || exchangeResult.length <= 0) {
        await conn.commit();
        return -1;
      }
      const exchange = exchangeResult[0];

      const token_reserve = await this.service.token.mineToken.balanceOf(exchange.exchange_uid, inTokenId);
      const cny_reserve = await this.service.assets.balanceOf(exchange.exchange_uid, 'CNY');
      const cny_bought = this.getInputPrice(tokens_sold, token_reserve, cny_reserve);

      // 把用户的in token转移到交易对虚拟账号
      const tokenTransferResult = await this.service.token.mineToken.transferFrom(inTokenId, userId, exchange.exchange_uid, tokens_sold, ip, consts.mineTokenTransferTypes.exchange_purchase, conn);
      if (!tokenTransferResult) {
        await conn.rollback();
        return -1;
      }

      await this.addPurchaseLog(userId, inTokenId, tokens_sold, 0, cny_bought, exchange.exchange_uid, ip, conn);

      // 使用交易对虚拟账号帮用户购买out token
      const res = await this.cnyToTokenInput(exchange.exchange_uid, outTokenId, cny_bought, min_tokens_bought, deadline, recipient, conn);
      if (res < 0) {
        await conn.rollback();
        return -1;
      }

      await conn.commit();
      return 0;
    } catch (e) {
      await conn.rollback();
      this.logger.error('Exchange.tokenToTokenInput exception. %j', e);
      return -1;
    }
  }

  // 使用token兑换token
  // tokens_bought：要买入的outTokenId数量
  // max_tokens_sold：要卖出的inTokenId最大数量
  async tokenToTokenOutput(userId, inTokenId, tokens_bought, max_tokens_sold, deadline, recipient, outTokenId, ip) {
    tokens_bought = parseInt(tokens_bought);
    max_tokens_sold = parseInt(max_tokens_sold);

    const timestamp = Math.floor(Date.now() / 1000);
    if (deadline < timestamp) {
      return -1;
    }

    if (inTokenId <= 0 || inTokenId === outTokenId) {
      return -1;
    }

    const conn = await this.app.mysql.beginTransaction();
    try {
      const exchangeResult = await conn.query('SELECT token_id, total_supply, exchange_uid FROM exchanges WHERE token_id=? FOR UPDATE;', [ inTokenId ]);
      if (!exchangeResult || exchangeResult.length <= 0) {
        await conn.commit();
        return -1;
      }
      const exchange = exchangeResult[0];

      // 1. 计算兑换这些out Token需要的cny数量cny_bought
      const cny_bought = await this.getCnyToTokenOutputPrice(outTokenId, tokens_bought);
      if (cny_bought <= 0) { // 出错了
        await conn.rollback();
        return -1;
      }

      // 2. 计算获得这些cny数量cny_bought需要卖多少in token
      const token_reserve = await this.service.token.mineToken.balanceOf(exchange.exchange_uid, inTokenId);
      const cny_reserve = await this.service.assets.balanceOf(exchange.exchange_uid, 'CNY');
      const tokens_sold = await this.getOutputPrice(cny_bought, token_reserve, cny_reserve);
      if (tokens_sold <= 0 || tokens_sold > max_tokens_sold) {
        await conn.rollback();
        return -1;
      }

      // 3. 把用户的in token转移到交易对虚拟账号
      const tokenTransferResult = await this.service.token.mineToken.transferFrom(inTokenId, userId, exchange.exchange_uid, tokens_sold, ip, consts.mineTokenTransferTypes.exchange_purchase, conn);
      if (!tokenTransferResult) {
        await conn.rollback();
        return -1;
      }

      await this.addPurchaseLog(userId, inTokenId, tokens_sold, 0, cny_bought, exchange.exchange_uid, ip, conn);

      // 4. 使用in token交易对虚拟账号帮用户购买out token
      const res = await this.cnyToTokenOutput(exchange.exchange_uid, outTokenId, tokens_bought, cny_bought, deadline, recipient, conn);
      if (res < 0) {
        await conn.rollback();
        return -1;
      }

      await conn.commit();
      return 0;
    } catch (e) {
      await conn.rollback();
      this.logger.error('Exchange.tokenToTokenOutput exception. %j', e);
      return -1;
    }
  }

  // 记录交易日志
  async addPurchaseLog(buyer, sold_token_id, sold_amount, bought_token_id, bought_amount, recipient, ip, conn) {
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    await conn.insert('exchange_purchase_logs', {
      buyer, sold_token_id, sold_amount, bought_token_id, bought_amount, recipient, create_time: now, ip,
    });
  }

  // 记录流动性日志
  // 交易池的流动性份额在uniswap里也是看成一种ERC20 Token，uniswap里这个token可以transfer、approval等操作。
  // 本系统没有把它当成标准的ERC20 Token处理，没有transfer、approval等操作，所以这个日志可以看成是流动性token的日志
  async addLiquidityLog(uid, token_id, cny_amount, token_amount, liquidity, ip, conn) {
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    await conn.insert('exchange_liquidity_logs', {
      uid, token_id, cny_amount, token_amount, liquidity, create_time: now, ip,
    });
  }

  async getPoolCnyToTokenPrice(tokenId, cny_amount) {
    cny_amount = parseInt(cny_amount);
    if (cny_amount <= 0) {
      return -1;
    }
    const exchange = await this.getExchange(tokenId);
    if (exchange === null) return -1;
    const token_reserve = await this.service.token.mineToken.balanceOf(exchange.exchange_uid, tokenId);
    const cny_reserve = await this.service.assets.balanceOf(exchange.exchange_uid, 'CNY');
    if (cny_reserve <= 0) {
      return -1;
    }
    // 非首次add，按照当前的价格计算出token数量
    const token_amount = cny_amount * token_reserve / cny_reserve + 1;
    return token_amount;
  }

  // 计算使用cny兑换token的数量，以输入的cny数量为准
  async getCnyToTokenInputPrice(tokenId, cny_sold) {
    cny_sold = parseInt(cny_sold);
    if (cny_sold <= 0) {
      return -1;
    }

    const exchange = await this.getExchange(tokenId);
    if (exchange === null) return -1;
    const token_reserve = await this.service.token.mineToken.balanceOf(exchange.exchange_uid, tokenId);
    const cny_reserve = await this.service.assets.balanceOf(exchange.exchange_uid, 'CNY');

    return this.getInputPrice(cny_sold, cny_reserve, token_reserve);
  }

  // 计算使用cny兑换token的数量，以输出的token数量为准
  async getCnyToTokenOutputPrice(tokenId, tokens_bought) {
    tokens_bought = parseInt(tokens_bought);
    if (tokens_bought <= 0) {
      return -1;
    }

    const exchange = await this.getExchange(tokenId);
    if (exchange === null) return -1;
    const token_reserve = await this.service.token.mineToken.balanceOf(exchange.exchange_uid, tokenId);
    const cny_reserve = await this.service.assets.balanceOf(exchange.exchange_uid, 'CNY');

    return this.getOutputPrice(tokens_bought, cny_reserve, token_reserve);
  }

  // 计算使用token兑换cny的数量，以输入的token数量为准
  async getTokenToCnyInputPrice(tokenId, tokens_sold) {
    tokens_sold = parseInt(tokens_sold);
    if (tokens_sold <= 0) {
      return -1;
    }

    const exchange = await this.getExchange(tokenId);
    if (exchange === null) return -1;
    const token_reserve = await this.service.token.mineToken.balanceOf(exchange.exchange_uid, tokenId);
    const cny_reserve = await this.service.assets.balanceOf(exchange.exchange_uid, 'CNY');

    return this.getInputPrice(tokens_sold, token_reserve, cny_reserve);
  }

  // 计算使用token兑换cny的数量，以输出的cny数量为准
  async getTokenToCnyOutputPrice(tokenId, cny_bought) {
    cny_bought = parseInt(cny_bought);
    if (cny_bought <= 0) {
      return -1;
    }

    const exchange = await this.getExchange(tokenId);
    if (exchange === null) return -1;
    const token_reserve = await this.service.token.mineToken.balanceOf(exchange.exchange_uid, tokenId);
    const cny_reserve = await this.service.assets.balanceOf(exchange.exchange_uid, 'CNY');

    return this.getOutputPrice(cny_bought, token_reserve, cny_reserve);
  }

  /* 计算token A 兑换token B 的数量，以输入的A数量为准，计算方法：
    先把token A卖掉换成cny，再用换来的cny买token B
  */
  async getTokenToTokenInputPrice(in_tokenId, out_tokenId, in_tokens_sold) {
    in_tokens_sold = parseInt(in_tokens_sold);
    const cny_bought = await this.getTokenToCnyInputPrice(in_tokenId, in_tokens_sold);
    if (cny_bought < 0) {
      return cny_bought;
    }
    const out_token_bought = await this.getCnyToTokenInputPrice(out_tokenId, cny_bought);
    return out_token_bought;
  }

  // 计算token A 兑换token B 的数量，以输出的B数量为准，计算方法：
  // 先计算买token B需要多少cny，然后再计算得到这么多cny需要卖多少token A
  async getTokenToTokenOutputPrice(in_tokenId, out_tokenId, out_tokens_bought) {
    out_tokens_bought = parseInt(out_tokens_bought);
    const cny_sold = await this.getCnyToTokenOutputPrice(out_tokenId, out_tokens_bought);
    if (cny_sold < 0) {
      return cny_sold;
    }
    const in_token_sold = await this.getTokenToCnyOutputPrice(in_tokenId, cny_sold);
    return in_token_sold;
  }

  async getCurrentPoolSize(tokenId) {
    const exchange = await this.getExchange(tokenId);
    if (exchange === null) return -1;

    const token_reserve = await this.service.token.mineToken.balanceOf(exchange.exchange_uid, tokenId);
    const cny_reserve = await this.service.assets.balanceOf(exchange.exchange_uid, 'CNY');
    return {
      cny_amount: cny_reserve,
      token_amount: token_reserve,
      total_supply: exchange.total_supply,
    };
  }

  async getYourPoolSize(uid, tokenId) {
    const exchange = await this.getExchange(tokenId);
    if (exchange === null) return -1;
    const total_liquidity = exchange.total_supply;
    const user_balance = await this.app.mysql.get('exchange_balances', { uid, token_id: tokenId });
    if (user_balance === null) {
      return {
        cny_amount: 0,
        token_amount: 0,
        your_supply: 0
      };
    }

    const liquidity_balance = user_balance.liquidity_balance;
    if (liquidity_balance <= 0) {
      return {
        cny_amount: 0,
        token_amount: 0,
        your_supply: 0
      };
    }

    const token_reserve = await this.service.token.mineToken.balanceOf(exchange.exchange_uid, tokenId);
    const cny_reserve = await this.service.assets.balanceOf(exchange.exchange_uid, 'CNY');
    // 根据用户remove的amount数量计算出cny数量
    const cny_amount = parseInt(liquidity_balance * cny_reserve / total_liquidity);
    // 计算出token数量
    const token_amount = parseInt(liquidity_balance * token_reserve / total_liquidity);
    return {
      cny_amount,
      token_amount,
      your_supply: liquidity_balance,
    };
  }

  async getYourMintToken(cny_amount, tokenId) {
    cny_amount = parseInt(cny_amount);
    const exchange = await this.getExchange(tokenId);
    if (exchange === null) return -1;
    const total_liquidity = exchange.total_supply;
    const cny_reserve = await this.service.assets.balanceOf(exchange.exchange_uid, 'CNY');

    let mint_token = 0;
    if (total_liquidity <= 0) {
      mint_token = cny_amount;
    } else {
      mint_token = parseInt(cny_amount * total_liquidity / cny_reserve);
    }
    return mint_token;
  }

  async getOutputPoolSize(amount, tokenId) {
    const exchange = await this.getExchange(tokenId);
    if (exchange === null) return -1;
    const total_liquidity = exchange.total_supply;
    const token_reserve = await this.service.token.mineToken.balanceOf(exchange.exchange_uid, tokenId);
    const cny_reserve = await this.service.assets.balanceOf(exchange.exchange_uid, 'CNY');
    const cny_amount = amount * cny_reserve / total_liquidity;
    const token_amount = amount * token_reserve / total_liquidity;
    return {
      cny_amount,
      token_amount,
    };
  }
  // 订单退款
  async refundOrder(orderId) {
    const conn = await this.app.mysql.beginTransaction();
    try {
      // 锁定订单，更新锁，悲观锁
      const result = await conn.query('SELECT * FROM exchange_orders WHERE id = ? AND status = 7 FOR UPDATE;', [ orderId ]);
      if (!result || result.length <= 0) {
        await conn.rollback();
        return -1;
      }
      const order = result[0];
      // 微信订单实际支付的CNY金额
      const cny_sold = order.cny_amount;
      const trade_no = order.trade_no;

      const res = await this.service.wxpay.refund(trade_no, cny_sold / 10000, cny_sold / 10000);
      // 申请退款接收成功，todo：处理退款结果通知，写到数据库status=10；todo：如果退款接收失败，还需要再次调用，放到schedule里面调用退款比较好
      if (res.return_code === 'SUCCESS' && res.result_code === 'SUCCESS') {
        await conn.query('UPDATE exchange_orders SET status = 8 WHERE id = ?;', [ orderId ]);
      }
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      this.logger.error('ExchangeService.refundOrder exception. %j', e);
      return -1;
    }
  }

}

module.exports = ExchangeService;
