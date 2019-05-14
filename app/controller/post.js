'use strict';

const Controller = require('../core/base_controller');

const EOS = require('eosjs');
const ecc = require('eosjs-ecc');
const moment = require('moment');
var _ = require('lodash');
const ONT = require('ontology-ts-sdk');


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
    const { author = '', title = '', content = '',
      publickey, sign, hash, username, fissionFactor = 2000,
      cover, declaration = 0, platform = 'eos' } = ctx.request.body;

    ctx.logger.info('debug info', author, title, content, publickey, sign, hash, username, declaration);

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

      if ('eos' === platform) {
        this.eos_signature_verify(author, hash, sign, publickey);
      } else if ('ont' === platform) {
        this.ont_signature_verify(author, hash, sign, publickey);
      } else {
        this.ctx.status = 401;
        this.ctx.body = 'platform not support';
        return;
      }

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
        declaration,
        fission_factor: fissionFactor,
        create_time: now,
        cover: cover, // 封面url
        platform: platform
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

  async edit() {
    const ctx = this.ctx;
    const { signId, author = '', title = '', content = '', publickey, sign, hash, username, fissionFactor = 2000, cover, declaration = 0, platform = 'eos' } = ctx.request.body;

    // 编辑的时候，signId需要带上
    if (!signId) {
      ctx.body = {
        msg: 'signId require',
      };
      ctx.status = 500;

      return;
    }

    if (fissionFactor > 2000) {
      ctx.body = {
        msg: 'fissionFactor should >= 2000',
      };
      ctx.status = 500;
      return;
    }

    const post = await this.app.mysql.get('posts', { id: signId });

    if (!post) {
      ctx.body = {
        msg: 'post not found',
      };
      ctx.status = 404;

      return;
    }

    const current_user = this.get_current_user();

    try {
      this.checkAuth(current_user);
    } catch (err) {
      ctx.status = 401;
      ctx.body = err.message;
      return;
    }

    if (current_user !== post.username) {
      ctx.status = 401;
      ctx.body = "wrong user";
      return;
    }

    ctx.logger.info('debug info', signId, author, title, content, publickey, sign, hash, username);

    try {

      if ('eos' === platform) {
        this.eos_signature_verify(author, hash, sign, publickey);
      } else if ('ont' === platform) {
        this.ont_signature_verify(author, hash, sign, publickey);
      } else {
        this.ctx.status = 401;
        this.ctx.body = 'platform not support';
        return;
      }

    } catch (err) {
      ctx.status = 401;
      ctx.body = err.message;
      return;
    }

    try {
      const conn = await this.app.mysql.beginTransaction();

      try {
        // insert edit history
        const now = moment().format('YYYY-MM-DD HH:mm:ss');
        await conn.insert("edit_history", {
          sign_id: signId,
          hash: post.hash,
          title: post.title,
          sign: post.sign,
          cover: post.cover,
          declaration: post.declaration,
          public_key: post.public_key,
          create_time: now,
        });

        let updateRow = {
          hash: hash,
          public_key: publickey,
          sign: sign,
        }

        if (title) {
          updateRow.title = title;
        }

        if (cover !== undefined) {
          updateRow.cover = cover;
        }

        if (declaration) {
          updateRow.declaration = declaration;
        }

        // console.log("cover!!!", cover , typeof cover);

        // 修改 post 的 hash, publickey, sign title
        await conn.update("posts", updateRow, { where: { id: signId } });

        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      }

      ctx.body = {
        msg: 'success',
      };
      ctx.status = 201;

    } catch (err) {
      ctx.logger.error(err.sqlMessage);
      ctx.body = {
        msg: 'edit error ' + err.sqlMessage,
      };
      ctx.status = 500;
    }

  }

  eos_signature_verify(author, hash, sign, publickey) {
    const hash_piece1 = hash.slice(0, 12);
    const hash_piece2 = hash.slice(12, 24);
    const hash_piece3 = hash.slice(24, 36);
    const hash_piece4 = hash.slice(36, 48);

    const sign_data = `${author} ${hash_piece1} ${hash_piece2} ${hash_piece3} ${hash_piece4}`;

    try {
      const recover = ecc.recover(sign, sign_data);
      if (recover !== publickey) {
        throw new Error("invalid signature");
      }
    } catch (err) {
      throw new Error("invalid signature " + err);
    }
  }

  ont_signature_verify(author, hash, sign, publickey) {
    try {
      const pub = new ONT.Crypto.PublicKey(publickey);

      const msg = ONT.utils.str2hexstr(`${author} ${hash}`);

      const signature = ONT.Crypto.Signature.deserializeHex(sign);

      const pass = pub.verify(msg, signature);

      if (!pass) {
        throw new Error("invalid ont signature");
      }
    } catch (err) {
      throw err;
    }
  }

  async posts() {
    const pagesize = 20;

    const { page = 1, type = 'all', author } = this.ctx.query;

    let results = []

    if (author) {
      results = await this.app.mysql.query(
        'select a.id, a.author, a.title, a.short_content, a.hash, a.create_time, a.cover,  b.nickname from posts a left join users b on a.username = b.username where a.status=0 and a.author = ? order by create_time desc limit ?, ?',
        [author, (page - 1) * pagesize, pagesize]
      );
    } else {
      results = await this.app.mysql.query(
        'select a.id, a.author, a.title, a.short_content, a.hash, a.create_time, a.cover, b.nickname from posts a left join users b on a.username = b.username where a.status=0 order by create_time desc limit ?, ?',
        [(page - 1) * pagesize, pagesize]
      );
    }

    if (results.length > 0) {
      let signids = [];

      _.each(results, row => {
        signids.push(row.id);
      })

      results = await this.getPostsBySignids(signids);
    }

    this.ctx.body = results;
  }

  async getSupportTimesRanking() {
    const pagesize = 20;

    const { page = 1 } = this.ctx.query;

    const results = await this.app.mysql.query(
      'select sign_id, count(*) as total from actions where type = ? group by sign_id order by total desc limit ?,?',
      ["share", (page - 1) * pagesize, pagesize]
    );

    let signids = [];
    _.each(results, (row) => {
      signids.push(row.sign_id);
    })

    let results2 = [];

    if (signids.length > 0) {
      results2 = await this.getPostsBySignids(signids);

      results2 = results2.sort((a, b) => {
        return b.ups - a.ups;
      })
    }

    this.ctx.body = results2;
  }

  async getSupportAmountRanking() {
    const pagesize = 20;

    const { page = 1 } = this.ctx.query;

    const results = await this.app.mysql.query(
      'select sign_id, sum(amount) as total from actions where type = ? group by sign_id order by total desc limit ?,?',
      ["share", (page - 1) * pagesize, pagesize]
    );

    let signids = [];
    _.each(results, (row) => {
      signids.push(row.sign_id);
    })

    let results2 = [];

    if (signids.length > 0) {
      results2 = await this.getPostsBySignids(signids);

      results2 = results2.sort((a, b) => {
        return b.value - a.value;
      })
    }

    this.ctx.body = results2;
  }

  // 我赞赏过的文章列表
  async supports() {
    const pagesize = 20;

    const { page = 1, user } = this.ctx.query;

    let results = [];

    if (user) {
      results = await this.app.mysql.query(
        'select author, amount, sign_id, create_time from actions where type = ? and author = ? order by create_time desc limit ?, ?',
        ["share", user, (page - 1) * pagesize, pagesize]
      );
    } else {
      results = await this.app.mysql.query(
        'select author, amount, sign_id, create_time from actions where type = ? order by create_time desc limit ?, ?',
        ["share", (page - 1) * pagesize, pagesize]
      );
    }

    let signids = [];
    _.each(results, (row) => {
      signids.push(row.sign_id);
    })

    let results2 = await this.getPostsBySignids(signids);

    _.each(results2, row2 => {
      _.each(results, row => {
        if (row.sign_id === row2.id) {
          row2.support_time = row.create_time;
        }
      })
    })

    results2 = results2.sort((a, b) => {
      return b.support_time - a.support_time;
    })

    this.ctx.body = results2;
  }

  async getPostsBySignids(signids) {
    let results = [];

    if (signids.length > 0) {
      results = await this.app.mysql.query(
        'select a.id, a.author, a.title, a.short_content, a.hash, a.create_time, a.cover, b.nickname from posts a left join users b on a.username = b.username where a.id in (?) and a.status=0 order by create_time desc',
        [signids]
      );

      let hashs = [];

      _.each(results, row => {
        row.read = 0;
        row.value = 0;
        row.ups = 0;
        row.ontvalue = 0;
        hashs.push(row.hash);
      })

      // 阅读次数
      const read = await this.app.mysql.query(
        'select post_id as id, real_read_count as num from post_read_count where post_id in (?) ',
        [signids]
      );

      // 赞赏金额
      const value = await this.app.mysql.query(
        'select sign_id, sum(amount) as value from actions where sign_id in (?) and type = ? group by sign_id ',
        [signids, "share"]
      );

      //ONT
      const ont_value = await this.app.mysql.query(
        'select signid, sum(amount) as value from supports where signid in (?) and symbol = ? and status=1 group by signid ',
        [signids, "ONT"]
      );

      // 赞赏次数
      const ups = await this.app.mysql.query(
        'select sign_id, count(*) as ups from actions where sign_id in (?) and type = ? group by sign_id ',
        [signids, "share"]
      );

      _.each(results, row => {
        _.each(read, row2 => {
          if (row.id === row2.id) {
            row.read = row2.num;
          }
        })
        _.each(value, row2 => {
          if (row.id === row2.sign_id) {
            row.value = row2.value;
          }
        })
        _.each(ups, row2 => {
          if (row.id === row2.sign_id) {
            row.ups = row2.ups;
          }
        })
         _.each(ont_value, row2 => {
          if (row.id === row2.signid) {
            row.ontvalue = row2.value;
          }
        })
        
      })
    }

    return results;
  }

  async post() {
    const ctx = this.ctx;
    const hash = ctx.params.hash;

    const post = await this.app.mysql.get('posts', { hash });

    if (post) {
      // 阅读次数
      const read = await this.app.mysql.query(
        'select real_read_count num from post_read_count where post_id = ? ',
        [post.id]
      );

      post.read = read[0] ? read[0].num : 0

      const current_user = this.get_current_user();
      post.support = false;
      if (current_user) {
        let support = await this.app.mysql.get('actions', { sign_id: post.id, author: current_user, type: 'share' });
        if (support) {
          post.support = true;
        }
      }

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

      //ONT value
      const ont_value = await this.app.mysql.query(
        'select signid, sum(amount) as value from supports where signid = ? and symbol = ? and status=1  ',
        [post.id, "ONT"]
      );

      post.ontvalue = ont_value[0].value || 0;


      // nickname 
      let name = post.username || post.author;
      const nickname = await this.app.mysql.get('users', { username: name });
      if (nickname) {
        post.nickname = nickname.nickname;
      }

      // update cahce
      this.app.read_cache[post.id] = post.read;
      this.app.value_cache[post.id] = post.value;
      this.app.ups_cache[post.id] = post.ups;

      this.app.post_cache[post.id] = post;

      ctx.body = post;
      ctx.status = 200;
    } else {
      ctx.body = {
        msg: 'post not found',
      };
      ctx.status = 404;
    }
  }

  async p2() {
    const ctx = this.ctx;
    const id = ctx.params.id;

    const post = await this.service.post.getById(id, ctx.user.username);

    if (!post) {
      ctx.body = ctx.msg.postNotFound;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = post;
  }

  async p() {
    const ctx = this.ctx;
    const id = ctx.params.id;

    const post = await this.app.mysql.get('posts', { id });

    if (post) {
      // 阅读次数
      const read = await this.app.mysql.query(
        'select real_read_count num from post_read_count where post_id = ? ',
        [id]
      );

      post.read = read[0] ? read[0].num : 0

      // 被赞次数
      const ups = await this.app.mysql.query(
        'select count(*) as ups from actions where sign_id = ? and type = ? ',
        [post.id, "share"]
      );

      post.ups = ups[0].ups;

      const current_user = this.get_current_user();
      post.support = false;
      if (current_user) {
        let support = await this.app.mysql.get('actions', { sign_id: post.id, author: current_user, type: 'share' });
        if (support) {
          post.support = true;
        }
      }

      // 被赞总金额
      const value = await this.app.mysql.query(
        'select sum(amount) as value from actions where sign_id = ? and type = ? ',
        [post.id, "share"]
      );

      post.value = value[0].value || 0;

      //ONT value
      const ont_value = await this.app.mysql.query(
        'select signid, sum(amount) as value from supports where signid = ? and symbol = ? and status=1  ',
        [post.id, "ONT"]
      );

      post.ontvalue = ont_value[0].value || 0;


      // nickname 
      let name = post.username || post.author;
      const nickname = await this.app.mysql.get('users', { username: name });
      if (nickname) {
        post.nickname = nickname.nickname;
      }

      // update cahce
      this.app.read_cache[post.id] = post.read;
      this.app.value_cache[post.id] = post.value;
      this.app.ups_cache[post.id] = post.ups;

      this.app.post_cache[post.id] = post;

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
      const post = await this.app.mysql.get('posts', { hash });

      if (!post) {
        ctx.body = {
          msg: 'post not found',
        };
        ctx.status = 500;
        return;
      }

      const result = await this.app.mysql.query(
        'INSERT INTO post_read_count(post_id, real_read_count) VALUES (?, ?) ON DUPLICATE KEY UPDATE real_read_count = real_read_count + 1',
        [post.id, 1]
      );

      const updateSuccess = (result.affectedRows !== 0);

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


  async delete2() {
    const { ctx } = this;

    // ctx.validate({
    //   page: { type: 'int', required: true },
    //   pageSize: { type: 'int', required: true },
    // }, ctx.query);

    const id = ctx.params.id;
    if (!id) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    const result = await this.service.post.delete(id, ctx.user.username);
    if (!result) {
      ctx.body = ctx.msg.postDeleteError;
    }
    else {
      ctx.body = ctx.msg.success;
    }
  }

  async delete() {
    const ctx = this.ctx;
    const id = ctx.params.id;

    if (!id) {
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

      // 检查是否是自己的文章
      const post = await this.app.mysql.get('posts', { id });

      if (!post) {
        ctx.status = 500;
        ctx.body = "post not found";
        return;
      } else {
        if (post.author !== username) {
          ctx.status = 500;
          ctx.body = "only post owner can delete";
          return;
        }
      }

      const row = {
        status: 1,
      };

      const options = {
        where: {
          id: id,
        },
      };

      let result = await this.app.mysql.update('posts', row, options);

      const updateSuccess = result.affectedRows === 1;

      if (updateSuccess) {
        ctx.status = 200;
      } else {
        ctx.status = 500;
      }
    } catch (err) {
      ctx.logger.error(err);
      ctx.body = {
        msg: 'delete error' + err.sqlMessage,
      };
      ctx.status = 500;
    }
  }

  async comment() {
    const ctx = this.ctx;
    const { comment = '', sign_id } = ctx.request.body;

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