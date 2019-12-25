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
  async pay() {
    const { ctx } = this;
    const result = await ctx.service.alipay.pay(1, '测试');
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }
}

module.exports = AliPayController;
