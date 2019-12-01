'use strict';

const Controller = require('../../core/base_controller');

/**
 * @todo 都是坑
 */
class AccountBindController extends Controller {

  /**
   * @todo 都是坑
   */
  async getMyBindcode() {
    const { ctx } = this;
    const { id, platform } = ctx.params;
    const currentUser = await this.app.mysql.get('users', { id });
    /** { uid, platform, challengeText } */
    const request = this.service.account.bind.generateBindingRequest(currentUser, platform);
    // @todo 都是坑
    // if (request === null) {
    //  ctx.body = ctx.msg.???;
    //  return;
    // }

    ctx.body = ctx.msg.success;
    // 比照 /user/:id ，對方已有資訊不再傳遞
    ctx.body.data = { challengeText: request.challengeText };
  }
  /**
   * @todo 都是坑
   */
  async getMyBindStatus() {
    const { ctx } = this;
    const { id } = ctx.params;
    // @todo
  }

  /**
   * 這是給 bot 收到後，轉交給後端用的？
   * @todo 都是坑
   */
  async setBindData() {
    const { ctx } = this;
    const { id, platform } = ctx.params;
    // @todo

  }
}

module.exports = AccountBindController;
