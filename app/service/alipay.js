'use strict';

const Service = require('egg').Service;
const AlipaySdk = require('alipay-sdk').default;

class AlipayService extends Service {
  constructor(ctx, app) {
    super(ctx, app);
    ctx.alipaySdk = new AlipaySdk({
      appId: this.config.alipay.APP_ID,
      privateKey: this.config.alipay.APP_PRIVATE_KEY,
      alipayPublicKey: this.config.alipay.ALIPAY_PUBLIC_KEY,
      signType: 'RSA2',
      keyType: 'PKCS8',
      gateway: this.config.alipay.gateway,
    });
  }

  /**
   * https://docs.open.alipay.com/api_1/alipay.trade.page.pay
   * 统一收单下单并支付页面接口
   * @param {*} totalAmount 订单金额
   * @param {*} subject 订单标题
   * @return {*} -
   * @memberof AlipayService
   */
  async pay(totalAmount, subject) {
    const { ctx } = this;
    const outTradeNo = ctx.helper.genCharacterNumber(31);
    console.log('outTradeNo', outTradeNo);
    const result = await ctx.alipaySdk.exec('alipay.trade.page.pay', {
      // notifyUrl: '',
      bizContent: {
        outTradeNo,
        productCode: 'FAST_INSTANT_TRADE_PAY',
        totalAmount,
        subject,
      },
    });
    return result;
  }

  /**
   * https://docs.open.alipay.com/api_1/alipay.trade.refund
   * 统一收单交易退款接口
   * @param {*} outTradeNo 商户订单号
   * @param {*} refundAmount 退款金额
   * @memberof AlipayService
   */
  async refund(outTradeNo, refundAmount) {
    const { ctx } = this;
    console.log('outTradeNo', outTradeNo);
    const result = await ctx.alipaySdk.exec('alipay.trade.refund', {
      // notifyUrl: '',
      bizContent: {
        outTradeNo,
        refundAmount,
      },
    });
    return result;
  }

  /**
   * https://docs.open.alipay.com/api_1/alipay.trade.fastpay.refund.query
   * 统一收单交易退款查询
   * @param {*} outTradeNo 商户订单号
   * @return {*} 返回订单退款详情
   * @memberof AlipayService
   */
  async refundQuery(outTradeNo) {
    const { ctx } = this;
    const result = await ctx.alipaySdk.exec('alipay.trade.fastpay.refund.query', {
      // notifyUrl: '',
      bizContent: {
        outTradeNo,
      },
    });
    return result;
  }
}

module.exports = AlipayService;
