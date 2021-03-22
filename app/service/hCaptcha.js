'use strict';

const Service = require('egg').Service;
const hCaptcha = require('hcaptcha');

class HCaptchaService extends Service {
  async isUserInWhiteList(uid) {
    // 写死了，no_captcha 为 0，user 则为 null
    const user = await this.app.mysql.get('users', { id: uid, no_captcha: 1 });
    return Boolean(user);
  }

  /**
   * isAssetsMeetsRequirements 检查用户是否资产达标
   * @param {number} uid 用户的 ID
   * @param {number} theMinimum 最小限额，记得是包含小数点部分的整数 如 1CNY 则为 10000
   * @return {Promise<Boolean>} 该用户是否资产达标
   */
  async isAssetsMeetsRequirements(uid, theMinimum) {
    const asset = await this.app.mysql.get('assets', { uid, symbol: 'CNY' });
    return asset && asset.amount >= theMinimum;
  }

  async checkIsWaiverOfVerification(uid) {
    const isInWhiteList = await this.isUserInWhiteList(uid);
    if (isInWhiteList) return true;
    const MINIMUN_REQUIREMENT_FOR_CNY_DEPOSIT = 10000; // 1.0000 CNY
    const isCnyBalanceGtLimit = await this.isAssetsMeetsRequirements(uid, MINIMUN_REQUIREMENT_FOR_CNY_DEPOSIT);
    if (isCnyBalanceGtLimit) return true;

    // 以上的 check 都无法达标，则为 false
    return false;
  }

  async validate(hCaptchaData = null) {
    const { ctx } = this;
    const { privateKey } = ctx.app.config.hCaptcha;
    const { user } = ctx;

    if (user && user.id) {
      const isWaiver = await this.checkIsWaiverOfVerification(user.id);
      if (isWaiver) return true;
      // 如果不在白名单，且还没 token，当错误处理
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
