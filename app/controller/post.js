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

    this.app.mysql.queryFromat = function (query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function (txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    };
  }

  async publish() {
    const ctx = this.ctx;
    const { author = '', title = '', content = '',
      publickey, sign, hash, username, fissionFactor = 2000,
      cover, is_original = 0, platform = 'eos' } = ctx.request.body;

    ctx.logger.info('debug info', author, title, content, publickey, sign, hash, username, is_original);

    if (fissionFactor > 2000) {
      ctx.body = ctx.msg.postPublishParamsError;  //msg: 'fissionFactor should >= 2000',
      return;
    }

    if (!username) {
      ctx.body = ctx.msg.postPublishParamsError;  //msg: 'username required',
      return;
    }

    try {
      if ('eos' === platform) {
        const hash_piece1 = hash.slice(0, 12);
        const hash_piece2 = hash.slice(12, 24);
        const hash_piece3 = hash.slice(24, 36);
        const hash_piece4 = hash.slice(36, 48);

        const sign_data = `${author} ${hash_piece1} ${hash_piece2} ${hash_piece3} ${hash_piece4}`;
        await this.eos_signature_verify(author, sign_data, sign, publickey);
      } else if ('ont' === platform) {
        const msg = ONT.utils.str2hexstr(`${author} ${hash}`);
        this.ont_signature_verify(msg, sign, publickey);
      } else {
        ctx.body = ctx.msg.postPublishSignVerifyError;  //'platform not support';
        return;
      }
    } catch (err) {
      ctx.body = ctx.msg.postPublishSignVerifyError;  //err.message;
      return;
    }

    const id = await ctx.service.post.publish({
      author,
      username,
      title,
      public_key: publickey,
      sign,
      hash,
      is_original,
      fission_factor: fissionFactor,
      create_time: moment().format('YYYY-MM-DD HH:mm:ss'),
      cover: cover, // 封面url
      platform: platform
    });

    if (id > 0) {
      ctx.body = ctx.msg.success;
      ctx.body.data = id;
    }
    else {
      ctx.body = ctx.msg.postPublishError; //todo 可以再细化失败的原因
    }
  }

  async edit() {
    const ctx = this.ctx;
    const { signId, author = '', title = '', content = '', publickey, sign, hash, username, fissionFactor = 2000, cover, is_original = 0, platform = 'eos' } = ctx.request.body;

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
        const hash_piece1 = hash.slice(0, 12);
        const hash_piece2 = hash.slice(12, 24);
        const hash_piece3 = hash.slice(24, 36);
        const hash_piece4 = hash.slice(36, 48);

        const sign_data = `${author} ${hash_piece1} ${hash_piece2} ${hash_piece3} ${hash_piece4}`;

        await this.eos_signature_verify(author, sign_data, sign, publickey);
      } else if ('ont' === platform) {
        const msg = ONT.utils.str2hexstr(`${author} ${hash}`);
        this.ont_signature_verify(msg, sign, publickey);
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
          is_original: post.is_original,
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

        if (is_original) {
          updateRow.is_original = is_original;
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
      'select signid, count(*) as total from supports where status = 1 group by signid order by total desc limit ?,?',
      [(page - 1) * pagesize, pagesize]
    );

    let signids = [];
    _.each(results, (row) => {
      signids.push(row.signid);
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
      'select signid, sum(amount) as total from supports where status = 1 group by signid order by total desc limit ?,?',
      [(page - 1) * pagesize, pagesize]
    );

    let signids = [];
    _.each(results, (row) => {
      signids.push(row.signid);
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

  // 获取按照时间排序的文章列表(基础方法)(新)
  async getTimeRanking() {
    const ctx = this.ctx;

    const { page = 1, pagesize = 20, author } = this.ctx.query;

    const postData = await this.service.post.timeRank(page, pagesize, author);

    if (postData) {
      ctx.body = ctx.msg.success;
      ctx.body.data = postData;
      return;
    }

    ctx.body = ctx.msg.failure;
  }

  // 获取按照赞赏次数排序的文章列表(新)
  async getSupportsRanking() {
    const ctx = this.ctx;

    const { page = 1, pagesize = 20 } = this.ctx.query;

    const postData = await this.service.post.supportRank(page, pagesize);

    if (postData) {
      ctx.body = ctx.msg.success;
      ctx.body.data = postData;
      return;
    }

    ctx.body = ctx.msg.failure;
  }

  // 获取按照赞赏数量排序的文章列表(新)
  async getAmountRanking() {
    const ctx = this.ctx;
    const { page = 1, pagesize = 20, symbol = 'EOS' } = this.ctx.query;

    const postData = await this.service.post.amountRank(page, pagesize, symbol);

    if (postData) {
      ctx.body = ctx.msg.success;
      ctx.body.data = postData;
      return;
    }

    ctx.body = ctx.msg.failure;
    // return;
  }

  // 我赞赏过的文章列表
  async supports() {
    const pagesize = 20;

    const { page = 1, user } = this.ctx.query;

    let owner = await this.app.mysql.get("users", { username: user });

    if (!owner) {
      this.ctx.body = [];
      return;
    }

    let results = await this.app.mysql.query(
      'SELECT s.create_time, signid FROM supports s INNER JOIN posts p ON s.signid = p.id'
      + ' WHERE s.status = 1 AND p.status = 0 AND s.uid = :uid ORDER BY s.create_time DESC LIMIT :start, :end;',
      { uid: owner.id, start: (page - 1) * pagesize, end: pagesize }
    );

    let signids = [];
    _.each(results, (row) => {
      signids.push(row.signid);
    })

    let results2 = await this.getPostsBySignids(signids);

    _.each(results2, row2 => {
      _.each(results, row => {
        if (row.signid === row2.id) {
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
        'select signid, sum(amount) as value from supports where status=1 and signid in (?) and symbol = ? group by signid ',
        [signids, "EOS"]
      );

      //ONT
      const ont_value = await this.app.mysql.query(
        'select signid, sum(amount) as value from supports where signid in (?) and symbol = ? and status=1 group by signid ',
        [signids, "ONT"]
      );

      // 赞赏次数
      const ups = await this.app.mysql.query(
        'select signid, count(*) as ups from supports where status=1 and signid in (?) group by signid ',
        [signids]
      );

      _.each(results, row => {
        _.each(read, row2 => {
          if (row.id === row2.id) {
            row.read = row2.num;
          }
        })
        _.each(value, row2 => {
          if (row.id === row2.signid) {
            row.value = row2.value;
          }
        })
        _.each(ups, row2 => {
          if (row.id === row2.signid) {
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

  // todo：待删除
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
      let user = await this.app.mysql.get("users", { username: current_user });
      post.support = false;
      if (user) {
        let support = await this.app.mysql.get('supports', { signid: post.id, uid: user.id, status: 1 });
        if (support) {
          post.support = true;
        }
      }

      // 被赞次数
      const ups = await this.app.mysql.query(
        'select count(*) as ups from supports where signid = ? and status = 1 ',
        [post.id]
      );

      post.ups = ups[0].ups;

      // 被赞总金额
      const value = await this.app.mysql.query(
        'select sum(amount) as value from supports where signid = ? and symbol = ? and status = 1 ',
        [post.id, "EOS"]
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

  async p() {
    const ctx = this.ctx;
    const id = ctx.params.id;

    const post = await this.service.post.getById(id, ctx.user.id);

    if (!post) {
      ctx.body = ctx.msg.postNotFound;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = post;
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

  //获取我的文章，不是我的文章会报401
  // 新创建的没有id， 用的hash问题
  async mypost() {
    const ctx = this.ctx;
    const id = ctx.params.id;

    const post = await this.service.post.getForEdit(id, ctx.user.username);

    if (!post) {
      ctx.body = ctx.msg.postNotFound;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = post;
  }

}

module.exports = PostController;