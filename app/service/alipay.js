'use strict';

const Service = require('egg').Service;
const AlipaySdk = require('alipay-sdk').default;
const AlipayFormData = require('alipay-sdk/lib/form').default;


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
   * 支付宝网页支付
   * @param {*} totalAmount 订单金额
   * @param {*} subject 订单标题
   * @return {*} -
   * @memberof AlipayService
   */
  async pagePay(totalAmount, subject) {
    const { ctx } = this;
    const { notify_url, return_url } = this.config.alipay;
    const outTradeNo = ctx.helper.genCharacterNumber(31);

    const formData = new AlipayFormData();
    formData.setMethod('get');
    formData.addField('notifyUrl', notify_url);
    formData.addField('returnUrl', return_url);
    formData.addField('bizContent', {
      outTradeNo,
      productCode: 'FAST_INSTANT_TRADE_PAY',
      totalAmount,
      subject,
    });
    const result = await ctx.alipaySdk.exec(
      'alipay.trade.page.pay',
      {},
      { formData }
    );
    return result;
  }

  /**
   * https://docs.open.alipay.com/api_1/alipay.trade.page.pay
   * 支付宝移动端支付
   * @param {*} totalAmount 订单金额
   * @param {*} subject 订单标题
   * @return {*} -
   * @memberof AlipayService
   */
  async wapPay(totalAmount, subject) {
    const { ctx } = this;
    const { notify_url, return_url } = this.config.alipay;
    const outTradeNo = ctx.helper.genCharacterNumber(31);

    const formData = new AlipayFormData();
    formData.setMethod('get');
    formData.addField('notifyUrl', notify_url);
    formData.addField('returnUrl', return_url);
    formData.addField('bizContent', {
      outTradeNo,
      productCode: 'QUICK_WAP_WAY',
      totalAmount,
      subject,
    });
    const result = await ctx.alipaySdk.exec(
      'alipay.trade.wap.pay',
      {},
      { formData }
    );
    return result;
    /* const result = await ctx.alipaySdk.exec('alipay.trade.wap.pay', {
      // notifyUrl: '',
      // returnUrl: '',
      bizContent: {
        outTradeNo,
        productCode: 'QUICK_WAP_WAY',
        quit_url: 'https://test.smartsignature.io/',
        totalAmount,
        subject,
      },
    });
    return result; */
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
  async auth() {
    const { ctx } = this;
    const result = await ctx.alipaySdk.exec('alipay.user.info.auth', {
      // notifyUrl: '',
      bizContent: {
        scopes: 'auth_user',
        state: 'test',
      },
    });
    return result;
  }
  async checkNotifySign(postData) {
    return this.ctx.alipaySdk.checkNotifySign(postData);
  }
}

module.exports = AlipayService;
