'use strict';

const Controller = require('../../core/base_controller');

class AccountBindController extends Controller {
  // @todo 都是坑

  async getMyBindcode() {
    // @todo 都是坑

    const { ctx } = this;
    const { id, platform } = ctx.params;
    const currentUser = await this.app.mysql.get('users', { id });
    this.service.account.bind.generateBindingRequest(currentUser, platform);
  }

  async getMyBindStatus() {
    // @todo 都是坑

    const { ctx } = this;
    const { id } = ctx.params;
    // @todo
  }

  async setBindData() {
    // @todo 都是坑

    const { ctx } = this;
    const { id, platform } = ctx.params;
    // @todo

  }
}

module.exports = AccountBindController;
