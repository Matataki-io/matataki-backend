'use strict';

const Service = require('egg').Service;
const hCaptcha = require('hcaptcha');

class HCaptchaService extends Service {
  async isUserInWhiteList(uid) {
    // 写死了，no_captcha 为 0，user 则为 null
    const user = await this.app.mysql.get('users', { id: uid, no_captcha: 1 });
    return Boolean(user);
  }

  async validate(hCaptchaData = null) {
    const { ctx } = this;
    const { privateKey } = ctx.app.config.hCaptcha;
    const { user } = ctx;

    if (user && user.id) {
      const isInWhiteList = await this.isUserInWhiteList(user.id);
      if (isInWhiteList) return true;
      // 如果不在白名单，还没 token，当错误处理
      else if (!hCaptchaData) return false;
    }

    try {
      if (!hCaptchaData.token) throw new Error('Bad Captcha');
      const verifiedCaptchaData = await hCaptcha.verify(privateKey, hCaptchaData.token);
      if (!verifiedCaptchaData.success) throw new Error('Bad Captcha');
      return true;
    } catch (error) {
      return false;
    }
  }

}

module.exports = HCaptchaService;
