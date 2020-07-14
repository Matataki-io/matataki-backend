'use strict';

const Controller = require('../core/base_controller');
const { ApiConfig, ApiConfigKit, WeChat } = require('tnwx');
const MsgController = require('../wx/MsgController');

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
    ctx.logger.info('controller wechat auth: ', ctx.query);
    const {
      msgSignature,
      timestamp,
      nonce,
    } = ctx.query;
    const msgXml = this.ctx.request.rawBody;
    console.log(msgXml);
    const appId = this.config.wechat.appId;
    const appSecret = this.config.wechat.appSecret;
    const apiConfig = new ApiConfig(appId, appSecret, 'andoromeda');
    ApiConfigKit.putApiConfig(apiConfig);
    ApiConfigKit.devMode = true;
    ApiConfigKit.setCurrentAppId(appId);
    const msgAdapter = new MsgController();
    ctx.set('Content-Type', 'text/xml');
    const msg = await WeChat.handleMsg(msgAdapter, msgXml, msgSignature, timestamp, nonce);
    console.log(msg);
    ctx.body = msg;

    // 获取签名相关的参数用于消息解密(测试号以及明文模式无此参数)
    /* const buffer = [];
    const req = this.ctx.req;
    req.on('data', data => {
      buffer.push(data);
    });

    req.on('end', () => {
      const msgXml = Buffer.concat(buffer).toString('utf-8');
      console.log(msgXml);
      // 处理消息并响应对应的回复
      // .
    }); */

    /* let data = '';
    this.ctx.req.setEncoding('utf8');
    this.ctx.req.on('data', chunk => {
      data += chunk;
    });
    const that = this;
    this.ctx.req.on('end', () => {
      xml2js(data, { explicitArray: false }, (err, json) => {
        console.log(json); // 这里的json便是xml转为json的内容
        that.ctx.body = 'success';
      });
    }); */

    /* const xml = await raw(inflate(this.ctx.req));
    console.log(xml); */
    // ctx.body = 'handleMsg';
  }
}

module.exports = WechatController;
