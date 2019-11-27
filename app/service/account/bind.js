'use strict';
const Service = require('egg').Service;
const crypto = require('crypto');


class AccountBindingService extends Service {
  /**
      * generateBindingRequest, 生成绑定的请求,每次调用都会重新生成 challengeText
      * @param {object} currentUser 当前用户对象
      * @param {string} platform 第三方帐户平台
      */
  async generateBindingRequest(currentUser, platform) {
    const { id } = currentUser;
    let request = await this.app.mysql.get('user_third_party', { uid: id, platform });
    if (!request) {
      const challengeText = crypto.randomBytes(23).toString('hex');
      request = {
        uid: id,
        platform,
        challengeText,
      };
      await this.app.mysql.insert('user_third_party', request);
      return request;
    }
    if (request.platform_id) throw Error('You have bind already');
    else {
    // @todo 都是坑

    }

  }

  async bindByEth(sig, msgParams, publickey) {
    // @todo
    this.service.blockchain.eth.signatureService.verifyAuth(sig, msgParams, publickey);
  }
}

module.exports = AccountBindingService;
