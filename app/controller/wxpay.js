'use strict';

const Controller = require('../core/base_controller');
const nanoid = require('nanoid');

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
    const { total, openid } = ctx.request.body; // total单位为元
    const ip = ctx.ips.length > 0 ? ctx.ips[0] !== '127.0.0.1' ? ctx.ips[0] : ctx.ips[1] : ctx.ip;
    const order = {
      body: '瞬充值中心-粉丝币',
      out_trade_no: nanoid(31), // 订单号 唯一id商户系统内部订单号，要求32个字符内，只能是数字、大小写字母_-|* 且在同一个商户号下唯一。
      total_fee: Math.floor(total * 100), // 微信最小单位是分
      spbill_create_ip: ip, // 请求的ip地址
      openid,
      trade_type: 'JSAPI',
    };
    const payargs = await this.app.wxpay.getBrandWCPayRequestParams(order);
    this.ctx.body = payargs;
  }
  async notify() {
    const { ctx } = this;
    const { out_trade_no } = ctx.request.body;// 订单号
    ctx.logger.info('wxpay notify info', out_trade_no);
  }
  async login() {
    const { ctx } = this;
    const { code } = ctx.request.body; // total单位为元
    const { appId, appSecret } = this.config.wechat;
    const result = await ctx.curl(`https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`, {
      // 自动解析 JSON response
      dataType: 'json',
      // 3 秒超时
      // timeout: 3000,
    });
    this.ctx.body = result.data;
  }
}

module.exports = WxPayController;
