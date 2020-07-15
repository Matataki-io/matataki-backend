'use strict';

const Service = require('egg').Service;
const { ApiConfig, ApiConfigKit, AccessTokenApi, WeChat } = require('tnwx');
const MsgController = require('../wx/MsgController');

// 解析二维码
const xml2js = require('xml2js');
const parser = new xml2js.Parser();

class WechatService extends Service {
  // -------------------------------- 微信服务号扫码方法 ------------------------
  // 微信登陆
  async weixinLogin(access_token, openid) {
    const { ctx } = this;
    if (openid === null) {
      return ctx.msg.paramsError;
    }

    // 拉取用户信息
    const getUserInfo = async (access_token, openid) => {
      const { ctx } = this;
      ctx.logger.info('service getUserInfo');
      const result = await ctx.curl(`https://api.weixin.qq.com/cgi-bin/user/info?access_token=${access_token}&openid=${openid}&lang=zh_CN`, {
        dataType: 'json',
      // 3 秒超时
      // timeout: 3000,
      });
      ctx.logger.info('service getUserInfo result:', result);
      return result;
    };

    const userInfo = await getUserInfo(access_token, openid);
    if (userInfo.data.errcode) {
      return {
        ...ctx.msg.generateTokenError,
        data: userInfo.data,
      };
    }
    // 创建， 设置用户
    const { nickname, headimgurl } = userInfo.data;
    const jwttoken = await this.service.auth.saveUser(openid, nickname, headimgurl, this.clientIP, 0, 'weixin');
    if (jwttoken === null) {
      return ctx.msg.generateTokenError;
    }
    return {
      ...ctx.msg.success,
      data: jwttoken,
    };
  }

  // 处理事件
  async handleMsg() {
    const { ctx } = this;
    const { msgSignature, timestamp, nonce } = ctx.query;
    const msgXml = this.ctx.request.rawBody;
    console.log('msgXml', msgXml);

    const appId = this.config.wechat.appId;
    const appSecret = this.config.wechat.appSecret;
    const apiConfig = new ApiConfig(appId, appSecret, 'andoromeda');
    ApiConfigKit.putApiConfig(apiConfig);
    ApiConfigKit.devMode = true;
    ApiConfigKit.setCurrentAppId(appId);

    const msgAdapter = new MsgController();
    // console.log('msgAdapter', msgAdapter);

    ctx.set('Content-Type', 'text/xml');
    const msg = await WeChat.handleMsg(msgAdapter, msgXml, msgSignature, timestamp, nonce);
    console.log('msg 45 line', msg);

    const xmlResult = await parser.parseStringPromise(msgXml);
    console.log('xmlResult', xmlResult.xml);
    const msgXmlResult = xmlResult.xml;

    // TODO: 判断扫码进入的

    if (msgXmlResult.MsgType[0] === 'event') {
      if (msgXmlResult.Event[0] === 'unsubscribe' && msg === 'success') { // 取关了
        console.log(`${msgXmlResult.FromUserName[0]}取关了`);
      } else if (msgXmlResult.Event[0] === 'subscribe') { // 关注了
        console.log(`${msgXmlResult.FromUserName[0]}关注了`);

        const assessTokenRes = await AccessTokenApi.getAccessToken();
        console.log('assessTokenRes', assessTokenRes);

        const res = await this.weixinLogin(assessTokenRes.access_token, msgXmlResult.FromUserName[0]);
        console.log('res', res);

        if (res.code === 0) {
          const id = Date.now(); // 时间戳场景值
          // 60s
          await this.app.redis.set(`scene:${id}`, res.data, 'EX', 60);
        }

      } else {
        //
      }
    }

    console.log('msg 45 line ------------------------------');
    return msg;
  }

  // 扫码登录二维码
  async qrcode() {
    const { ctx } = this;
    // 生成随机数
    const randomNumber = ctx.helper.randomRange(100000, 999999);

    const appId = this.config.wechat.appId;
    const appSecret = this.config.wechat.appSecret;
    const apiConfig = new ApiConfig(appId, appSecret, 'andoromeda');
    ApiConfigKit.putApiConfig(apiConfig);
    ApiConfigKit.devMode = true;
    ApiConfigKit.setCurrentAppId(appId);

    const assessTokenRes = await AccessTokenApi.getAccessToken();
    console.log('assessTokenRes', assessTokenRes);

    const [ ticketError, ticketResult ] = await this.service.utils.facotryRequst(this.service.wechatApi.getTemporaryQrcode, assessTokenRes.access_token, randomNumber);
    if (ticketError) {
      return {
        code: -1,
        message: 'ticketError error',
        data: ticketResult,
      };
    }

    console.log('ticketResult', ticketResult);

    const [ longUrlError, longUrlResult ] = await this.service.utils.facotryRequst(this.service.wechatApi.longUrlConvertShortUrl, assessTokenRes.access_token, this.service.wechatApi.ticketExchangeQRcode(ticketResult.ticket));
    if (longUrlError) {
      return {
        code: -1,
        message: 'longUrlError error',
        data: longUrlResult,
      };
    }

    console.log('longUrlResult', longUrlResult);

    return {
      qrcode: longUrlResult.short_url,
      scene: randomNumber,
    };
  }

  // 通过wx登录
  async loginByWx(scene) {
    const { ctx } = this;

    if (!scene) return false;

    try {
      const resultToken = await this.app.redis.get(`scene:${scene}`);
      return resultToken ? resultToken : false;
    } catch (e) {
      console.log(e);
      ctx.logger.error('login by wx', e);
      return false;
    }
  }

}

module.exports = WechatService;
