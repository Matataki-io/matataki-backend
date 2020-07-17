'use strict';

const Service = require('egg').Service;
const { WeChat } = require('tnwx');
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

    const [ userInfoError, userInfoResult ] = await this.service.utils.facotryRequst(this.service.wechatApi.getUserInfo, access_token, openid);
    if (userInfoError) {
      return {
        code: -1,
        message: 'userInfoError error',
        data: userInfoResult,
      };
    }

    console.log('userInfoResult', userInfoResult);

    // 创建， 设置用户
    const { nickname, headimgurl } = userInfoResult;
    const jwttoken = await this.service.auth.saveWeChatUser(openid, nickname, headimgurl, this.clientIP, 0, 'weixin');

    console.log('jwttoken', jwttoken);

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

    // init
    this.service.wechatApi.weChatTnwxInit();

    const msgAdapter = new MsgController();
    // console.log('msgAdapter', msgAdapter);

    ctx.set('Content-Type', 'text/xml');
    const msg = await WeChat.handleMsg(msgAdapter, msgXml, msgSignature, timestamp, nonce);
    console.log('msg 45 line', msg);

    const xmlResult = await parser.parseStringPromise(msgXml);
    console.log('xmlResult', xmlResult.xml);
    const msgXmlResult = xmlResult.xml;
    console.log('msgXmlResult: ', msgXmlResult);


    // 扫码登录
    const scanLogin = async msgXmlResult => {
      try {
        // get accesstoken
        const assessToken = await this.service.wechatApi.getAccessToken();
        if (!assessToken) return;

        const res = await this.weixinLogin(assessToken, msgXmlResult.FromUserName[0]);
        console.log('res', res);

        if (res.code === 0) {
          await this.app.redis.set(`scene:${msgXmlResult.EventKey[0]}`, res.data, 'EX', 60);
        }
      } catch (e) {
        this.logger.error('event SCAN: ', e);
      }
    };

    // 扫码关注登录
    const scanFollowLogin = async (msgXmlResult, eventKey) => {
      try {
        // get accesstoken
        const assessToken = await this.service.wechatApi.getAccessToken();
        if (!assessToken) return;

        const res = await this.weixinLogin(assessToken, msgXmlResult.FromUserName[0]);
        console.log('res', res);

        if (res.code === 0) {
          await this.app.redis.set(`scene:${eventKey}`, res.data, 'EX', 60);
        }
      } catch (e) {
        this.logger.error('event scan subscribe: ', e);
      }
    };

    // 事件处理
    if (msgXmlResult.MsgType[0] !== 'event') {
      return msg;
    }

    // 判断事件
    if (msgXmlResult.Event[0] === 'SCAN') { // 扫码进入

      // 如果用户已经关注公众号
      // SCAN
      // 478398

      // 如果有 event key
      if (msgXmlResult.EventKey[0]) {
        scanLogin(msgXmlResult);
      } else {
        console.log('not event key, msgXmlResult: ', msgXmlResult);
      }

    } else if (msgXmlResult.Event[0] === 'unsubscribe' && msg === 'success') { // 取关了
      console.log(`${msgXmlResult.FromUserName[0]}取关了`);
    } else if (msgXmlResult.Event[0] === 'subscribe') { // 关注了
      console.log(`${msgXmlResult.FromUserName[0]}关注了`);

      // 如果用户还未关注公众号
      // subscribe
      // qrscene_478398

      // 判断是否有 event key
      if (msgXmlResult.EventKey[0]) {

        const eventKey = msgXmlResult.EventKey[0].split('_');

        // 判断是否为 qrscene_123456 格式
        if (eventKey[0] === 'qrscene') { // 认为是扫码关注的
          scanFollowLogin(msgXmlResult, eventKey[1]);
        } else {
          // 其他自定义事件
          console.log('other event key msgXmlResult: ', msgXmlResult);
        }

      } else {
        // 没有事件key
        console.log('not event key, msgXmlResult: ', msgXmlResult);
      }

    } else {
      // 其他事件
      console.log('other event, msgXmlResult: ', msgXmlResult);
    }

    console.log('msg 45 line ------------------------------');
    return msg;
  }

  // 扫码登录二维码
  async qrcode() {
    const { ctx } = this;
    // 生成随机数
    let randomNumber = ctx.helper.randomRange(100000, 999999);

    // init
    this.service.wechatApi.weChatTnwxInit();

    // get accesstoken
    const assessToken = await this.service.wechatApi.getAccessToken();
    if (!assessToken) return;

    // 判断场景值是否存在了
    const checkScene = async id => {
      try {
        const scene = await this.app.redis.get(`scene:${id}`);
        if (scene) {
          randomNumber = ctx.helper.randomRange(100000, 999999);
          checkScene(randomNumber);
        }
      } catch (e) {
        this.logger.error('checkScene', e);
      }
    };

    await checkScene(randomNumber);


    const [ ticketError, ticketResult ] = await this.service.utils.facotryRequst(this.service.wechatApi.getTemporaryQrcode, assessToken, randomNumber);
    if (ticketError) {
      return {
        code: -1,
        message: 'ticketError error',
        data: ticketResult,
      };
    }

    console.log('ticketResult', ticketResult);

    const [ longUrlError, longUrlResult ] = await this.service.utils.facotryRequst(this.service.wechatApi.longUrlConvertShortUrl, assessToken, this.service.wechatApi.ticketExchangeQRcode(ticketResult.ticket));
    if (longUrlError) {
      return {
        code: -1,
        message: 'longUrlError error',
        data: longUrlResult,
      };
    }

    console.log('longUrlResult', longUrlResult);

    // 没有 url
    if (!longUrlResult.short_url) {
      return {
        code: -1,
        message: 'longUrlResult error',
        data: longUrlResult,
      };
    }

    return {
      qrcode: longUrlResult.short_url,
      scene: randomNumber,
    };


  }

  // 通过wx登录
  async loginByWx(scene) {
    if (!scene) return false;

    try {
      const resultToken = await this.app.redis.get(`scene:${scene}`);
      return resultToken ? resultToken : false;
    } catch (e) {
      console.log(e);
      this.logger.error('login by wx', e);
      return false;
    }
  }

}

module.exports = WechatService;
