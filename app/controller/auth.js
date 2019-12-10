'use strict';

const Controller = require('../core/base_controller');

const ecc = require('eosjs-ecc');
const ONT = require('ontology-ts-sdk');
const EOS = require('eosjs');

class AuthController extends Controller {

  constructor(ctx) {
    super(ctx);
    this.eosClient = EOS({
      chainId: ctx.app.config.eos.chainId,
      httpEndpoint: ctx.app.config.eos.httpEndpoint,
    });
  }

  // eos、ont、eth登录，首次登录自动注册
  async auth() {
    const ctx = this.ctx;
    // 1. 取出签名
    let { username, publickey, sign,
      platform = 'eos', source = 'ss', referral = 0,
      msgParams = {} } = ctx.request.body;

    let flag = false;
    if (platform === 'eos') {
      flag = await this.eos_auth(sign, username, publickey);
    } else if (platform === 'ont') {
      flag = await this.ont_auth(sign, username, publickey);
    } else if (platform === 'vnt') {
      flag = await this.vnt_auth(sign, username, publickey);
    } else if (platform === 'eth') {
      // 以太坊没用户名, 使用 msgParams 及其签名来判断是否真实
      flag = this.service.ethereum.signatureService.verifyAuth(sign, msgParams, publickey);
      //
      username = publickey;
    } else {
      ctx.body = ctx.msg.unsupportedPlatform;
      return;
    }

    if (!flag) {
      this.ctx.body = ctx.msg.failure;
      return;
    }

    // create user if not exit
    const user = await this.get_or_create_user(username, platform, source, referral);
    const jwttoken = this.service.auth.jwtSign(user);
    ctx.body = ctx.msg.success;
    ctx.body.data = jwttoken;
  }

  // eos、ont、eth登录，首次登录自动注册
  async get_or_create_user(username, platform, source, referral) {
    try {
      this.logger.info('get_or_create_user', { username, platform });
      let user = await this.app.mysql.get('users', { username, platform });

      if (!user) {
        const old = await this.fetchOldEthAccount(username);
        // 处理以太坊登录的历史问题
        if (old) return this.handleEthereumHistoricError(old, username);
        await this.service.auth.insertUser(username, '', platform, source, this.clientIP, '', referral);
        user = await this.app.mysql.get('users', { username, platform });
        // await this.service.search.importUser(user.id);
      }
      // 插入登录日志
      await this.service.auth.insertLoginLog(user.id, this.clientIP);

      return user;
    } catch (err) {
      return null;
    }
  }

  fetchOldEthAccount(username) {
    return this.app.mysql.get('users', { username: username.slice(-12), platform: 'eth' });
  }

  handleEthereumHistoricError(old, publicKey) {
    this.logger.info('handleEthereumHistoricError pk: ', publicKey);
    return this.app.mysql.update('users', { username: publicKey }, { where: { id: old.id, platform: 'eth' } });
  }

  async eos_auth(sign, username, publickey) {
    // 2. 验证签名
    try {
      const recover = ecc.recover(sign, username);
      if (recover !== publickey) {
        return false;
      }
    } catch (err) {
      return false;
    }

    // 由于EOS的帐号系统是 username 和 公钥绑定的关系，所有要多加一个验证，username是否绑定了签名的EOS公钥
    try {
      const eosacc = await this.eosClient.getAccount(username);
      let pass_permission_verify = false;

      for (let i = 0; i < eosacc.permissions.length; i++) {
        const permit = eosacc.permissions[i];
        const keys = permit.required_auth.keys;
        for (let j = 0; j < keys.length; j++) {
          const pub = keys[j].key;
          if (publickey === pub) {
            pass_permission_verify = true;
          }
        }
      }

      if (!pass_permission_verify) {
        return false;
      }
    } catch (err) {
      // this.logger.error('AuthController.eos_auth error: %j', err);
      return false;
    }

    return true;
  }

  async ont_auth(sign, username, publickey) {

    const pub = new ONT.Crypto.PublicKey(publickey);

    const msg = ONT.utils.str2hexstr(username);

    const signature = ONT.Crypto.Signature.deserializeHex(sign);

    const pass = pub.verify(msg, signature);

    return pass;

  }

  async vnt_auth(sign, username, publickey) {
    return true;
  }

  // github账号登录，第一次登录会创建账号
  async githubLogin() {
    const ctx = this.ctx;
    const { code = null, referral = 0 } = ctx.request.body;
    if (code === null) {
      ctx.body = ctx.msg.paramsError;
      // ctx.body.data = this.service.auth.generateRedirectUrl;
      return;
    }
    // 验证前端传回的Code， 再取得access token
    const usertoken = await this.service.auth.verifyCode(code);
    if (usertoken === null) {
      ctx.body = ctx.msg.authCodeInvalid;
      return;
    }
    // 由access token再取用户信息
    const userinfo = await this.service.auth.getGithubUser(usertoken.access_token);
    if (userinfo === null) {
      ctx.body = ctx.msg.generateTokenError;
      return;
    }

    // 创建， 设置用户
    const jwttoken = await this.service.auth.saveUser(userinfo.login, userinfo.name, userinfo.avatar_url, this.clientIP, referral);
    if (jwttoken === null) {
      ctx.body = ctx.msg.generateTokenError;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = jwttoken;
  }

  // 微信登陆
  async weixinLogin() {
    const { ctx } = this;
    const { code = null, referral = 0 } = ctx.request.body;
    if (code === null) {
      ctx.body = ctx.msg.paramsError;
      return;
    }
    /* {
      "access_token":"ACCESS_TOKEN",
      "expires_in":7200,
      "refresh_token":"REFRESH_TOKEN",
      "openid":"OPENID",
      "scope":"SCOPE"
    } */
    const accessTokenResult = await ctx.service.wechat.getAccessToken(code);
    if (accessTokenResult.data.errcode) {
      ctx.body = {
        ...ctx.msg.generateTokenError,
        data: accessTokenResult.data,
      };
      return;
    }
    const { access_token, openid } = accessTokenResult.data;
    const userInfo = await ctx.service.wechat.getUserInfo(access_token, openid);
    if (userInfo.data.errcode) {
      ctx.body = {
        ...ctx.msg.generateTokenError,
        data: userInfo.data,
      };
      return;
    }
    /* {
      "openid":" OPENID",
      "nickname": NICKNAME,
      "sex":"1",
      "province":"PROVINCE"
      "city":"CITY",
      "country":"COUNTRY",
      "headimgurl": "http://thirdwx.qlogo.cn/mmopen/g3MonUZtNHkdmzicIlibx6iaFqAc56vxLSUfpb6n5WKSYVY0ChQKkiaJSgQ1dZuTOgvLLrhJbERQQ4eMsv84eavHiaiceqxibJxCfHe/46",
      "privilege":[ "PRIVILEGE1" "PRIVILEGE2"     ],
      "unionid": "o6_bmasdasdsad6_2sgVt7hMZOPfL"
    } */
    // 创建， 设置用户
    const { nickname, headimgurl } = userInfo.data;
    const jwttoken = await this.service.auth.saveUser(openid, nickname, headimgurl, this.clientIP, referral, 'weixin');
    if (jwttoken === null) {
      ctx.body = ctx.msg.generateTokenError;
      return;
    }
    ctx.body = {
      ...ctx.msg.success,
      data: jwttoken,
    };
  }

  // 验证邮箱是否存在
  async verifyReg() {
    const ctx = this.ctx;
    const { email = null } = ctx.request.query;
    if (!email) {
      ctx.body = ctx.msg.paramsError;
      return;
    }
    // if (email.match(/^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/)) {
    //   ctx.body = ctx.msg.paramsError;
    //   return;
    // }
    const result = await this.service.auth.verifyUser(email);
    if (result > 0) {
      ctx.body = ctx.msg.success;
      ctx.body.data = true;
    } else {
      ctx.body = ctx.msg.success;
      ctx.body.data = false;
    }
  }

  // 邮箱注册时发送验证码
  async sendCaptcha() {
    const ctx = this.ctx;
    const { email = null } = ctx.request.query;
    if (!email) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    // 验证用户存在
    const userExistence = await this.service.auth.verifyUser(email);
    if (userExistence) {
      ctx.body = ctx.msg.alreadyRegisted;
      return;
    }
    const emailCheck = /^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/;
    if (!emailCheck.test(email)) {
      ctx.body = ctx.msg.paramsError;
      return;
    }
    // const isBanned = this.service.auth.
    const mail = await this.service.auth.sendRegisteredCaptchaMail(email);
    // ctx.body = ctx.msg.success;
    switch (mail) {
      case 1:
        ctx.body = ctx.msg.captchaRatelimit;
        break;
      case 0:
        ctx.body = ctx.msg.success;
        break;
      default:
        ctx.body = ctx.msg.failure;
    }
    // if (mail === 0) {
    //   ctx.body = ctx.msg.success;
    //   return;
    // }
    // ctx.body = ctx.msg.failure;
  }
  async sendResetCaptcha() {
    const ctx = this.ctx;
    const { email = null } = ctx.request.query;
    if (!email) {
      ctx.body = ctx.msg.paramsError;
      return;
    }
    const emailCheck = /^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/;
    if (!emailCheck.test(email)) {
      ctx.body = ctx.msg.paramsError;
      return;
    }
    const mail = await this.service.auth.sendResetpasswordCaptchaMail(email);
    switch (mail) {
      case 1:
        ctx.body = ctx.msg.captchaRatelimit;
        break;
      case 0:
        ctx.body = ctx.msg.success;
        break;
      default:
        ctx.body = ctx.msg.failure;
    }
  }

  // 重置密码
  async resetPassword() {
    const ctx = this.ctx;
    const { email = null, captcha = null, password = null } = ctx.request.body;
    if (!email || !captcha || !password) {
      ctx.body = ctx.msg.paramsError;
      return;
    }
    // 验证用户是否存在
    const userExistence = await this.service.auth.verifyUser(email);
    if (!userExistence) {
      ctx.body = ctx.msg.userNotExist;
      return;
    }
    const regResult = await this.service.auth.resetPassword(email, captcha, password);
    switch (regResult) {
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
  }

  // 邮箱注册
  async regUser() {
    const ctx = this.ctx;
    // const ipaddress = ctx.header['x-real-ip'];
    const { email = null, captcha = null, password = null, referral = 0 } = ctx.request.body;
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
    // 注册， 写入信息
    const regResult = await this.service.auth.doReg(email, captcha, password, this.clientIP, referral);
    switch (regResult) {
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
  }

  // 账户密码登录，目前只有邮箱账号是密码登录
  async accountLogin() {
    const ctx = this.ctx;
    const { username = null, password = null } = ctx.request.body;
    if (!username || !password) {
      ctx.body = ctx.msg.paramsError;
      return;
    }
    const jwttoken = await this.service.auth.verifyLogin(username, password, this.clientIP);
    switch (jwttoken) {
      case 1:
        ctx.body = ctx.msg.passwordWrong;
        break;
      case 2:
        ctx.body = ctx.msg.passwordWrong;
        break;
      case 3:
        ctx.body = ctx.msg.passwordWrong;
        break;
      default:
        ctx.body = ctx.msg.success;
        ctx.body.data = jwttoken;
        break;
    }
  }
}

module.exports = AuthController;
