'use strict';

const Controller = require('../core/base_controller');
const { ApiConfig, ApiConfigKit, WeChat } = require('tnwx');

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
    const appId = this.config.wechat.appId;
    const appSecret = this.config.wechat.appSecret;
    // const encodingAesKey = 'bidTsi6ZgIknyEH2vGgyrri955DDMLe2kbRHVK3vGWX';
    const {
      signature,
      timestamp,
      nonce,
      echostr,
    } = ctx.query;
    const apiConfig = new ApiConfig(appId, appSecret, 'andoromeda');
    ApiConfigKit.putApiConfig(apiConfig);
    ApiConfigKit.devMode = true;
    ApiConfigKit.setCurrentAppId(appId);
    ctx.body = WeChat.checkSignature(signature, timestamp, nonce, echostr);
  }

  async handleMsg() {
    const { ctx } = this;
    console.log(ctx);
    ctx.body = 'handleMsg';
  }
}

module.exports = WechatController;
