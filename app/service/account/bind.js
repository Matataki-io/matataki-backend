'use strict';
const Service = require('egg').Service;
const crypto = require('crypto');


class AccountBindingService extends Service {

  /**
   * generateBindingRequest, 生成绑定的请求,每次调用都会重新生成 challengeText
   * @param {object} currentUser 当前用户对象
   * @param {string} platform 第三方帐户平台
   * @return {object} { uid, platform, challengeText }
   */
  async generateBindingRequest(currentUser, platform) {
    const { id } = currentUser;
    // 检测该用户有没有绑定这个 platform 的记录
    let request = await this.app.mysql.get('user_third_party', { uid: id, platform });
    if (request && request.platform_id) throw Error('You have bind this platform already');
    else {
      const challengeText = crypto.randomBytes(23).toString('hex');
      request = {
        uid: id,
        platform,
        challengeText,
      };
      await this.app.mysql.insert('user_third_party', request);
      return request;
    }
  }

  async bindByEth(sig, msgParams, publickey) {
    // @todo
    this.service.blockchain.eth.signatureService.verifyAuth(sig, msgParams, publickey);
  }
}

module.exports = AccountBindingService;
