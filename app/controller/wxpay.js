'use strict';

const Controller = require('../core/base_controller');
const nanoid = require('nanoid');

const typeOptions = {
  add: 'add',
  buy_token: 'buy_token',
  sale_token: 'sale_token',
};

class WxPayController extends Controller {

  /* // 接口回调
  async notify() {
    const { ctx } = this;
    const info = ctx.request.weixin;
    ctx.logger.info('wxpay notify info', info);
    // 业务逻辑...

    // 回复消息(参数为空回复成功, 传值则为错误消息)
    ctx.reply('错误消息' || '');
  }

  async pay() {
    const { ctx } = this;
    await ctx.service.wxpay.unifiedOrder();
  } */

  async pay() {
    const { ctx } = this;
    const { total, title, type } = ctx.request.body; // total单位为元，type类型见typeOptions：add，buy_token，sale_token
    const ip = ctx.ips.length > 0 ? ctx.ips[0] !== '127.0.0.1' ? ctx.ips[0] : ctx.ips[1] : ctx.ip;
    const order = {
      body: title,
      out_trade_no: nanoid(31), // 订单号 唯一id商户系统内部订单号，要求32个字符内，只能是数字、大小写字母_-|* 且在同一个商户号下唯一。
      total_fee: Math.floor(total * 100), // 微信最小单位是分
      spbill_create_ip: ip, // 请求的ip地址
      // openid,
      // trade_type: 'JSAPI',
      trade_type: 'NATIVE',
      product_id: 'DDT',
    };
    // 创建订单，status为0
    const createSuccess = await ctx.service.exchange.createOrder({
      uid: ctx.user.id, // 用户id
      token_id: 'symbol', // 购买的token id
      cny_amount: total,
      token_amount: '',
      type: typeOptions[type], // 类型：add，buy_token，sale_token
      trade_no: order.out_trade_no, // 订单号
      openid: '',
      status: 0, // 状态，0初始，3支付中，6支付成功，9处理完成
      min_liquidity: 0, // 资金池pool最小流动性
      max_tokens: 0, // output为准，最多获得CNY
      min_tokens: 0, // input为准时，最少获得Token
      recipient: ctx.user.id, // 接收者
      ip, // ip
    });
    ctx.logger.info('controller wxpay pay params', order);
    // 创建失败直接返回错误
    if (!createSuccess) {
      ctx.body = ctx.msg.failure;
      return;
    }
    // 微信统一下单
    const payargs = await this.app.wxpay.getBrandWCPayRequestParams(order);
    ctx.logger.info('controller wxpay pay result', payargs);
    if (payargs.code_url) {
      // 更新订单状态为‘支付中’：3
      await ctx.service.exchange.setStatusPending(order.out_trade_no);
      ctx.body = {
        ...payargs,
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
    const { return_code, out_trade_no } = ctx.request.body;// 订单号
    ctx.logger.info('wxpay notify info', out_trade_no, ctx.request.body);
    // 支付成功
    if (return_code === 'SUCCESS') {
      // 修改订单状态
      await ctx.service.exchange.setStatusPayed(out_trade_no);
      const order = await ctx.service.exchange.getOrderBytradeNo(out_trade_no);
      const orderId = order.id;
      const type = order.type;
      switch (typeOptions[type]) {
        case 'add': // 添加流动性
          await ctx.service.token.exchange.addLiquidity(orderId);
          break;
        case 'buy_token': // 购买token
          break;
        case 'sale_token': // 出售token
          break;
        default:
          ctx.body = ctx.msg.failure;
      }
    }
  }
  async login() {
    const { ctx } = this;
    const { code } = ctx.request.body; // total单位为元
    const { appId, appSecret } = this.config.wechat;
    ctx.logger.info('controller wxpay login start', code, appId, appSecret);
    const result = await ctx.curl(`https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`, {
      // 自动解析 JSON response
      dataType: 'json',
      // 3 秒超时
      // timeout: 3000,
    });
    ctx.logger.info('controller wxpay login end', result);
    this.ctx.body = result.data;
  }
  // 企业付款
  async transfers() {
    const payargs = await this.app.wxpay.transfers({
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
    // TODO 查找订单号
    const payargs = await this.app.wxpay.refund({
      out_trade_no: 'kfc001', // 商户订单号
      out_refund_no: nanoid(31), // 商户退款单号
      total_fee: 10 * 100, // 订单金额
      refund_fee: 10 * 100, // 退款金额
    });
  }
}

module.exports = WxPayController;
