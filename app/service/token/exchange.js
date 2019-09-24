'use strict';
const moment = require('moment');
const consts = require('../consts');
const Service = require('egg').Service;

class ExchangeService extends Service {

  async create(tokenId) {
    const exchange = await this.getExchange(tokenId);
    // 已经存在交易对
    if (exchange) {
      return -1;
    }

    // 虚拟账号
    let exchangeUser = await this.service.auth.getUser('cny_' + tokenId, 'cny');
    if (!exchangeUser) {
      await this.service.auth.insertUser('cny_' + tokenId, '', 'cny', 'ss', '', 'cv46BYasKvID933R', 0); // todo：确认该类账号不可从前端登录
      exchangeUser = await this.service.auth.getUser('cny_' + tokenId, 'cny');
    }

    // 创建交易对
    await this.service.mysql.query('INSERT exchanges (token_id, total_supply, create_time, exchange_uid) VALUES(?,?,?,?,?,?);',
      [ tokenId, 0, moment().format('YYYY-MM-DD HH:mm:ss'), exchangeUser.id ] // 指定exchange_uid
    );
  }

  async getExchange(tokenId) {
    const exchange = await this.app.mysql.get('exchanges', { token_id: tokenId });
    return exchange;
  }

  // 订单支付成功的情况下调用
  // 不存在部分退款
  // todo：精度问题
  async addLiquidity(orderId) {
    const conn = await this.app.mysql.beginTransaction();
    try {
      // 锁定订单，更新锁，悲观锁
      const result = await conn.query('SELECT * FROM exchange_orders WHERE id = ? AND status = 6 AND type=\'add\' FOR UPDATE;', [ orderId ]);
      if (!result || result.length <= 0) {
        await conn.rollback();
        return -1;
      }

      const order = result[0];

      // 超时，需要退还做市商的钱
      const timestamp = Math.floor(Date.now() / 1000);
      if (order.deadline < timestamp) {
        await conn.query('UPDATE exchange_orders SET status = 7 WHERE id = ?;', [ orderId ]); // todo：还是给他放到他的余额里面，然后提现？？？
        conn.commit();
        return -1;
      }

      // 更新exchange_orders
      const resultUpdOrder = await conn.query('UPDATE exchange_orders SET status = 9 WHERE id = ?;', [ orderId ]);
      if (resultUpdOrder.affectedRows <= 0) {
        await conn.rollback();
        return -1;
      }

      const userId = order.uid;
      const tokenId = order.token_id;
      // min_liquidity：页面上显示的推算出的做市商份额的最小值
      const min_liquidity = order.min_liquidity;
      // max_tokens：页面上显示的做市商支付的token最大值
      const max_tokens = order.max_tokens;
      // cnyAmount：微信订单实际支付的CNY金额
      const cny_amount = order.cny_amount;

      let exchange = null;
      // 锁定交易对，悲观锁
      const resultExchange = await conn.query('SELECT token_id, total_supply, token_amount, cny_amount, exchange_uid FROM exchanges WHERE token_id=? FOR UPDATE;', [ tokenId ]);
      if (resultExchange && resultExchange.length > 0) {
        exchange = resultExchange[0];
      }

      // 增加liquidity
      if (exchange && exchange.total_supply > 0) {
        const total_liquidity = exchange.total_supply;

        // 非首次add，按照当前的价格计算出token数量
        const token_amount = cny_amount * exchange.token_amount / exchange.cny_amount + 1;
        // 计算实际份额
        const liquidity_minted = cny_amount * total_liquidity / exchange.cny_amount;
        // 不满足token最大值和份额最小值条件
        if (max_tokens < token_amount || liquidity_minted < min_liquidity) {
          await conn.query('UPDATE exchange_orders SET status = 7 WHERE id = ?;', [ orderId ]); // todo：还是给他放到他的余额里面，然后提现？？？
          await conn.commit();
          this.logger.debug('ExchangeService.addLiquidity失败，不满足token最大值和份额最小值条件，j%', orderId);
          return -1; // 退回做市商的钱
        }

        // 转移资产
        const transferResult = await this.service.token.mineToken.transferFrom(tokenId, userId, exchange.exchange_uid, token_amount, '', conn);
        // 转移资产失败，回滚
        if (!transferResult) {
          await conn.rollback();
          // conn已经结束，另起一个sql事务退还做市商的钱
          // await this.app.mysql.query('UPDATE exchange_orders SET status = 7 WHERE id = ?;', [ orderId ]);// todo：还是给他放到他的余额里面，然后提现？？？
          return -1;
        }

        // 处理cny
        await this.service.assets.recharge(userId, 'CNY', cny_amount, conn);
        const cnyTransferResult = await this.service.assets.transferFrom('CNY', userId, exchange.exchange_uid, cny_amount, '', conn);
        // 转移资产失败，回滚
        if (!cnyTransferResult) {
          await conn.rollback();
          return -1;
        }

        // 扩大交易池
        await conn.query('UPDATE exchanges SET total_supply = total_supply + ?, token_amount=token_amount + ?, cny_amount = cny_amount + ? WHERE token_id = ?;',
          [ liquidity_minted, token_amount, cny_amount, tokenId ]
        );

        // 增加份额
        await conn.query('INSERT INTO exchange_balances(uid, token_id, liquidity_balance, create_time) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE liquidity_balance = liquidity_balance + ?;',
          [ userId, tokenId, liquidity_minted, moment().format('YYYY-MM-DD HH:mm:ss'), liquidity_minted ]
        );

        conn.commit();
      } else { // 首次add
        const token_amount = order.token_amount;
        const initial_liquidity = order.cny_amount;

        // 转移token
        const transferResult = await this.service.token.mineToken.transferFrom(tokenId, userId, exchange.exchange_uid, token_amount, '', conn);
        // 转移资产失败，回滚
        if (!transferResult) {
          await conn.rollback();
          // conn已经结束，另起一个sql事务退还做市商的钱
          await this.app.mysql.query('UPDATE exchange_orders SET status = 7 WHERE id = ?;', [ orderId ]);// todo：退款？还是给他放到他的余额里面，然后提现？？？
          return -1;
        }

        // 处理cny
        await this.service.assets.recharge(userId, 'CNY', cny_amount, conn);
        const cnyTransferResult = await this.service.assets.transferFrom('CNY', userId, exchange.exchange_uid, cny_amount, '', conn);
        // 转移资产失败，回滚
        if (!cnyTransferResult) {
          await conn.rollback();
          return -1;
        }

        // 添加交易池
        await conn.query('UPDATE exchanges SET total_supply = total_supply + ?, token_amount=token_amount + ?, cny_amount = cny_amount + ? WHERE token_id = ?;',
          [ initial_liquidity, token_amount, cny_amount, tokenId ]
        );

        // 增加份额
        await conn.query('INSERT INTO exchange_balances(uid, token_id, liquidity_balance, create_time) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE liquidity_balance = liquidity_balance + ?;',
          [ userId, tokenId, initial_liquidity, moment().format('YYYY-MM-DD HH:mm:ss'), initial_liquidity ]
        );

        conn.commit();
      }
      return 0;
    } catch (e) {
      // 有一种可能，两笔订单同时进来，代码同时走到首次add initial_liquidity，一笔订单会失败，这笔订单回退到status=6，成为问题订单，需要再次调用addLiquidity方法触发增加liquidity逻辑
      await conn.rollback();
      this.logger.error('FungibleToken.mint exception. %j', e);
      return -1;
    }
  }

  // amount是什么？是与cny 1:1 换算的供应量
  async removeLiquidity(userId, tokenId, amount, min_cny, min_tokens, deadline) {
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
      const cny_amount = amount * cny_reserve / total_liquidity;
      // 计算出token数量
      const token_amount = amount * token_reserve / total_liquidity;

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
      const tokenTransferResult = await this.service.token.mineToken.transferFrom(tokenId, exchange.exchange_uid, userId, token_amount, conn);
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

      conn.commit();

      return 0;
    } catch (e) {
      // 有一种可能，两笔订单同时进来，代码同时走到首次add initial_liquidity，一笔订单会失败，这笔订单回退到status=6，成为问题订单，需要再次调用addLiquidity方法触发增加liquidity逻辑
      await conn.rollback();
      this.logger.error('FungibleToken.mint exception. %j', e);
      return -1;
    }
  }

  // 以输入为准计算输出的数量
  async getInputPrice(input_amount, input_reserve, output_reserve) {
    if (input_reserve <= 0 || output_reserve <= 0) {
      return -1;
    }

    const input_amount_with_fee = input_amount * 997;
    const numerator = input_amount_with_fee * output_reserve;
    const denominator = (input_reserve * 1000) + input_amount_with_fee;
    return numerator / denominator;
  }

  // 以输出为准计算输入的数量
  async getOutputPrice(output_amount, input_reserve, output_reserve) {
    if (input_reserve <= 0 || output_reserve <= 0) {
      return -1;
    }

    const numerator = input_reserve * output_amount * 1000;
    const denominator = (output_reserve - output_amount) * 997;
    return numerator / denominator + 1;
  }

  // 通过cny兑换token，以cny数量为准
  async cnyToTokenInput(orderId) {
    const conn = await this.app.mysql.beginTransaction();
    try {
      // 锁定订单，更新锁，悲观锁
      const result = await conn.query('SELECT * FROM exchange_orders WHERE id = ? AND status = 6 AND type=\'buy_token\' FOR UPDATE;', [ orderId ]);
      if (!result || result.length <= 0) {
        await conn.rollback();
        return -1;
      }

      const order = result[0];

      // 超时，需要退钱
      const timestamp = Math.floor(Date.now() / 1000);
      if (order.deadline < timestamp) {
        await conn.query('UPDATE exchange_orders SET status = 7 WHERE id = ?;', [ orderId ]); // todo：还是给他放到他的余额里面，然后提现？？？
        conn.commit();
        return -1;
      }

      const userId = order.uid;
      const tokenId = order.token_id;
      // min_tokens：页面上显示的可以购买到的最小值
      const min_tokens = order.min_tokens;
      // cnyAmount：微信订单实际支付的CNY金额
      const cny_sold = order.cny_amount;

      // 锁定交易对，悲观锁
      const resultExchange = await conn.query('SELECT token_id, total_supply, token_amount, cny_amount, exchange_uid FROM exchanges WHERE token_id=? FOR UPDATE;', [ tokenId ]);
      // 没有交易对，退钱
      if (!resultExchange || resultExchange.length <= 0) {
        await conn.query('UPDATE exchange_orders SET status = 7 WHERE id = ?;', [ orderId ]); // todo：还是给他放到他的余额里面，然后提现？？？
        conn.commit();
        return -1;
      }

      const exchange = resultExchange[0];

      const tokens_bought = this.getInputPrice(cny_sold, exchange.cny_amount, exchange.token_amount);

      // 可兑换的token数量不满足最小值，退钱
      if (tokens_bought < min_tokens) {
        await conn.query('UPDATE exchange_orders SET status = 7 WHERE id = ?;', [ orderId ]); // todo：还是给他放到他的余额里面，然后提现？？？
        conn.commit();
        return -1;
      }

      // 更新exchange_orders
      const resultUpdOrder = await conn.query('UPDATE exchange_orders SET status = 9 WHERE id = ?;', [ orderId ]);
      if (resultUpdOrder.affectedRows <= 0) {
        await conn.rollback();
        return -1;
      }

      // 转移token
      const transferResult = await this.service.token.mineToken.transferFrom(tokenId, exchange.exchange_uid, order.recipient, tokens_bought, '', conn);
      // 转移资产失败，回滚
      if (!transferResult) {
        await conn.rollback();
        return -1;
      }

      // 处理cny
      await this.service.assets.recharge(userId, 'CNY', cny_sold, consts.assetTypes.recharge, conn);
      const cnyTransferResult = await this.service.assets.transferFrom('CNY', userId, exchange.exchange_uid, cny_sold, '', conn);
      // 转移资产失败，回滚
      if (!cnyTransferResult) {
        await conn.rollback();
        return -1;
      }

      return 0;
    } catch (e) {
      await conn.rollback();
      this.logger.error('Exchange.cnyToTokenInput exception. %j', e);
      return -1;
    }
  }

  async cnyToTokenOutput(orderId) {
    // 通过cny兑换token，以token数量为准，因为会产生退款，暂不实现
  }

  async tokenToCnyInput(userId, tokenId, tokens_sold, min_cny, deadline, recipient, ip) {
    // 因为不存在等待打包，基本上是实时的交易，所以这里的deadline仅仅是形式而已
    const timestamp = Math.floor(Date.now() / 1000);
    if (deadline < timestamp) {
      return -1;
    }

    // 锁定exchanges
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

      const token_reserve = await this.service.token.mineToken.balanceOf(exchange.exchange_uid, tokenId);

      const cny_reserve = await this.service.assets.balanceOf(exchange.exchange_uid, 'CNY');

      const cny_bought = this.getInputPrice(tokens_sold, token_reserve, cny_reserve);

      if (cny_bought < min_cny) {
        await conn.rollback();
        return -1;
      }

      // 转移token
      const tokenTransferResult = await this.service.token.mineToken.transferFrom(tokenId, userId, exchange.exchange_uid, tokens_sold, ip, conn);
      if (!tokenTransferResult) {
        await conn.rollback();
        return -1;
      }

      // 转移cny
      const cnyTransferResult = await this.service.assets.transferFrom('CNY', exchange.exchange_uid, recipient, cny_bought, '', conn);
      // 转移资产失败，回滚
      if (!cnyTransferResult) {
        await conn.rollback();
        return -1;
      }

      // todo orders里面插入订单

      conn.commit();

      return 0;
    } catch (e) {
      // 有一种可能，两笔订单同时进来，代码同时走到首次add initial_liquidity，一笔订单会失败，这笔订单回退到status=6，成为问题订单，需要再次调用addLiquidity方法触发增加liquidity逻辑
      await conn.rollback();
      this.logger.error('FungibleToken.mint exception. %j', e);
      return -1;
    }
  }

  async tokenToCnyOutput() {

  }

  async tokenToTokenInput() {
    // 稍后实现
  }

  async tokenToTokenOutput() {

  }

  // 计算使用cny兑换token的数量，以输入的cny数量为准
  async getCnyToTokenInputPrice(tokenId, cny_sold) {
    if (cny_sold <= 0) {
      return -1;
    }

    const exchange = await this.getExchange(tokenId);

    const token_reserve = await this.service.token.mineToken.balanceOf(exchange.exchange_uid, tokenId);

    const cny_reserve = await this.service.token.mineToken.balanceOf(exchange.exchange_uid, this.config.exchange.cnyTokenId);

    return this.getInputPrice(cny_sold, cny_reserve, token_reserve, cny_reserve);
  }

  // 计算使用cny兑换token的数量，以输出的token数量为准
  async getCnyToTokenOutputPrice(tokenId, tokens_bought) {
    if (tokens_bought <= 0) {
      return -1;
    }

    const exchange = await this.getExchange(tokenId);

    const token_reserve = await this.service.token.mineToken.balanceOf(exchange.exchange_uid, tokenId);

    const cny_reserve = await this.service.token.mineToken.balanceOf(exchange.exchange_uid, this.config.exchange.cnyTokenId);

    return this.getOutputPrice(tokens_bought, cny_reserve, token_reserve);
  }

}

module.exports = ExchangeService;