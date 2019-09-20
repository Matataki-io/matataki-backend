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
    ctx.logger.info('controller wxpay pay params', order);
    // 创建微信订单
    const payargs = await this.app.wxpay.getBrandWCPayRequestParams(order);
    ctx.logger.info('controller wxpay pay result', payargs);
    // 插入数据库
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
    if (createSuccess) {
      this.ctx.body = {
        ...payargs,
      };
    } else {
      this.ctx.body = ctx.msg.failure;
    }
  }
  async notify() {
    const { ctx } = this;
    const { out_trade_no } = ctx.request.body;// 订单号
    // 把订单改成支付成功
    ctx.logger.info('wxpay notify info', out_trade_no);
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
}

module.exports = WxPayController;
