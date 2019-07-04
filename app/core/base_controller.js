'use strict';

const { Controller } = require('egg');
const jwt = require('jwt-simple');
const moment = require('moment');
const EOS = require('eosjs');
const ecc = require('eosjs-ecc');
var _ = require('lodash');
const ONT = require('ontology-ts-sdk');
class BaseController extends Controller {

  constructor(ctx) {
    super(ctx);
    if (!this.app.read_cache) {
      this.app.read_cache = {};
    }
    if (!this.app.value_cache) {
      this.app.value_cache = {};
    }
    if (!this.app.ups_cache) {
      this.app.ups_cache = {};
    }
    if (!this.app.post_cache) {
      this.app.post_cache = {};
    }
    this.eosClient = EOS({
      chainId: ctx.app.config.eos.chainId,
      httpEndpoint: ctx.app.config.eos.httpEndpoint,
    });
  }

  get user() {
    return this.ctx.session.user;
  }

  success(data) {
    this.ctx.body = {
      success: true,
      data,
    };
  }

  notFound(msg) {
    msg = msg || 'not found';
    this.ctx.throw(404, msg);
  }

  response(code, msg) {
    this.ctx.status = code;
    this.ctx.body = { msg: msg, code: code };
  }

  checkAuth(username) {
    console.log("checkAuth..", username);

    var token = this.ctx.request.header['x-access-token'];
    if (!token) {
      throw new Error("no access_token");
    }

    // 校验 token， 解密， 验证token的可用性 ，检索里面的用户
    try {
      var decoded = jwt.decode(token, this.app.config.jwtTokenSecret);

      if (decoded.exp <= Date.now()) {
        throw new Error("invaid access_token: expired");
      }

      if (username && username !== decoded.iss) {
        throw new Error("invaid access_token: wrong user");
      }

      return decoded.iss;
    } catch (err) {
      console.log("access token decode err", err);
      throw err;
    }
  }

  get_current_user() {
    var token = this.ctx.request.header['x-access-token'];

    if (!token) {
      return null;
    }

    try {
      var decoded = jwt.decode(token, this.app.config.jwtTokenSecret);
      return decoded.iss;
    } catch (err) {
      return null;
    }
  }

  async get_user() {
    const current_user = this.get_current_user();

    try {
      this.checkAuth(current_user);
    } catch (err) {
      throw err;
    }

    let user = await this.app.mysql.get('users', { username: current_user });

    if (!user) {

      let newuser = await this.app.mysql.insert('users', {
        username: current_user,
        create_time: moment().format('YYYY-MM-DD HH:mm:ss')
      });

      user = await this.app.mysql.get('users', { username: current_user });
    }

    return user;
  }

  async get_referrer(referrer) {
    let user = null;
    try {
      user = await this.app.mysql.get('users', { id: referrer });
      return user;
    } catch (err) {
      return null;
    }
  }

  async get_or_create_user(username, platform, source) {
    try {
      let user = await this.app.mysql.get('users', { username: username });

      if (!user) {
        let newuser = await this.app.mysql.insert('users', {
          username: username,
          platform: platform,
          source: source,
          create_time: moment().format('YYYY-MM-DD HH:mm:ss')
        });
        user = await this.app.mysql.get('users', { username: username });
      }

      // login log 
      await this.app.mysql.insert('users_login_log', {
        uid: user.id,
        ip: this.ctx.ip,
        source: source,
        login_time: moment().format('YYYY-MM-DD HH:mm:ss')
      });

      return user;
    } catch (err) {
      return null;
    }
  }

  async eos_signature_verify(author, sign_data, sign, publickey) {
    try {
      let eosacc = await this.eosClient.getAccount(author);

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
        throw new Error("permission verify failuree");
      }

    } catch (err) {
      throw new Error("eos username verify failure");
    }

    try {
      const recover = ecc.recover(sign, sign_data);
      if (recover !== publickey) {
        throw new Error("invalid signature");
      }
    } catch (err) {
      throw new Error("invalid signature " + err);
    }
  }

  async ont_signature_verify(msg, sign, publickey) {
    try {
      const pub = new ONT.Crypto.PublicKey(publickey);

      const signature = ONT.Crypto.Signature.deserializeHex(sign);

      const pass = pub.verify(msg, signature);

      if (!pass) {
        throw new Error("invalid ont signature");
      }
    } catch (err) {
      throw err;
    }
  }

}
module.exports = BaseController;