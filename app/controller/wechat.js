'use strict';

const Controller = require('../core/base_controller');
const sha1 = require('crypto-js/sha1');
const md5 = require('crypto-js/md5');

class WechatController extends Controller {

  async calculateSign() {
    const ctx = this.ctx;
    const { url = '' } = ctx.query;

    const wechat_ticket = await this.app.redis.get('wechat_ticket');

    const timestamp = Date.now().toString();

    const nonce = md5(timestamp + 'random1').toString();

    const hash = sha1(`jsapi_ticket=${wechat_ticket}`
      + `&noncestr=${nonce}`
      + `&timestamp=${timestamp}`
      + `&url=${url}`).toString();

    ctx.body = ctx.msg.success;
    ctx.body.data = { hash, timestamp, nonce };
  }
}

module.exports = WechatController;
