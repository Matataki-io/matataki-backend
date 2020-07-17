'use strict';

const Controller = require('../core/base_controller');
const { WeChat } = require('tnwx');

class WechatController extends Controller {
  // 获取签名
  async calculateSign() {
    const ctx = this.ctx;
    const { url = '' } = ctx.query;

    const wxSign = await this.service.wechat.getSign(url);

    if (!wxSign) {
      ctx.body = ctx.msg.failure;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = wxSign;
  }
  async auth() {
    const { ctx } = this;
    ctx.logger.info('controller wechat auth: ', ctx.query);
    const { signature, timestamp, nonce, echostr } = ctx.query;

    // init
    this.service.wechatApi.weChatTnwxInit();

    ctx.body = WeChat.checkSignature(signature, timestamp, nonce, echostr);
  }

  async handleMsg() {
    const { ctx } = this;
    ctx.body = await this.service.wechatTnwx.handleMsg();
  }

  async qrcode() {
    const { ctx } = this;

    ctx.body = ctx.msg.success;
    ctx.body.data = await this.service.wechatTnwx.qrcode();
  }
  async loginByWx() {
    const { ctx } = this;
    const { scene } = ctx.query;
    ctx.body = ctx.msg.success;
    ctx.body.data = await this.service.wechatTnwx.loginByWx(scene);
  }
}

module.exports = WechatController;
