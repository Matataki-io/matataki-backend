'use strict';

const Controller = require('../core/base_controller');
const nanoid = require('nanoid');

const typeOptions = {
  add: 'add',
  buy_token_input: 'buy_token_input',
  buy_token_output: 'buy_token_output',
  sale_token: 'sale_token',
};

class WxPayController extends Controller {
  async createOrder() {
    const { ctx } = this;
    // total: 输入的cny数值，单位元
    // type类型见typeOptions：add，buy_token，sale_token
    // token_amount: 输出的token的数值
    // limit_value：极限值
    // pay_cny_amount扣除余额后微信实际支付的金额
    const { total, type, token_id, token_amount, limit_value, min_liquidity = 0, pay_cny_amount } = ctx.request.body;
    const ip = ctx.ips.length > 0 ? ctx.ips[0] !== '127.0.0.1' ? ctx.ips[0] : ctx.ips[1] : ctx.ip;
    const token = await ctx.service.token.mineToken.get(token_id);
    if (!token) {
      ctx.body = ctx.msg.failure;
      return;
    }
    const out_trade_no = ctx.helper.genCharacterNumber(31);
    const max_tokens = 0;
    const min_tokens = limit_value;
    // 创建订单，status为0
    const createSuccess = await ctx.service.exchange.createOrder({
      uid: ctx.user.id, // 用户id
      token_id, // 购买的token id
      cny_amount: total,
      pay_cny_amount,
      token_amount,
      type: typeOptions[type], // 类型：add，buy_token，sale_token
      trade_no: out_trade_no, // 订单号
      openid: '',
      status: 0, // 状态，0初始，3支付中，6支付成功，9处理完成
      min_liquidity, // 资金池pool最小流动性，type = add
      max_tokens, // output为准，最多获得CNY，type = sale_token
      min_tokens, // input为准时，最少获得Token，type = buy_token
      recipient: ctx.user.id, // 接收者
      ip, // ip
    });
    // 创建失败直接返回错误
    if (!createSuccess) {
      ctx.body = ctx.msg.failure;
      return;
    }
    ctx.body = {
      ...ctx.msg.success,
      data: out_trade_no,
    };
  }
  async wxpay() {
    const { ctx } = this;
    const { tradeNo, trade_type = 'NATIVE', openid = null } = ctx.request.body;
    const out_trade_no = tradeNo;
    const { type, token_id, pay_cny_amount, status } = await ctx.service.exchange.getOrderBytradeNo(tradeNo);
    // 6 9都代表支付成功 7 8 失败
    if (status >= 6) {
      ctx.body = ctx.msg.orderHandled;
      return;
    }
    const { symbol, decimals } = await ctx.service.token.mineToken.get(token_id);
    const ip = ctx.ips.length > 0 ? ctx.ips[0] !== '127.0.0.1' ? ctx.ips[0] : ctx.ips[1] : ctx.ip;
    let title = '';
    if (type === 'buy_token_output' || type === 'buy_token_input') {
      title = `购买${symbol}`;
    } else if (title === 'add') {
      title = '添加流动性';
    }
    // 如果订单金额小于0元
    if (pay_cny_amount <= 0) {
      ctx.body = {
        timeStamp: Math.floor(Date.now() / 1000),
        trade_no: out_trade_no,
      };
      return;
    }
    // pay_cny_amount扣除余额后微信实际支付的金额
    const total_fee = Math.floor(pay_cny_amount / Math.pow(10, parseInt(decimals) - 2));
    let order = {
      out_trade_no, // 订单号 唯一id商户系统内部订单号，要求32个字符内，只能是数字、大小写字母_-|* 且在同一个商户号下唯一。
      body: title,
      total_fee, // 微信最小单位是分
      spbill_create_ip: ip, // 请求的ip地址
    };
    ctx.logger.info('controller wxpay pay params', order);
    let payargs = {};
    if (trade_type === 'JSAPI') {
      order = {
        ...order,
        openid,
      };
      // 获取微信JSSDK支付参数
      payargs = await this.app.tenpay.getPayParams(order);
    } else {
      order = {
        ...order,
        trade_type,
        product_id: symbol,
      };
      // 微信统一下单
      payargs = await this.app.tenpay.unifiedOrder(order);
    }
    ctx.logger.info('controller wxpay pay result', payargs);
    if (payargs.appId || payargs.appid) {
      // 更新订单状态为‘支付中’：3
      await ctx.service.exchange.setStatusPending(order.out_trade_no);
      ctx.body = {
        // eslint-disable-next-line no-bitwise
        timeStamp: '' + (Date.now() / 1000 | 0),
        ...payargs,
        trade_no: order.out_trade_no,
      };
    } else {
      ctx.body = ctx.msg.failure;
    }
  }
  async wxpayArticle() {
    const { ctx } = this;
    const { tradeNo, title = '购买文章', trade_type = 'NATIVE', openid = null } = ctx.request.body;
    const out_trade_no = tradeNo;
    const { amount, status } = await ctx.service.shop.orderHeader.get(ctx.user.id, tradeNo);
    // 6 9都代表支付成功 7 8 失败
    if (status >= 6) {
      ctx.body = ctx.msg.orderHandled;
      return;
    }
    const pay_cny_amount = amount;
    const notify_url = this.config.aritclePay.notify_url;
    // eslint-disable-next-line no-bitwise
    const timeStamp = '' + (Date.now() / 1000 | 0);
    const ip = ctx.ips.length > 0 ? ctx.ips[0] !== '127.0.0.1' ? ctx.ips[0] : ctx.ips[1] : ctx.ip;
    // 如果订单金额小于0元
    if (pay_cny_amount <= 0) {
      ctx.body = {
        timeStamp,
        trade_no: out_trade_no,
      };
      return;
    }
    // pay_cny_amount扣除余额后微信实际支付的金额
    const total_fee = Math.floor(pay_cny_amount / 100);
    let order = {
      out_trade_no, // 订单号 唯一id商户系统内部订单号，要求32个字符内，只能是数字、大小写字母_-|* 且在同一个商户号下唯一。
      body: title,
      total_fee, // 微信最小单位是分
      spbill_create_ip: ip, // 请求的ip地址
      notify_url,
    };
    ctx.logger.info('controller wxpay pay params', order);
    let payargs = {};
    if (trade_type === 'JSAPI') {
      order = {
        ...order,
        openid,
      };
      // 获取微信JSSDK支付参数
      payargs = await this.app.tenpay.getPayParams(order);
    } else {
      order = {
        ...order,
        trade_type,
        product_id: 10000,
      };
      // 微信统一下单
      payargs = await this.app.tenpay.unifiedOrder(order);
    }
    ctx.logger.info('controller wxpay pay result', payargs);
    if (payargs.appId || payargs.appid) {
      // 更新订单状态为‘支付中’：3
      await ctx.service.shop.orderHeader.setStatusPaying(order.out_trade_no);
      ctx.body = {
        timeStamp,
        ...payargs,
        trade_no: order.out_trade_no,
      };
    } else {
      ctx.body = ctx.msg.failure;
    }
  }
  async payArticleNotify() {
    const { ctx } = this;
    const { result_code, return_code, out_trade_no } = ctx.request.weixin;
    ctx.logger.info('WxPayController payArticleNotify', out_trade_no, ctx.request.weixin);
    if (return_code === 'SUCCESS' && result_code === 'SUCCESS') {
      await ctx.service.shop.orderHeader.paySuccessful(out_trade_no);
      ctx.set('Content-Type', 'text/xml');
      ctx.body = `<xml>
                    <return_code><![CDATA[SUCCESS]]></return_code>
                    <return_msg><![CDATA[OK]]></return_msg>
                  </xml>`;
    }
  }
  async getOrder() {
    const { ctx } = this;
    const { id } = ctx.params;
    const result = await ctx.service.exchange.getOrderBytradeNo(id);
    const token = await ctx.service.token.mineToken.get(result.token_id);
    ctx.body = {
      ...ctx.msg.success,
      data: {
        order: result,
        token,
      },
    };
  }
  async pay() {
    const { ctx } = this;
    // total: 输入的cny数值，单位元
    // type类型见typeOptions：add，buy_token，sale_token
    // token_amount: 输出的token的数值
    // limit_value：极限值
    // pay_cny_amount扣除余额后微信实际支付的金额
    const { total, title, type, token_id, token_amount, limit_value, decimals, min_liquidity = 0, pay_cny_amount, trade_type = 'NATIVE', openid = null } = ctx.request.body;
    const ip = ctx.ips.length > 0 ? ctx.ips[0] !== '127.0.0.1' ? ctx.ips[0] : ctx.ips[1] : ctx.ip;
    const token = await ctx.service.token.mineToken.get(token_id);
    if (!token) {
      ctx.body = ctx.msg.failure;
      return;
    }
    const out_trade_no = ctx.helper.genCharacterNumber(31);
    const max_tokens = 0;
    const min_tokens = limit_value;
    // 创建订单，status为0
    const createSuccess = await ctx.service.exchange.createOrder({
      uid: ctx.user.id, // 用户id
      token_id, // 购买的token id
      cny_amount: total,
      pay_cny_amount,
      token_amount,
      type: typeOptions[type], // 类型：add，buy_token，sale_token
      trade_no: out_trade_no, // 订单号
      openid: '',
      status: 0, // 状态，0初始，3支付中，6支付成功，9处理完成
      min_liquidity, // 资金池pool最小流动性，type = add
      max_tokens, // output为准，最多获得CNY，type = sale_token
      min_tokens, // input为准时，最少获得Token，type = buy_token
      recipient: ctx.user.id, // 接收者
      ip, // ip
    });
    // 创建失败直接返回错误
    if (!createSuccess) {
      ctx.body = ctx.msg.failure;
      return;
    }
    // 如果订单金额小于0元
    if (pay_cny_amount <= 0) {
      ctx.body = {
        timeStamp: Math.floor(Date.now() / 1000),
        trade_no: out_trade_no,
      };
      return;
    }
    // pay_cny_amount扣除余额后微信实际支付的金额
    const total_fee = Math.floor(pay_cny_amount / Math.pow(10, parseInt(decimals) - 2));
    let order = {
      out_trade_no, // 订单号 唯一id商户系统内部订单号，要求32个字符内，只能是数字、大小写字母_-|* 且在同一个商户号下唯一。
      body: title,
      total_fee, // 微信最小单位是分
      spbill_create_ip: ip, // 请求的ip地址
    };
    ctx.logger.info('controller wxpay pay params', order);
    let payargs = {};
    if (trade_type === 'JSAPI') {
      order = {
        ...order,
        openid,
      };
      // 获取微信JSSDK支付参数
      payargs = await this.app.tenpay.getPayParams(order);
    } else {
      order = {
        ...order,
        trade_type,
        product_id: token.symbol,
      };
      // 微信统一下单
      payargs = await this.app.tenpay.unifiedOrder(order);
    }
    ctx.logger.info('controller wxpay pay result', payargs);
    if (payargs.appId || payargs.appid) {
      // 更新订单状态为‘支付中’：3
      await ctx.service.exchange.setStatusPending(order.out_trade_no);
      ctx.body = {
        // eslint-disable-next-line no-bitwise
        timeStamp: '' + (Date.now() / 1000 | 0),
        ...payargs,
        trade_no: order.out_trade_no,
      };
    } else {
      ctx.body = ctx.msg.failure;
    }
  }
  async notify() {
    const { ctx } = this;
    // 示例
    /*
    { appid: 'wx95829b6a2307300b',
      bank_type: 'CFT',
      cash_fee: '1',
      fee_type: 'CNY',
      is_subscribe: 'Y',
      mch_id: '1555776841',
      nonce_str: 'k7ZUTkvMcATA77lO81ANT0z4t3wbN7Hs',
      openid: 'oH_q_wQMBPr_FUTuAL3YA2nDQMMg',
      out_trade_no: '7r5txag1-l4ApcFHAHata7x6aPMUylW',
      result_code: 'SUCCESS',
      return_code: 'SUCCESS',
      sign: '957757312951F6298941D17D1BEBDDF6',
      time_end: '20190924165102',
      total_fee: '1',
      trade_type: 'NATIVE',
      transaction_id: '4200000416201909240710109485'
    }*/
    const { result_code, return_code, out_trade_no } = ctx.request.weixin;
    ctx.logger.info('wxpay notify info', out_trade_no, ctx.request.weixin);
    // 支付成功
    if (return_code === 'SUCCESS' && result_code === 'SUCCESS') {
      // 修改订单状态
      await ctx.service.exchange.setStatusPayed(out_trade_no);
      const order = await ctx.service.exchange.getOrderBytradeNo(out_trade_no);
      const orderId = order.id;
      const type = order.type;
      ctx.set('Content-Type', 'text/xml');
      switch (typeOptions[type]) {
        case 'add': // 添加流动性
          await ctx.service.token.exchange.addLiquidityOrder(orderId);
          break;
        case 'buy_token_input': // 购买token
          await ctx.service.token.exchange.cnyToTokenInputOrder(orderId);
          break;
        case 'buy_token_output': // 购买token
          await ctx.service.token.exchange.cnyToTokenOutputOrder(orderId);
          break;
        default: {
          ctx.body = `<xml>
                        <return_code><![CDATA[FAIL]]></return_code>
                        <return_msg><![CDATA[update error]]></return_msg>
                      </xml>`;
          return;
        }
      }
      ctx.body = `<xml>
                    <return_code><![CDATA[SUCCESS]]></return_code>
                    <return_msg><![CDATA[OK]]></return_msg>
                  </xml>`;
    }
  }
  async login() {
    const { ctx } = this;
    const { code } = ctx.request.body;
    /* {
      "access_token":"ACCESS_TOKEN",
      "expires_in":7200,
      "refresh_token":"REFRESH_TOKEN",
      "openid":"OPENID",
      "scope":"SCOPE"
    } */
    const accessTokenResult = await ctx.service.wechat.getAccessToken(code);
    if (accessTokenResult.data.errcode) {
      ctx.body = {
        ...ctx.msg.generateTokenError,
        data: accessTokenResult.data,
      };
      return;
    }
    ctx.body = accessTokenResult.data;
  }
  // 企业付款
  async transfers() {
    const payargs = await this.app.tenpay.transfers({
      partner_trade_no: 'kfc003', // 商户订单号，需保持唯一性
      openid: '', // 用户openid
      check_name: 'NO_CHECK', // 校验用户姓名选项 NO_CHECK：不校验真实姓名 , FORCE_CHECK：强校验真实姓名
      amount: 10 * 100, // 	企业付款金额，单位为分
      desc: '', // 企业付款备注
      spbill_create_ip: '', // Ip地址
    });
  }
  // 退款
  async refund() {
    const { ctx } = this;
    const { out_trade_no, total_fee, refund_fee } = ctx.request.body;
    ctx.logger.info('controller refund params', out_trade_no, total_fee, refund_fee);
    const result = await ctx.service.wxpay.refund(out_trade_no, total_fee, refund_fee);
    ctx.logger.info('controller refund result', result);
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }
  async refundNotify() {
    const { ctx } = this;
    const { return_code, out_trade_no } = ctx.request.weixin;// 订单号
    ctx.logger.info('wxpay notify info', out_trade_no, ctx.request.weixin);
    ctx.body = `<xml>
                  <return_code><![CDATA[SUCCESS]]></return_code>
                  <return_msg><![CDATA[OK]]></return_msg>
                </xml>`;
    if (return_code === 'SUCCESS') {
      ctx.body = `<xml>
                    <return_code><![CDATA[SUCCESS]]></return_code>
                    <return_msg><![CDATA[OK]]></return_msg>
                  </xml>`;
    }
  }
}

module.exports = WxPayController;
