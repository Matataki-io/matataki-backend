'use strict';

const Controller = require('../core/base_controller');
const nanoid = require('nanoid');

const typeOptions = {
  add: 'add',
  buy_token_input: 'buy_token_input',
  buy_token_output: 'buy_token_output',
  sale_token: 'sale_token',
};

class AliPayController extends Controller {
  async wapPay() {
    const { ctx } = this;
    const { amount, title } = ctx.request.body;
    const result = await ctx.service.alipay.wapPay(amount, title);
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }
  async pagePay() {
    const { ctx } = this;
    const { amount, title } = ctx.request.body;
    const result = await ctx.service.alipay.pagePay(amount, title);
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }
  async notify() {
    const { ctx } = this;
    ctx.logger.info('alipay notify info body', await ctx.service.alipay.checkNotifySign(ctx.body));
    ctx.logger.info('alipay notify info query', await ctx.service.alipay.checkNotifySign(ctx.request.body));
  }
  async auth() {
    const { ctx } = this;
    const result = await ctx.service.alipay.auth();
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }
}

module.exports = AliPayController;
