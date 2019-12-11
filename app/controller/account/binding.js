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
    let { code, platform, password_hash = null, sign, username, publickey, msgParams } = ctx.request.body;
    // username = account;

    let flag = false;
    switch (platform) {
      case 'eos': {
        flag = await this.service.auth.eos_auth(sign, username, publickey);
        break;
      }
      case 'ont': {
        flag = await this.service.auth.eos_auth(sign, username, publickey);
        break;
      }
      case 'vnt': {
        flag = true;
        break;
      }
      case 'eth': {
        flag = this.service.ethereum.signatureService.verifyAuth(sign, msgParams, publickey);
        username = publickey;
        break;
      }
      case 'github': {
        const usertoken = await this.service.auth.verifyCode(code);
        if (usertoken === null) {
          flag = false;
        }
        // const userinfo = await this.service.auth.getGithubUser(usertoken.access_token);
        break;
      }
      case 'weixin': {
        flag = true;
        break;
      }
      case 'email': {
        flag = true;
        break;
      }
      default: {
        ctx.body = ctx.msg.unsupportedPlatform;
        return;
      }
    }

    if (!flag) {
      this.ctx.body = ctx.msg.failure;
      return;
    }

    let createParams = {
      uid, account: username, platform,
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
