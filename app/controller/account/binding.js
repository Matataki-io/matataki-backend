'use strict';

const Controller = require('../../core/base_controller');

class AccountBindingController extends Controller {
  /**
   * 添加账号绑定
   * @memberof AccountBindingController
   */
  async binding() {
    const { ctx } = this;
    const uid = ctx.user.id;
    const { account, platform, password_hash = null } = ctx.request.body;
    let createParams = {
      uid, account, platform,
    };
    if (platform === 'email') {
      createParams = {
        ...createParams,
        password_hash,
      };
    }
    const result = await ctx.service.account.binding.create(createParams);
    if (result) {
      ctx.body = {
        ...ctx.msg.success,
      };
    } else {
      ctx.body = {
        ...ctx.msg.failure,
      };
    }
  }
  /**
   * 接触账号绑定
   * @memberof AccountBindingController
   */
  async unbinding() {
    const { ctx } = this;
    const uid = ctx.user.id;
    const { account, platform, password_hash = null } = ctx.request.body;
    const userAccount = await ctx.service.account.binding.get(uid, platform);
    // 验证账号 todo
    if (userAccount.account !== account) {
      ctx.body = {
        ...ctx.msg.failure,
      };
      return;
    }
    // 邮箱账号验证密码
    if (platform === 'email' && userAccount.password_hash !== password_hash) {
      ctx.body = {
        ...ctx.msg.failure,
      };
      return;
    }
    const result = await ctx.service.account.binding.del({ uid, platform });
    if (result) {
      ctx.body = {
        ...ctx.msg.success,
      };
    } else {
      ctx.body = {
        ...ctx.msg.failure,
      };
    }
  }

  /**
   * 修改主账号
   * @memberof AccountBindingController
   */
  async changeMainAccount() {
    const { ctx } = this;
    const uid = ctx.user.id;
    const { account, platform, password_hash = null } = ctx.request.body;
    const userAccount = await ctx.service.account.binding.get(uid, platform);
    // 验证账号 todo
    if (userAccount.account !== account) {
      this.logger.error('controller.account.binding.changeMainAccount failed1', account);
      ctx.body = {
        ...ctx.msg.failure,
      };
      return;
    }
    // 邮箱账号验证密码
    if (platform === 'email' && userAccount.password_hash !== password_hash) {
      this.logger.error('controller.account.binding.changeMainAccount failed2', account);
      ctx.body = {
        ...ctx.msg.failure,
      };
      return;
    }
    const result = await ctx.service.account.binding.updateMain({ uid, platform });
    if (result) {
      ctx.body = {
        ...ctx.msg.success,
      };
    } else {
      this.logger.error('controller.account.binding.changeMainAccount failed3', account);
      ctx.body = {
        ...ctx.msg.failure,
      };
    }
  }
}

module.exports = AccountBindingController;
