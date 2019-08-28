'use strict';

const Controller = require('../core/base_controller');

const moment = require('moment');
const ecc = require('eosjs-ecc');
const base64url = require('base64url');
const jwt = require('jwt-simple');
// const ONT = require('ontology-ts-sdk');
const EOS = require('eosjs');
const axios = require('axios');

class AuthController extends Controller {

  constructor(ctx) {
    super(ctx);
    this.eosClient = EOS({
      chainId: ctx.app.config.eos.chainId,
      httpEndpoint: ctx.app.config.eos.httpEndpoint,
    });
  }

  // eos、ont登录，首次登录自动注册
  async auth() {

    // 1. 取出签名
    const { username, publickey, sign, platform = 'eos', source = 'ss', referral = 0 } = this.ctx.request.body;

    // create user if not exit
    // todo：待优化，应该在验证签名成功后再创建用户
    const user = await this.get_or_create_user(username, platform, source, referral);

    if (platform === 'eos') {
      await this.eos_auth(sign, username, publickey, user);
    } else if (platform === 'ont') {
      await this.ont_auth(sign, username, publickey, user);
    } else {
      this.ctx.body = this.ctx.msg.unsupportedPlatform;
    }

  }

  // eos、ont登录，首次登录自动注册
  async get_or_create_user(username, platform, source, referral) {
    try {
      let user = await this.app.mysql.get('users', { username, platform });

      if (!user) {
        await this.service.auth.insertUser(username, '', platform, source, this.clientIP, '', referral);
        // const newuser = await this.app.mysql.insert('users', {
        //   username,
        //   platform,
        //   source,
        //   create_time: moment().format('YYYY-MM-DD HH:mm:ss'),
        // });
        user = await this.app.mysql.get('users', { username, platform });
        // await this.service.search.importUser(user.id);
      }

      // login log
      // await this.app.mysql.insert('users_login_log', {
      //   uid: user.id,
      //   ip: this.ctx.header['x-real-ip'],
      //   source,
      //   login_time: moment().format('YYYY-MM-DD HH:mm:ss'),
      // });
      // 插入登录日志
      await this.service.auth.insertLoginLog(user.id, this.clientIP);

      return user;
    } catch (err) {
      return null;
    }
  }

  async eos_auth(sign, username, publickey, user) {
    // 2. 验证签名
    try {
      const recover = ecc.recover(sign, username);

      if (recover !== publickey) {
        this.ctx.body = this.ctx.msg.invalidSignature;
        return;
      }

    } catch (err) {
      this.ctx.body = this.ctx.msg.invalidSignature;
      return;
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
        this.ctx.body = this.ctx.msg.signatureVerifyFailed;
        return;
      }

    } catch (err) {
      this.ctx.body = this.ctx.msg.signatureVerifyFailed;
      return;
    }

    // 3. 签名有效，生成accessToken . accessToken = username + date + secret (JWT format)
    const expires = moment().add(7, 'days').valueOf();

    const token = jwt.encode({
      iss: username,
      exp: expires,
      platform: user.platform,
      id: user.id,
    }, this.app.config.jwtTokenSecret);

    this.ctx.body = token;
  }

  async ont_auth(sign, username, publickey, user) {
    /*
        const pub = new ONT.Crypto.PublicKey(publickey);

        const msg = ONT.utils.str2hexstr(username);

        const signature = ONT.Crypto.Signature.deserializeHex(sign);

        const pass = pub.verify(msg, signature);

        if (pass) {

          // 3. 签名有效，生成accessToken . accessToken = username + date + secret (JWT format)
          var expires = moment().add(7, "days").valueOf();

          var token = jwt.encode({
            iss: username,
            exp: expires,
            platform: user.platform,
            id: user.id,
          }, this.app.config.jwtTokenSecret);

          this.ctx.body = token;

        } else {
          this.ctx.body = this.ctx.msg.invalidSignature;
        }
        // curl -d "platform=ont&publickey=0205c8fff4b1d21f4b2ec3b48cf88004e38402933d7e914b2a0eda0de15e73ba61&username=helloworld&sign=010936f0693e83d5d605816ceeeb4872d8a343d4c7350ef23e49614e0302d94d6f6a4af73e20ed9c818c0be6865e6096efc7b9f98fa42a33f775ff0ea1cb17703a" -H "Authorization: Basic bXlfYXBwOm15X3NlY3JldA==" -v -X POST http://127.0.0.1:7001/auth
      */
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
    ctx.body = jwttoken;
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

  // todo：增加geetest，防刷，改为post
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
    const mail = await this.service.auth.sendCaptchaMail(email);
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
    const loginResult = await this.service.auth.verifyLogin(username, password, this.clientIP);
    switch (loginResult) {
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
        ctx.body.data = loginResult;
        break;
    }
  }
}

module.exports = AuthController;
