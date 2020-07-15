'use strict';

const Service = require('egg').Service;
const axios = require('axios');
const sha1 = require('crypto-js/sha1');
const md5 = require('crypto-js/md5');
const { ApiConfig, ApiConfigKit, AccessTokenApi, WeChat } = require('tnwx');
const MsgController = require('../wx/MsgController');

class WechatService extends Service {

  async getSign(url) {
    const ticket = await this.getToken();
    if (!ticket) {
      return null;
    }

    let timestamp = Date.now().toString();
    timestamp = timestamp.substring(0, 10);

    const nonce = md5(timestamp + 'random1').toString();

    // 生成签名
    const hash = sha1(`jsapi_ticket=${ticket}`
      + `&noncestr=${nonce}`
      + `&timestamp=${timestamp}`
      + `&url=${url}`).toString();

    return { hash, timestamp, nonce };
  }

  // 从redis内拿取ticket，若无，则调用更新
  async getToken() {
    let ticket = null;
    try {
      // 从redis获取
      ticket = await this.app.redis.get('wechat_ticket');
    } catch (err) {
      this.logger.error('Wechat Service: Error occurs when getting token from redis: ', err);
    }

    if (!ticket) {
      // 调用更新
      ticket = await this.updateToken();
    }

    return ticket;
  }

  // 从微信处获取新的token和ticket
  async updateToken() {
    let ticket = null;
    let token = null;
    try {
      // 获取新的token
      this.logger.info('Wechat Service: Trying to catch a new token ');
      const tokenRequest = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
        params: {
          grant_type: 'client_credential',
          appid: this.config.wx.appId,
          secret: this.config.wx.appSecret,
        },
      });
      if (tokenRequest.data.access_token) {
        this.logger.info('Wechat Service: New Token: ', tokenRequest.data);
        await this.app.redis.set('wechat_token', tokenRequest.data.access_token, 'EX', 7000);
        token = tokenRequest.data.access_token;
      } else {
        this.logger.info('Wechat Service: Get Token failed: ', tokenRequest.data);
        return null;
      }

      // 获取新的ticket
      this.logger.info('Wechat Service: Trying to catch a new ticket ');
      const ticketRequest = await axios.get('https://api.weixin.qq.com/cgi-bin/ticket/getticket', {
        params: {
          access_token: token,
          type: 'jsapi',
        },
      });
      if (ticketRequest.data.errcode === 0) {
        this.logger.info('Wechat Service: New Ticket: ', ticketRequest.data);
        await this.app.redis.set('wechat_ticket', ticketRequest.data.ticket, 'EX', 7000);
        ticket = ticketRequest.data.ticket;
      } else {
        this.logger.info('Wechat Service: Get Ticket failed: ', ticketRequest.data);
        return null;
      }
    } catch (err) {
      this.logger.error('Wechat Service: Error occurs when updating token: ', err);
    }

    return ticket;
  }
  // 通过code换取网页授权access_token
  async getAccessToken(code) {
    const { ctx } = this;
    const { appId, appSecret } = this.config.wechat;
    ctx.logger.info('service getAccessToken', code, appId, appSecret);
    const result = await ctx.curl(`https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`, {
      dataType: 'json',
      // 3 秒超时
      // timeout: 3000,
    });
    ctx.logger.info('service getAccessToken result:', result);
    return result;
  }
  // 刷新access_token（如果需要）
  async refreshToken(refresh_token) {
    const { ctx } = this;
    const { appId, appSecret } = this.config.wechat;
    ctx.logger.info('service refreshToken', appId, appSecret);
    const result = await ctx.curl(`https://api.weixin.qq.com/sns/oauth2/refresh_token?appid=${appId}&grant_type=refresh_token&refresh_token=${refresh_token}`, {
      dataType: 'json',
      // 3 秒超时
      // timeout: 3000,
    });
    ctx.logger.info('service refreshToken result:', result);
    return result;
  }
  // 拉取用户信息(需scope为 snsapi_userinfo)
  async getUserInfo(access_token, openid) {
    const { ctx } = this;
    ctx.logger.info('service getUserInfo');
    const result = await ctx.curl(`https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}&lang=zh_CN`, {
      dataType: 'json',
      // 3 秒超时
      // timeout: 3000,
    });
    ctx.logger.info('service getUserInfo result:', result);
    return result;
  }
  async getQrCode() {
    const ctx = this.ctx;
    const appId = this.config.wechat.appId;
    const appSecret = this.config.wechat.appSecret;
    const token = await ctx.curl(
      `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`,
      {
        dataType: 'json',
      }
    );
    const access_token = token.data.access_token;
    const ticketRes = await ctx.curl(
      `https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=${access_token}`,
      {
        // 必须指定 method
        method: 'POST',
        // 通过 contentType 告诉 HttpClient 以 JSON 格式发送
        contentType: 'json',
        data: {
          expire_seconds: 604800,
          action_name: 'QR_SCENE',
          action_info: {
            scene: {
              scene_id: 123,
            },
          },
        },
        // 明确告诉 HttpClient 以 JSON 格式处理返回的响应 body
        dataType: 'json',
      }
    );
    // https://developers.weixin.qq.com/doc/offiaccount/Account_Management/Generating_a_Parametric_QR_Code.html
    return 'https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=' + ticketRes.data.ticket;
  }


  // -------------------------------- 微信服务号扫码方法 ------------------------
  // 处理事件
  async handleMsg() {
    const { ctx } = this;
    // console.log(ctx);

    // signature: 'f7868e6c4b4927cec1ac9874f134d2c41c67c2cc',
    // timestamp: '1594724130',
    // nonce: '1613386257',
    // openid: 'ofjFouIxYtOnJk1VF48SHKJkbLhg'

    // ctx.logger.info('controller wechat auth: ', ctx.query);
    const {
      msgSignature,
      timestamp,
      nonce,
    } = ctx.query;
    const msgXml = this.ctx.request.rawBody;
    console.log('msgXml', msgXml);

    const appId = this.config.wechat.appId;
    const appSecret = this.config.wechat.appSecret;
    const apiConfig = new ApiConfig(appId, appSecret, 'andoromeda');
    ApiConfigKit.putApiConfig(apiConfig);
    ApiConfigKit.devMode = true;
    ApiConfigKit.setCurrentAppId(appId);

    const res = await AccessTokenApi.getAccessToken();
    console.log('res', res);

    const msgAdapter = new MsgController();

    console.log('msgAdapter', msgAdapter);

    ctx.set('Content-Type', 'text/xml');
    const msg = await WeChat.handleMsg(msgAdapter, msgXml, msgSignature, timestamp, nonce);
    console.log('msg', msg);
    return msg;
  }
}

module.exports = WechatService;
