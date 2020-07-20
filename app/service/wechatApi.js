'use strict';

const Service = require('egg').Service;
const { ApiConfig, ApiConfigKit, AccessTokenApi } = require('tnwx');


class WechatService extends Service {
  // ------------------------- 微信服务号接口调用公用方法 -------------------------

  // 应用初始化
  weChatTnwxInit() {
    const appId = this.config.wxServiceAccount.appId;
    const appSecret = this.config.wxServiceAccount.appSecret;
    const apiConfig = new ApiConfig(appId, appSecret, 'andoromeda');
    ApiConfigKit.putApiConfig(apiConfig);
    ApiConfigKit.devMode = false;
    ApiConfigKit.setCurrentAppId(appId);
  }

  // 获取 access_token
  async getAccessToken() {
    try {
      const assessTokenRes = await AccessTokenApi.getAccessToken();
      console.log('assessTokenRes', assessTokenRes);
      if (assessTokenRes && assessTokenRes.access_token) {
        return assessTokenRes.access_token;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // 得到推广临时二维码 (用于扫码登录)
  async getTemporaryQrcode(access_token, scene) {
    const { ctx } = this;
    ctx.logger.info('service getTemporaryQrcode');
    const result = await ctx.curl(`https://api.weixin.qq.com/cgi-bin/qrcode/create?access_token=${access_token}`, {
      method: 'POST',
      // 通过 contentType 告诉 HttpClient 以 JSON 格式发送
      contentType: 'json',
      data: {
        expire_seconds: 60,
        action_name: 'QR_SCENE',
        action_info: {
          scene: {
            scene_id: scene,
          },
        },
      },
      // 明确告诉 HttpClient 以 JSON 格式处理返回的响应 body
      dataType: 'json',
    });
    ctx.logger.info('service getTemporaryQrcode result:', result);
    return result;
  }

  // ticket 换取 二维码 链接
  ticketExchangeQRcode(ticket) {
    return `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${encodeURIComponent(ticket)}`;
  }

  // 长链接转换成端链接
  async longUrlConvertShortUrl(access_token, long_url) {
    const { ctx } = this;
    ctx.logger.info('service longUrlConvertShortUrl');
    const result = await ctx.curl(`https://api.weixin.qq.com/cgi-bin/shorturl?access_token=${access_token}`, {
      method: 'POST',
      contentType: 'json',
      // 通过 contentType 告诉 HttpClient 以 JSON 格式发送
      data: {
        action: 'long2short',
        long_url,
      },
      dataType: 'json',
    });
    ctx.logger.info('service longUrlConvertShortUrl result:', result);
    return result;
  }

  // 拉取用户信息
  async getUserInfo(access_token, openid) {
    const { ctx } = this;
    ctx.logger.info('service getUserInfo');
    const result = await ctx.curl(`https://api.weixin.qq.com/cgi-bin/user/info?access_token=${access_token}&openid=${openid}&lang=zh_CN`, {
      dataType: 'json',
    });
    ctx.logger.info('service getUserInfo result:', result);
    return result;
  }
}

module.exports = WechatService;
