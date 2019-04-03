'use strict';

const Controller = require('../core/base_controller');

const EOS = require('eosjs');
const ecc = require('eosjs-ecc');
const moment = require('moment');
var _ = require('lodash');

class PostController extends Controller {

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

  async publish() {
    const ctx = this.ctx;
    const { author = '', title = '', content = '', publickey, sign, hash, username, fissionFactor = 2000 } = ctx.request.body;

    ctx.logger.info('debug info', author, title, content, publickey, sign, username);

    if (fissionFactor > 2000) {
      // fissionFactor = 2000; // 最大2000
      ctx.body = {
        msg: 'fissionFactor should >= 2000',
      };
      ctx.status = 500;

      return;
    }

    // check signature
    const hash_piece1 = hash.slice(0, 12);
    const hash_piece2 = hash.slice(12, 24);
    const hash_piece3 = hash.slice(24, 36);
    const hash_piece4 = hash.slice(36, 48);

    const sign_data = `${author} ${hash_piece1} ${hash_piece2} ${hash_piece3} ${hash_piece4}`;

    try {
      const recover = ecc.recover(sign, sign_data);
      ctx.logger.info('recover', recover);
      if (recover !== publickey) {
        ctx.body = {
          msg: 'invalid signature',
        };
        ctx.status = 500;

        return;
      }
    } catch (err) {
      ctx.logger.error(err.sqlMessage);
      ctx.body = {
        msg: 'invalid signature ' + err,
      };
      ctx.status = 500;
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
      });

      const updateSuccess = result.affectedRows === 1;

      if (updateSuccess) {
        ctx.logger.info('publish success ..');

        ctx.body = {
          msg: 'success',
        };
        ctx.status = 201;

      } else {
        ctx.logger.error('publish err', err);

        ctx.body = {
          msg: 'publish fail',
        };
        ctx.status = 500;
      }

    } catch (err) {
      ctx.logger.error(err.sqlMessage);
      ctx.body = {
        msg: 'insert error' + err.sqlMessage,
      };
      ctx.status = 500;
    }
  }


  async posts() {
    const pagesize = 20;

    const { page = 1, type = 'all', author } = this.ctx.query;

    let whereOption = {
      status: 0
    }

    if (author) {
      whereOption.author = [author]
    }

    const results = await this.app.mysql.select('posts', { // 搜索 post 表
      // where: { status: 0, author: ['author1', 'author2'] }, // WHERE 条件
      where: whereOption, // WHERE 条件
      columns: ['id', 'author', 'title', 'short_content', 'hash', 'create_time'], // 要查询的表字段
      orders: [['create_time', 'desc']], // 排序方式
      limit: pagesize, // 返回数据量
      offset: (page - 1) * pagesize, // 数据偏移量
    });

    this.ctx.body = results;
  }

  async supports() {
    const pagesize = 20;

    const { page = 1, user } = this.ctx.query;

    let whereOption = {
      type: "share"
    }

    if (user) {
      whereOption.author = user
    }

    const results = await this.app.mysql.select('actions', {
      where: whereOption, // WHERE 条件
      columns: ['author', 'amount', 'sign_id', 'create_time'], // 要查询的表字段
      orders: [['create_time', 'desc']], // 排序方式
      limit: pagesize, // 返回数据量
      offset: (page - 1) * pagesize, // 数据偏移量
    });

    let signids = [];
    _.each(results, (row) => {
      signids.push(row.sign_id);
    })

    let results2 = [];

    if (signids.length > 0) {

      let whereOption2 = {
        id: signids
      }

      results2 = await this.app.mysql.select('posts', { // 搜索 post 表
        where: whereOption2, // WHERE 条件
        columns: ['id', 'author', 'title', 'short_content', 'hash', 'create_time'], // 要查询的表字段
        orders: [['create_time', 'desc']], // 排序方式
        limit: pagesize, // 返回数据量
        offset: (page - 1) * pagesize, // 数据偏移量
      });

    }

    this.ctx.body = results2;
  }

  async post() {
    const ctx = this.ctx;
    const hash = ctx.params.hash;

    const post = await this.app.mysql.get('posts', { hash });

    if (post) {
      // 阅读次数
      const read = await this.app.mysql.query(
        'select count(*) as num from readers where hash = ? ',
        [hash]
      );

      post.read = read[0].num;

      // 被赞次数
      const ups = await this.app.mysql.query(
        'select count(*) as ups from actions where sign_id = ? and type = ? ',
        [post.id, "share"]
      );

      post.ups = ups[0].ups;

      // 被赞总金额
      const value = await this.app.mysql.query(
        'select sum(amount) as value from actions where sign_id = ? and type = ? ',
        [post.id, "share"]
      );

      post.value = value[0].value || 0;

      ctx.body = post;
      ctx.status = 200;
    } else {
      ctx.body = {
        msg: 'post not found',
      };
      ctx.status = 404;
    }
  }

  async show() {
    const ctx = this.ctx;
    const hash = ctx.params.hash;

    const current_user = this.get_current_user() || "anonymous";
    const now = moment().format('YYYY-MM-DD HH:mm:ss');

    try {
      const result = await this.app.mysql.insert('readers', {
        reader: current_user,
        hash,
        create_time: now
      });

      const updateSuccess = result.affectedRows === 1;

      if (updateSuccess) {
        ctx.status = 200;
      } else {
        ctx.status = 500;
      }
    } catch (err) {
      ctx.logger.error(err.sqlMessage);
      ctx.body = {
        msg: 'insert error' + err.sqlMessage,
      };
      ctx.status = 500;
    }
  }


  async comment() {
    const ctx = this.ctx;
    const { comment = '', sign_id  } = ctx.request.body;

    if (!sign_id) {
      ctx.status = 500;
      ctx.body = "sign_id required";
      return;
    }

    const username = this.get_current_user();

    try {
      this.checkAuth(username);
    } catch (err) {
      ctx.status = 401;
      ctx.body = err.message;
      return;
    }

    const now = moment().format('YYYY-MM-DD HH:mm:ss');

    try {
      const result = await this.app.mysql.insert('comments', {
        username,
        sign_id,
        comment,
        create_time: now
      });

      const updateSuccess = result.affectedRows === 1;

      if (updateSuccess) {
        ctx.status = 200;
      } else {
        ctx.status = 500;
      }
    } catch (err) {
      ctx.logger.error(err.sqlMessage);
      ctx.body = {
        msg: 'insert error' + err.sqlMessage,
      };
      ctx.status = 500;
    }
  }




}

module.exports = PostController;

