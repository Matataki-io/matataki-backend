'use strict';

const Service = require('egg').Service;
const tenpay = require('tenpay');

class WxpayService extends Service {
  constructor(ctx) {
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
  }
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
}

module.exports = WxpayService;
