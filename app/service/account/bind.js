'use strict';
const Service = require('egg').Service;
const crypto = require('crypto');


class AccountBindingService extends Service {
  /**
   *
   * @param {object} user user object, must have `id`
   * @param {number} user.id user id
   * @param {string} platform target platform
   * @return {Promise<BindRecord>} 用户在 platform 的绑定记录
   */
  getUserBindAtPlatform({ id }, platform) {
    return this.app.mysql.get('user_third_party', { uid: id, platform });
  }
  /**
   * generateBindingRequest, 生成绑定的请求,每次调用都会重新生成 challengeText
   * @param {object} currentUser 当前用户对象
   * @param {object} currentUser.id 当前用户对象 ID
   * @param {string} platform 第三方帐户平台
   * @return {object} { uid, platform, challenge_text }
   */
  async generateBindingRequest({ id }, platform) {
    // 检测该用户有没有绑定这个 platform 的记录
    const request = await this.app.mysql.get('user_third_party', { uid: id, platform });
    if (request && request.platform_id) {
      throw Error('You have bind this platform already');
    } else {
      const challenge_text = crypto.randomBytes(23).toString('hex');
      try {
        await this.app.mysql.update('user_third_party', { challenge_text }, {
          where: { uid: id, platform },
        });
        return {
          platform,
          challenge_text,
        };
      } catch (error) {
        this.ctx.logger.error(error);
        throw error;
      }
    }
  }

  async bindByEth(sig, msgParams, publickey) {
    // @todo
    this.service.blockchain.eth.signatureService.verifyAuth(sig, msgParams, publickey);
  }
}

module.exports = AccountBindingService;
