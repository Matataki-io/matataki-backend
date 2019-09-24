'use strict';
const Service = require('egg').Service;
const moment = require('moment');
const DEADLINE = 300; // 超时时间300秒

class ExchangeService extends Service {
  async createOrder(order) {
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    const deadline = parseInt(moment().format('X')) + DEADLINE; // 设置unix时间戳
    const result = await this.app.mysql.query(
      'INSERT INTO exchange_orders(uid, token_id, cny_amount, token_amount, type, trade_no, openid, status, create_time, deadline, min_liquidity, max_tokens, min_tokens, recipient, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [ order.uid, order.token_id, order.cny_amount, order.token_amount, order.type, order.trade_no, order.openid, order.status, now, deadline, order.min_liquidity, order.max_tokens, order.min_tokens, order.recipient, order.ip ]
    );
    const createSuccess = (result.affectedRows !== 0);
    return createSuccess;
  }
  async createOrderByInput(order) {
    /* const { ctx } = this;
    await this.createOrder({
      uid: ctx.user.id, // 用户id
      token_id: 'symbol', // 购买的token id
      cny_amount: total,
      token_amount: '',
      type: 'buy_token', // 类型：add，buy_token，sale_token
      trade_no: order.out_trade_no, // 订单号
      openid: '',
      status: 0, // 状态，0初始，3支付中，6支付成功，9处理完成
      min_liquidity: 0, // 资金池pool最小流动性
      max_tokens: 0, // output为准，最多获得CNY
      min_tokens: 0, // input为准时，最少获得Token
      recipient: ctx.user.id, // 接收者
    }); */
  }
  async createOrderByOutput(order) {

  }
  async createOrderByPool(order) {

  }
}
module.exports = ExchangeService;