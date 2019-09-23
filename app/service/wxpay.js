'use strict';

const Service = require('egg').Service;
const nanoid = require('nanoid');

class WxpayService extends Service {
  /* constructor(ctx) {
    super(ctx);
    const config = {
      appid: this.config.wxpay.appId,
      mchid: this.config.wxpay.mchId,
      partnerKey: this.config.wxpay.partnerKey,
      // pfx: require('fs').readFileSync('证书文件路径'),
      notify_url: this.config.wxpay.notify_url,
      // spbill_create_ip: 'IP地址',
    };
    // 调试模式(传入第二个参数为true, 可在控制台输出数据)
    const wxpay = new tenpay(config, true);
    this.wxpay = wxpay;
  } */
  // unifiedOrder: 微信统一下单
  async unifiedOrder() {
    const { wxpay } = this;
    const result = await wxpay.unifiedOrder({
      out_trade_no: '商户内部订单号',
      body: '商品简单描述',
      total_fee: '订单金额(分)',
      openid: '用户openid',
    });
    return result;
  }
  // 企业付款
  async transfers(openid, amount, desc) {
    const { ctx } = this;
    const ip = ctx.ips.length > 0 ? ctx.ips[0] !== '127.0.0.1' ? ctx.ips[0] : ctx.ips[1] : ctx.ip;
    const payargs = await this.app.wxpay.transfers({
      partner_trade_no: ctx.helper.genCharacterNumber(31), // 商户订单号，需保持唯一性
      openid: '', // 用户openid
      check_name: 'NO_CHECK', // 校验用户姓名选项 NO_CHECK：不校验真实姓名 , FORCE_CHECK：强校验真实姓名
      amount: parseFloat(amount) * 100, // 	企业付款金额，单位为分
      desc, // 企业付款备注
      spbill_create_ip: ip, // Ip地址
    });
  }
  // 退款
  async refund(out_trade_no, total_fee, refund_fee) {
    const { ctx } = this;
    // TODO 查找订单号
    const payargs = await this.app.wxpay.refund({
      out_trade_no, // 商户订单号
      out_refund_no: nanoid(31), // 商户退款单号
      total_fee: parseFloat(total_fee) * 100, // 订单金额，传入单位元
      refund_fee: parseFloat(refund_fee) * 100, // 退款金额，传入单位元
    });
  }
}

module.exports = WxpayService;
