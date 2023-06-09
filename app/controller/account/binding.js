'use strict';

const Controller = require('../../core/base_controller');
const sha256 = require('crypto-js/sha256');

class AccountBindingController extends Controller {
  /**
   * 添加账号绑定
   * @memberof AccountBindingController
   */
  async binding() {
    const { ctx } = this;
    const uid = ctx.user.id;
    let { code, platform, email, captcha = null, password, sign, username, publickey, msgParams, telegramParams, telegramBotName, oauth_token, oauth_verifier, callbackUrl } = ctx.request.body;
    let access_token = null;
    // username = account;

    let flag = false;
    switch (platform) {
      case 'eos': {
        flag = await this.service.auth.eos_auth(sign, username, publickey);
        break;
      }
      case 'ont': {
        flag = await this.service.auth.ont_auth(sign, username, publickey);
        break;
      }
      case 'eth': {
        flag = this.service.ethereum.signatureService.verifyAuth(sign, msgParams, publickey);
        username = publickey;
        break;
      }
      case 'github': {
        const githubResult = await this.handleGithub(code);
        if (!githubResult) return;
        username = githubResult.userinfo.login;
        access_token = githubResult.usertoken.access_token;
        flag = true;
        break;
      }
      case 'weixin': {
        const weixinResult = await this.handleWeixin(code);
        if (!weixinResult) return;
        username = weixinResult;
        flag = true;
        break;
      }
      case 'email': {
        flag = true;
        break;
      }
      case 'telegram': {
        const telegramResult = this.handleTelegram(telegramBotName, telegramParams);
        username = telegramParams.id;
        flag = telegramResult;
        break;
      }
      case 'twitter': {
        username = await this.handleTwitter(oauth_token, oauth_verifier);
        flag = true;
        break;
      }
      case 'google': {
        username = await this.handleGoogle(code, callbackUrl);
        flag = true;
        break;
      }
      case 'facebook': {
        username = await this.handleFacebook(code, callbackUrl);
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
    if (platform === 'github') {
      const github = await this.app.mysql.get('github', { uid });
      if (!github) {
        // 似乎不需要 create_time？
        // const now = moment().format('YYYY-MM-DD HH:mm:ss');
        this.app.mysql.insert('github', { uid, access_token, /* create_time: now */ });
      } else {
        this.app.mysql.update('github', { access_token }, {
          where: { uid }
        })
      }
    }
    if (result) {
      ctx.body = {
        ...ctx.msg.success,
      };
    } else {
      ctx.body = {
        ...ctx.msg.accountBinded,
      };
    }
  }

  /**
   * 处理github绑定
   * @param {*} code 。。
   * @return {*} [{userinfo, usertoken}][false]
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
    this.logger.info('controller: Account binding:: handleGithub: %j', userinfo);
    return { userinfo, usertoken };
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
    this.logger.info('controller: Account binding:: handleWeixin: %j', accessTokenResult);
    return accessTokenResult.data.openid;
  }

  async handleTelegram(botName, user) {
    const telegramBot = this.config.telegramBot;
    if (!telegramBot[botName]) return false;
    return this.service.auth.telegram_auth(telegramBot[botName], user);
  }

  async handleTwitter(oauth_token, oauth_verifier) {
    const authtokens = await this.service.auth.twitter_auth(oauth_token, oauth_verifier);
    const loginResult = await this.service.auth.twitter_login(authtokens.oauth_token, authtokens.oauth_token_secret);

    return loginResult.screen_name;
  }

  async handleGoogle(code, callbackUrl) {
    const loginResult = await this.service.auth.googleLogin(code, callbackUrl);

    return loginResult.email;
  }
  async handleFacebook(code, callbackUrl) {
    const loginResult = await this.service.auth.facebookLogin(code, callbackUrl);

    return loginResult.id;
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
    const { account, platform, password = null } = ctx.request.body;
    if (!account || !platform) {
      ctx.body = ctx.msg.paramsError;
      return;
    }
    const userAccount = await ctx.service.account.binding.get(uid, platform);
    // 验证账号 todo
    if (userAccount.account !== account) {
      ctx.body = {
        ...ctx.msg.failure,
      };
      return;
    }
    // 邮箱账号验证密码
    const passwordHash = sha256(password).toString();
    if (platform === 'email' && userAccount.password_hash !== passwordHash) {
      ctx.body = {
        ...ctx.msg.failure,
      };
      return;
    }
    const result = await ctx.service.account.binding.del({ uid, platform });
    let msg = ctx.msg.success;
    if (result === 0) {
      msg = ctx.msg.success;
    } else if (result === 1) {
      msg = {
        ...ctx.msg.failure,
        message: '账号不存在',
      };
    } else if (result === 2) {
      msg = {
        ...ctx.msg.failure,
        message: '主账号下面还有其他账号',
      };
    } else if (result === 3) {
      msg = {
        ...ctx.msg.failure,
        message: '账号删除失败',
      };
    } else {
      msg = {
        code: 999,
        message: result,
      };
    }
    ctx.body = msg;
  }

  /**
   * 修改主账号
   * @memberof AccountBindingController
   */
  async changeMainAccount() {
    const { ctx } = this;
    const uid = ctx.user.id;
    const { account, platform, password = null } = ctx.request.body;
    if (!account || !platform) {
      ctx.body = ctx.msg.paramsError;
      return;
    }
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
    const passwordHash = sha256(password).toString();
    if (platform === 'email' && userAccount.password_hash !== passwordHash) {
      this.logger.error('controller.account.binding.changeMainAccount failed2', { password_hash: userAccount.password_hash, account, passwordHash });
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
