'use strict';
const moment = require('moment');
const Service = require('egg').Service;

class ExchangeService extends Service {

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
      const result = await conn.query('SELECT * FROM exchanges_orders WHERE id = ? AND status = 6 FOR UPDATE;', [ orderId ]);
      if (result || result.length <= 0) {
        await conn.rollback();
        return -1;
      }

      const order = result[0];

      // 超时，需要退还做市商的钱
      const timestamp = Math.floor(Date.now() / 1000);
      if (order.deadline < timestamp) {
        await conn.query('UPDATE exchanges_orders SET status = 7 WHERE id = ?;', [ orderId ]); // todo：还是给他放到他的余额里面，然后提现？？？
        conn.commit();
        return -1;
      }

      // 更新exchanges_orders
      const resultUpdOrder = await conn.query('UPDATE exchanges_orders SET status = 9 WHERE id = ?;', [ orderId ]);
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

      // 锁定交易对，悲观锁
      const resultExchange = await conn.query('SELECT token_id, total_supply, total_token, total_cny, exchange_uid FROM exchanges WHERE token_id=? FOR UPDATE;', [ tokenId ]);

      let exchange = null;

      if (result && result.length > 0) {
        exchange = resultExchange[0];
      }

      // 增加liquidity
      if (exchange && exchange.total_supply > 0) {
        const total_liquidity = exchange.total_supply;

        // 非首次add，按照当前的价格计算出token数量
        const token_amount = cny_amount * exchange.token_amount / exchange.cny_mount + 1;
        // 计算实际份额
        const liquidity_minted = cny_amount * total_liquidity / exchange.cny_mount;
        // 不满足token最大值和份额最小值条件
        if (max_tokens < token_amount || liquidity_minted < min_liquidity) {
          await conn.query('UPDATE exchanges_orders SET status = 7 WHERE id = ?;', [ orderId ]); // todo：还是给他放到他的余额里面，然后提现？？？
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
          await this.app.mysql.query('UPDATE exchanges_orders SET status = 7 WHERE id = ?;', [ orderId ]);// todo：还是给他放到他的余额里面，然后提现？？？
          return -1;
        }

        // 扩大交易池
        await conn.query('UPDATE SET total_supply = total_supply + ?, token_amount=token_amount + ?, cny_amount = cny_amount + ? exchanges WHERE token_id = ?',
          [ liquidity_minted, token_amount, cny_amount, tokenId ]
        );

        // 增加份额
        await conn.query('INSERT INTO exchanges_balance(uid, token_id, liquidity_balance) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?;',
          [ userId, tokenId, liquidity_minted ]
        );

        conn.commit();
      } else { // 首次add
        const token_amount = exchange.token_amount;
        const initial_liquidity = exchange.cny_mount;

        // 转移资产
        const transferResult = await this.service.token.mineToken.transferFrom(tokenId, userId, exchange.exchange_uid, token_amount, '', conn);
        // 转移资产失败，回滚
        if (!transferResult) {
          await conn.rollback();
          // conn已经结束，另起一个sql事务退还做市商的钱
          await this.app.mysql.query('UPDATE exchanges_orders SET status = 7 WHERE id = ?;', [ orderId ]);// todo：还是给他放到他的余额里面，然后提现？？？
          return -1;
        }

        // 创建交易池
        await conn.query('INSERT exchanges (token_id, total_supply, token_amount, cny_amount, create_time, exchange_uid) VALUES(?,?,?,?,?,?);',
          [ tokenId, initial_liquidity, token_amount, cny_amount, moment().format('YYYY-MM-DD HH:mm:ss'), 1048 ] // todo: 指定 exchange_uid
        );

        // 增加份额
        await conn.query('INSERT INTO exchanges_balance(uid, token_id, liquidity_balance) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?;',
          [ userId, tokenId, initial_liquidity ]
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

  async removeLiquidity() {

  }

  async cnyToTokenInput() {

  }

  async cnyToTokenOutput() {

  }


  async tokenToCnyInput() {

  }

  async tokenToCnyOutput() {

  }

  async tokenToTokenInput() {

  }

  async tokenToTokenOutput() {

  }

  async getInputPrice() {

  }

  async getOutputPrice() {

  }


}

module.exports = ExchangeService;
