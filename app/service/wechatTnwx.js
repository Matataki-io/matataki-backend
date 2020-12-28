'use strict';

const Service = require('egg').Service;
const { WeChat, MenuApi } = require('tnwx');
const MsgController = require('../wx/MsgController');
const fs = require('fs');
// const wechatMenu = require('../../config/wechat_menu.json');
const path = require('path');

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


    // 创建， 设置用户
    const { nickname, headimgurl } = userInfoResult;
    const jwttoken = await this.service.auth.saveWeChatUser(openid, nickname, headimgurl, this.clientIP, 0, 'weixin');


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

    // init
    this.service.wechatApi.weChatTnwxInit();

    const msgAdapter = new MsgController();
    // this.logger.info('msgAdapter', msgAdapter);

    ctx.set('Content-Type', 'text/xml');
    const msg = await WeChat.handleMsg(msgAdapter, msgXml, msgSignature, timestamp, nonce);

    const xmlResult = await parser.parseStringPromise(msgXml);
    const msgXmlResult = xmlResult.xml;


    // 扫码登录
    const scanLogin = async msgXmlResult => {
      try {
        // get accesstoken
        const assessToken = await this.service.wechatApi.getAccessToken();
        if (!assessToken) return;

        const res = await this.weixinLogin(assessToken, msgXmlResult.FromUserName[0]);

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

        if (res.code === 0) {
          await this.app.redis.set(`scene:${eventKey}`, res.data, 'EX', 60);
        }
      } catch (e) {
        this.logger.error('event scan subscribe: ', e);
      }
    };

    // 扫码绑定
    const scanBind = async (msgXmlResult, eventKey) => {
      try {

        const data = {
          uid: eventKey,
          account: msgXmlResult.FromUserName[0],
          platform: 'weixin',
        };
        const result = await this.ctx.service.account.binding.create(data);

        if (result) {
          this.app.redis.set(`scene_bind:${eventKey}`, eventKey, 'EX', 60);
        } else {
          this.app.redis.set(`scene_bind_error:${eventKey}`, eventKey, 'EX', 60);
        }

      } catch (e) {
        this.logger.error('scanBind event SCAN: ', e);
      }
    };

    // 事件处理
    if (msgXmlResult.MsgType[0] !== 'event') {
      return msg;
    }

    // 判断各种事件
    const EventKeys = msgXmlResult.EventKey[0];
    const eventKey = EventKeys.split('_');

    if (msgXmlResult.Event[0] === 'SCAN') { // 扫码进入

      if (eventKey[0] === 'bind') { //  bind_830714 绑定账号
        scanBind(msgXmlResult, eventKey[1]);
      } else if (eventKey[0]) { // 478398 如果用户已经关注公众号 纯数字内容 扫码登录
        scanLogin(msgXmlResult);
      } else {
        this.logger.info('not event key, msgXmlResult: ', msgXmlResult);
      }

    } else if (msgXmlResult.Event[0] === 'unsubscribe' && msg === 'success') { // 取关了
      this.logger.info(`${msgXmlResult.FromUserName[0]}取关了`);
    } else if (msgXmlResult.Event[0] === 'subscribe') { // 关注了
      this.logger.info(`${msgXmlResult.FromUserName[0]}关注了`);

      if (eventKey[0] === 'qrscene' && eventKey[1] === 'bind') { // qrscene_bind_1053 扫码绑定账号
        scanBind(msgXmlResult, eventKey[2]);
      } else if (eventKey[0] === 'qrscene') { // qrscene_123456 如果用户还未关注公众号 扫码关注登录
        scanFollowLogin(msgXmlResult, eventKey[1]);
      } else {
        this.logger.info('not event key, msgXmlResult: ', msgXmlResult);
      }

    } else {
      // 其他事件
      this.logger.info('other event, msgXmlResult: ', msgXmlResult);
    }

    this.logger.info('msg 45 line ------------------------------');
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

    // 二维码场景值
    const data = {
      expire_seconds: 60,
      action_name: 'QR_SCENE',
      action_info: {
        scene: {
          scene_id: randomNumber,
        },
      },
    };
    const [ ticketError, ticketResult ] = await this.service.utils.facotryRequst(this.service.wechatApi.getTemporaryQrcode, assessToken, data);
    if (ticketError) {
      return {
        code: -1,
        message: 'ticketError error',
        data: ticketResult,
      };
    }

    this.logger.info('ticketResult', ticketResult);

    const [ longUrlError, longUrlResult ] = await this.service.utils.facotryRequst(this.service.wechatApi.longUrlConvertShortUrl, assessToken, this.service.wechatApi.ticketExchangeQRcode(ticketResult.ticket));
    if (longUrlError) {
      return {
        code: -1,
        message: 'longUrlError error',
        data: longUrlResult,
      };
    }

    this.logger.info('longUrlResult', longUrlResult);

    // 没有 url
    if (!longUrlResult.short_url) {
      return {
        code: -1,
        message: 'longUrlResult error',
        data: longUrlResult,
      };
    }

    return {
      code: 0,
      message: '成功',
      data: {
        qrcode: longUrlResult.short_url,
        scene: randomNumber,
      },
    };


  }
  // 绑定扫码二维码
  async qrcodeBind(uid) {
    // init
    this.service.wechatApi.weChatTnwxInit();

    // get accesstoken
    const assessToken = await this.service.wechatApi.getAccessToken();
    if (!assessToken) return;


    // 二维码字符场景值
    const sceneStr = `bind_${uid}`;

    const data = {
      expire_seconds: 60,
      action_name: 'QR_STR_SCENE',
      action_info: {
        scene: {
          scene_str: sceneStr,
        },
      },
    };

    const [ ticketError, ticketResult ] = await this.service.utils.facotryRequst(this.service.wechatApi.getTemporaryQrcode, assessToken, data);
    if (ticketError) {
      return {
        code: -1,
        message: 'qrcodeBind ticketError error',
        data: ticketResult,
      };
    }

    this.logger.info('qrcodeBind ticketResult', ticketResult);

    const [ longUrlError, longUrlResult ] = await this.service.utils.facotryRequst(this.service.wechatApi.longUrlConvertShortUrl, assessToken, this.service.wechatApi.ticketExchangeQRcode(ticketResult.ticket));
    if (longUrlError) {
      return {
        code: -1,
        message: 'qrcodeBind longUrlError error',
        data: longUrlResult,
      };
    }

    this.logger.info('qrcodeBind longUrlResult', longUrlResult);

    // 没有 url
    if (!longUrlResult.short_url) {
      return {
        code: -1,
        message: 'qrcodeBind longUrlResult error',
        data: longUrlResult,
      };
    }

    return {
      code: 0,
      message: '成功',
      data: {
        qrcode: longUrlResult.short_url,
        scene: sceneStr,
      },
    };


  }

  // 通过wx登录
  async loginByWx(scene) {
    if (!scene) return false;

    try {
      const resultToken = await this.app.redis.get(`scene:${scene}`);
      return resultToken ? resultToken : false;
    } catch (e) {
      this.logger.error('login by wx', e);
      return false;
    }
  }

  // 通过wx绑定
  async bindByWx(scene) {
    if (!scene) return false;

    try {
      const sceneId = scene.split('_');
      // 查询是否失败
      const resultError = await this.app.redis.get(`scene_bind_error:${sceneId[1]}`);
      if (resultError) {
        await this.app.redis.del(`scene_bind_error:${sceneId[1]}`);

        return {
          code: -1,
          data: false,
        };
      }
      const resultToken = await this.app.redis.get(`scene_bind:${sceneId[1]}`);
      return {
        code: 0,
        data: resultToken ? resultToken : false,
      };


    } catch (e) {
      this.logger.error('login by wx', e);
      return false;
    }
  }

  async createMenu() {
    try {
      const res = await fs.readFileSync(path.join(__dirname, '../../config/wechat_menu.json'));

      const fileData = res.toString();

      // init
      this.service.wechatApi.weChatTnwxInit();

      // get accesstoken
      // const assessToken = await this.service.wechatApi.getAccessToken();
      // this.logger.info('assessToken', assessToken);

      const createRes = await MenuApi.create(fileData);

      return {
        code: createRes.errcode,
        message: createRes.errmsg,
      };
    } catch (e) {
      return {
        code: -1,
        message: e,
      };
    }
  }

}

module.exports = WechatService;
