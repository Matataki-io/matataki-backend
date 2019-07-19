'use strict';

const Service = require('egg').Service;
const axios = require('axios');
const sha1 = require('crypto-js/sha1');
const md5 = require('crypto-js/md5');

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
}

module.exports = WechatService;
