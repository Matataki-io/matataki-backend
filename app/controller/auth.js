'use strict';

const Controller = require('../core/base_controller');

const moment = require('moment');
const ecc = require('eosjs-ecc');
const base64url = require('base64url');
const jwt = require('jwt-simple');
const ONT = require('ontology-ts-sdk');
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

  async auth() {

    // 1. 取出签名
    const { username, publickey, sign, platform = 'eos', source = "ss"} = this.ctx.request.body;

    // create user if not exit
    let user = await this.get_or_create_user(username, platform, source);

    if ('eos' === platform) {
      await this.eos_auth(sign, username, publickey, user);
    } else if ('ont' === platform) {
      await this.ont_auth(sign, username, publickey, user);
    } else {
      this.ctx.body = this.ctx.msg.unsupportedPlatform;
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

    //由于EOS的帐号系统是 username 和 公钥绑定的关系，所有要多加一个验证，username是否绑定了签名的EOS公钥

    try {
      let eosacc = await this.eosClient.getAccount(username);

      let pass_permission_verify = false;

      for (let i = 0; i < eosacc.permissions.length; i++) {
        let permit = eosacc.permissions[i];
        let keys = permit.required_auth.keys;
        for (let j = 0; j < keys.length; j++) {
          let pub = keys[j].key;
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
    var expires = moment().add(7, "days").valueOf();

    var token = jwt.encode({
      iss: username,
      exp: expires,
      platform: user.platform,
      id: user.id,
    }, this.app.config.jwtTokenSecret);

    this.ctx.body = token;
  }

  async ont_auth(sign, username, publickey, user) {

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
  }

  async githubLogin() {
    const ctx = this.ctx;
    const { code = null } = ctx.request.body;
    if (code === null) {
      ctx.body = ctx.msg.paramsError;
      // ctx.body.data = this.service.auth.generateRedirectUrl;
      return;
    }
    const usertoken = await this.service.auth.verifyCode(code);
    if (usertoken === null) {
      ctx.body = ctx.msg.authCodeInvalid;
      return;
    }
    const userinfo = await this.service.auth.getGithubUser(usertoken.access_token);
    if (userinfo === null) {
      ctx.body = ctx.msg.generateTokenError;
      return;
    }
    const jwttoken = await this.service.auth.saveUser(userinfo.login, userinfo.name, userinfo.avatar_url);
    if (jwttoken === null) {
      ctx.body = ctx.msg.generateTokenError;
      return;
    }
    ctx.body = jwttoken;
  }

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

  async sendCaptcha() {
    const ctx = this.ctx;
    const { email = null } = ctx.request.query;
    if (!email) {
      ctx.body = ctx.msg.paramsError;
      return;
    }
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

  async regUser() {
    const ctx = this.ctx;
    const ipaddress = ctx.header['x-real-ip'];
    const { email = null, captcha = null, password = null } = ctx.request.body;
    if (!email || !captcha || !password) {
      ctx.body = ctx.msg.paramsError;
      return;
    }
    const userExistence = await this.service.auth.verifyUser(email);
    if (userExistence) {
      ctx.body = ctx.msg.alreadyRegisted;
      return;
    }
    const regResult = await this.service.auth.doReg(email, captcha, password, ipaddress);
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

  async accountLogin() {
    const ctx = this.ctx;
    const ipaddress = ctx.header['x-real-ip'];
    const { username = null, password = null } = ctx.request.body;
    if (!username || !password) {
      ctx.body = ctx.msg.paramsError;
      return;
    }
    const loginResult = await this.service.auth.verifyLogin(username, password, ipaddress);
    switch (loginResult) {
      case 1:
        ctx.body = ctx.msg.userNotExist;
        break;
      case 2:
        ctx.body = ctx.msg.passwordWrong;
        break;
      case 3:
        ctx.body = ctx.msg.failure;
        break;
      default:
        ctx.body = ctx.msg.success;
        ctx.body.data = loginResult;
        break;
    }
  }
}

module.exports = AuthController;
