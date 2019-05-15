'use strict';

const Controller = require('../core/base_controller');

const moment = require('moment');
const ecc = require('eosjs-ecc');
const base64url = require('base64url');
const jwt = require('jwt-simple');
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

  async auth() {

    // 1. 取出签名
    const { username, publickey, sign, platform = 'eos'} = this.ctx.request.body;

    // create user if not exit
    let user = await this.get_or_create_user(username, platform);

    if ('eos' === platform) {
      await this.eos_auth(sign, username, publickey, user);
    } else if ('ont' === platform) {
      await this.ont_auth(sign, username, publickey, user);
    } else {
      this.ctx.status = 401;
      this.ctx.body = 'platform not support';
    }

  }

  async eos_auth(sign, username, publickey, user) {
    // 2. 验证签名
    try {
      const recover = ecc.recover(sign, username);

      if (recover !== publickey) {
        this.ctx.body = { msg: 'invalid signature' };
        this.ctx.status = 500;
        return;
      }

    } catch (err) {
      this.ctx.body = { msg: 'invalid signature ' + err };
      this.ctx.status = 500;
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
        this.ctx.body = { msg: 'permission verify failure ' };
        this.ctx.status = 500;
        return;
      }

    } catch (err) {
      this.ctx.body = { msg: 'eos username verify failure ' };
      this.ctx.status = 500;
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
      this.ctx.body = { msg: 'invalid signature' };
      this.ctx.status = 500;
    }

    // curl -d "platform=ont&publickey=0205c8fff4b1d21f4b2ec3b48cf88004e38402933d7e914b2a0eda0de15e73ba61&username=helloworld&sign=010936f0693e83d5d605816ceeeb4872d8a343d4c7350ef23e49614e0302d94d6f6a4af73e20ed9c818c0be6865e6096efc7b9f98fa42a33f775ff0ea1cb17703a" -H "Authorization: Basic bXlfYXBwOm15X3NlY3JldA==" -v -X POST http://127.0.0.1:7001/auth


  }

}

module.exports = AuthController;