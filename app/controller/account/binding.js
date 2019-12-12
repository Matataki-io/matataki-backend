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
    let { code, platform, email, captcha = null, password, sign, username, publickey, msgParams } = ctx.request.body;
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
        const githubResult = this.handleGithub(code);
        if (!githubResult) return;
        username = githubResult;
        break;
      }
      case 'weixin': {
        const weixinResult = this.handleWeixin(code);
        if (!weixinResult) return;
        username = weixinResult;
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

    if (platform === 'email') {
      return this.handleEmail(email, captcha, password, uid);
    }
    const result = await ctx.service.account.binding.create({
      uid, account: username, platform,
    });
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
   * 处理github绑定
   * @param {*} code 。。
   * @return {*} [username][false]
   * @memberof AccountBindingController
   */
  async handleGithub(code) {
    const { ctx } = this;
    const usertoken = await this.service.auth.verifyCode(code);
    if (usertoken === null) {
      ctx.body = ctx.msg.authCodeInvalid;
      return false;
    }
    // 由access token再取用户信息
    const userinfo = await this.service.auth.getGithubUser(usertoken.access_token);
    if (userinfo === null) {
      ctx.body = ctx.msg.generateTokenError;
      return false;
    }
    return userinfo.login;
  }

  /**
   * 处理微信绑定
   * @param {*} code 。。
   * @return {*} [openid][false]
   * @memberof AccountBindingController
   */
  async handleWeixin(code) {
    const { ctx } = this;
    const accessTokenResult = await ctx.service.wechat.getAccessToken(code);
    if (accessTokenResult.data.errcode) {
      ctx.body = {
        ...ctx.msg.generateTokenError,
        data: accessTokenResult.data,
      };
      return false;
    }
    return accessTokenResult.data.openid;
  }

  /**
   * 处理邮箱绑定
   * @param {*} [email=null] .
   * @param {*} [captcha=null] .
   * @param {*} [password=null] .
   * @param {*} uid .
   * @memberof AccountBindingController
   */
  async handleEmail(email = null, captcha = null, password = null, uid) {
    const { ctx } = this;
    if (!email || !captcha || !password) {
      ctx.body = ctx.msg.paramsError;
      return;
    }
    // 验证用户需要不存在
    const userExistence = await this.service.auth.verifyUser(email);
    if (userExistence) {
      ctx.body = ctx.msg.alreadyRegisted;
      return;
    }
    const emailResult = await this.service.account.binding.createEmailAccount({
      email, captcha, password, uid,
    });
    switch (emailResult) {
      case 1:
        ctx.body = ctx.msg.captchaWrong;
        break;
      case 2:
        ctx.body = ctx.msg.captchaWrong;
        break;
      case 3:
        ctx.body = ctx.msg.captchaWrong;
        break;
      case 5:
        ctx.body = ctx.msg.failure;
        break;
      case 0:
        ctx.body = ctx.msg.success;
        break;
      default:
        ctx.body = ctx.msg.failure;
    }
    return;
  }
  /**
   * 解除账号绑定
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

  /**
   * 账号列表
   * @memberof AccountBindingController
   */
  async list() {
    const { ctx } = this;
    const uid = ctx.user.id;
    const result = await this.service.account.binding.getListByUid(uid);
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }
}

module.exports = AccountBindingController;
