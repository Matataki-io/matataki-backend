'use strict';

const Controller = require('../core/base_controller');

const EOS = require('eosjs');
const ecc = require('eosjs-ecc');
const moment = require('moment');
var _ = require('lodash');

class SupportController extends Controller {

  constructor(ctx) {
    super(ctx);
    this.eosClient = EOS({
      broadcast: true,
      sign: true,
      chainId: ctx.app.config.eos.chainId,
      keyProvider: [ctx.app.config.eos.keyProvider],
      httpEndpoint: ctx.app.config.eos.httpEndpoint,
    });
  }

  async support() {
    const ctx = this.ctx;
    const { author = '', title = '', content = '', publickey, sign, hash, username, fissionFactor = 2000, cover } = ctx.request.body;

    ctx.logger.info('debug info', author, title, content, publickey, sign, hash, username);

    if (fissionFactor > 2000) {
      // fissionFactor = 2000; // 最大2000
      ctx.body = {
        msg: 'fissionFactor should >= 2000',
      };
      ctx.status = 500;

      return;
    }

    if (!username) {
      ctx.body = {
        msg: 'username required',
      };
      ctx.status = 500;
      return;
    }

    try {
      this.eos_signature_verify(author, hash, sign, publickey);
    } catch (err) {
      ctx.status = 401;
      ctx.body = err.message;
      return;
    }

    const now = moment().format('YYYY-MM-DD HH:mm:ss');

    try {
      const result = await this.app.mysql.insert('posts', {
        author,
        username,
        title,
        public_key: publickey,
        sign,
        hash,
        fission_factor: fissionFactor,
        create_time: now,
        cover: cover // 封面url
      });

      const updateSuccess = result.affectedRows === 1;

      if (updateSuccess) {
        ctx.logger.info('publish success ..');

        ctx.body = {
          msg: 'success',
        };
        ctx.status = 201;

      } else {
        ctx.logger.error('publish err ', err);

        ctx.body = {
          msg: 'publish fail',
        };
        ctx.status = 500;
      }

    } catch (err) {
      ctx.logger.error(err.sqlMessage);
      ctx.body = {
        msg: 'publish error ' + err.sqlMessage,
      };
      ctx.status = 500;
    }
  }

}

module.exports = SupportController;