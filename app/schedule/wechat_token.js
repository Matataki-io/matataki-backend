
const Subscription = require('egg').Subscription;
const axios = require('axios');

class WechatToken extends Subscription {

  static get schedule() {
    return {
      interval: '7000s',
      type: 'all',
    };
  }

  async subscribe() {
    if (this.ctx.app.config.isDebug) return;
    await this.getToken();
    await this.getTicket();
    this.logger.info('WechatTokenScheduler: This round ends..');
  }


  async getToken() {
    let status = 0;
    for (let amount = 0; amount < 3; amount += 1) {
      try {
        this.logger.info('WechatTokenScheduler: Trying to catch a new token ');
        const tokenRequest = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
          params: {
            grant_type: 'client_credential',
            appid: this.config.wx.appId,
            secret: this.config.wx.appSecret,
          },
        });
        if (tokenRequest.data.access_token) {
          this.logger.info('WechatTokenScheduler: New Token: ', tokenRequest.data);
          await this.app.redis.set('wechat_token', tokenRequest.data.access_token, 'EX', 7000);
          status = 1;
          break;
        } else {
          this.logger.info('WechatTokenScheduler: Get Token failed: ', tokenRequest.data);
        }
      } catch (err) {
        this.logger.info('WechatTokenScheduler: Error occurs: ', err);
      }
    }
    return status;
  }

  async getTicket() {
    let status = 0;
    const wechat_token = await this.app.redis.get('wechat_token');

    if (wechat_token) {
      for (let amount = 0; amount < 3; amount += 1) {
        try {
          this.logger.info('WechatTokenScheduler: Trying to catch a new ticket ');
          const ticketRequest = await axios.get('https://api.weixin.qq.com/cgi-bin/ticket/getticket', {
            params: {
              access_token: wechat_token,
              type: 'jsapi',
            },
          });
          if (ticketRequest.data.errcode === 0) {
            this.logger.info('WechatTokenScheduler: New Ticket: ', ticketRequest.data);
            await this.app.redis.set('wechat_ticket', ticketRequest.data.ticket, 'EX', 7000);
            status = 1;
            break;
          } else {
            this.logger.info('WechatTokenScheduler: Get Ticket failed: ', ticketRequest.data);
          }
        } catch (err) {
          this.logger.info('WechatTokenScheduler: Error occurs: ', err);
        }
      }
    }
    return status;
  }
}

module.exports = WechatToken;
