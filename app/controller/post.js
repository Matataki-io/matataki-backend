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
      publickey, sign, hash, fissionFactor = 2000,
      cover, is_original = 0, platform = 'eos', tags = "" } = ctx.request.body;

    ctx.logger.info('debug info', author, title, content, publickey, sign, hash, is_original);

    if (fissionFactor > 2000) {
      ctx.body = ctx.msg.postPublishParamsError;  //msg: 'fissionFactor should >= 2000',
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
      } else if (platform === 'github') {
        this.logger.info('There is a GitHub user publishing...');
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
      username: ctx.user.username,
      title,
      public_key: publickey,
      sign,
      hash,
      is_original,
      fission_factor: fissionFactor,
      create_time: moment().format('YYYY-MM-DD HH:mm:ss'),
      cover: cover, // 封面url
      platform: platform,
      uid: ctx.user.id,
      is_recommend: 0,
      category_id: 0,
    });

    if (tags) {
      let tag_arr = tags.split(",");
      tag_arr = tag_arr.filter((x) => { return x !== "" });
      await ctx.service.post.create_tags(id, tag_arr);
    }

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
    const { signId, author = '', title = '', content = '', publickey, sign, hash, fissionFactor = 2000, cover, is_original = 0, platform = 'eos', tags = "" } = ctx.request.body;

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

    ctx.logger.info('debug info', signId, author, title, content, publickey, sign, hash);

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
      } else if ('github' === platform) {
        this.logger.info('There is a GitHub user editing...');
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

        let tag_arr = tags.split(",");
        tag_arr = tag_arr.filter((x) => { return x !== "" });
        await ctx.service.post.create_tags(signId, tag_arr, true);

        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      }

      ctx.body = ctx.msg.success;
      ctx.body.data = signId;

    } catch (err) {
      ctx.logger.error(err);
      ctx.body = {
        msg: 'edit error ' + err,
      };
      ctx.status = 500;
    }

  }

  // 获取按照时间排序的文章列表(基础方法)(新)
  async getTimeRanking() {
    const ctx = this.ctx;

    const { page = 1, pagesize = 20, channel = null, author } = this.ctx.query;

    const postData = await this.service.post.timeRank(page, pagesize, author, channel);

    if (postData === 2) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

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

    const { page = 1, pagesize = 20, channel = null } = this.ctx.query;

    const postData = await this.service.post.supportRank(page, pagesize, channel);

    if (postData === 2) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

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
    const { page = 1, pagesize = 20, symbol = 'EOS', channel = null } = this.ctx.query;

    const postData = await this.service.post.amountRank(page, pagesize, symbol, channel);

    if (postData === 2) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    if (postData) {
      ctx.body = ctx.msg.success;
      ctx.body.data = postData;
      return;
    }

    ctx.body = ctx.msg.failure;
    // return;
  }

  // 用户赞赏过的文章列表(新)
  async getSupported() {
    const ctx = this.ctx;
    const { page = 1, pagesize = 20, user = null } = this.ctx.query;

    const postData = await this.service.post.supportedPosts(page, pagesize, user);

    if (postData === 2) {
      ctx.body = ctx.msg.paramsError;
    } else if (postData === 3) {
      ctx.body = ctx.msg.userNotExist;
    } else {
      ctx.body = ctx.msg.success;
      ctx.body.data = postData;
    }
  }

  // 获取推荐的文章/商品, 必须带channel
  async getRecommend() {
    const ctx = this.ctx;
    const { channel = null, amount = 5 } = ctx.query;

    const postData = await this.service.post.recommendPosts(channel, amount);

    if (postData === 3) {
      ctx.body = ctx.msg.paramsError;
    } else {
      ctx.body = ctx.msg.success;
      ctx.body.data = postData;
    }
  }

  // 获取某个标签下的文章
  async getPostByTag() {
    const ctx = this.ctx;

    const { page = 1, pagesize = 20, tagid } = this.ctx.query;

    const postData = await this.service.post.getPostByTag(page, pagesize, tagid);

    this.ctx.body = ctx.msg.success;
    this.ctx.body.data = postData;
  }

  // todo：待删除
  // async post() {
  //   const ctx = this.ctx;
  //   const hash = ctx.params.hash;

  //   const post = await this.app.mysql.get('posts', { hash });

  //   if (post) {
  //     // 阅读次数
  //     const read = await this.app.mysql.query(
  //       'select real_read_count num from post_read_count where post_id = ? ',
  //       [post.id]
  //     );

  //     post.read = read[0] ? read[0].num : 0

  //     const current_user = this.get_current_user();
  //     let user = await this.app.mysql.get("users", { username: current_user });
  //     post.support = false;
  //     if (user) {
  //       let support = await this.app.mysql.get('supports', { signid: post.id, uid: user.id, status: 1 });
  //       if (support) {
  //         post.support = true;
  //       }
  //     }

  //     // 被赞次数
  //     const ups = await this.app.mysql.query(
  //       'select count(*) as ups from supports where signid = ? and status = 1 ',
  //       [post.id]
  //     );

  //     post.ups = ups[0].ups;

  //     // 被赞总金额
  //     const value = await this.app.mysql.query(
  //       'select sum(amount) as value from supports where signid = ? and symbol = ? and status = 1 ',
  //       [post.id, "EOS"]
  //     );

  //     post.value = value[0].value || 0;

  //     //ONT value
  //     const ont_value = await this.app.mysql.query(
  //       'select signid, sum(amount) as value from supports where signid = ? and symbol = ? and status=1  ',
  //       [post.id, "ONT"]
  //     );

  //     post.ontvalue = ont_value[0].value || 0;


  //     // nickname
  //     let name = post.username || post.author;
  //     const nickname = await this.app.mysql.get('users', { username: name });
  //     if (nickname) {
  //       post.nickname = nickname.nickname;
  //     }

  //     // update cahce
  //     this.app.read_cache[post.id] = post.read;
  //     this.app.value_cache[post.id] = post.value;
  //     this.app.ups_cache[post.id] = post.ups;

  //     this.app.post_cache[post.id] = post;

  //     ctx.body = post;
  //     ctx.status = 200;
  //   } else {
  //     ctx.body = {
  //       msg: 'post not found',
  //     };
  //     ctx.status = 404;
  //   }
  // }

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

  async postByHash() {
    const ctx = this.ctx;
    const hash = ctx.params.hash;

    const post = await this.service.post.getByHash(hash, ctx.user.id);

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
        'INSERT INTO post_read_count(post_id, real_read_count, sale_count, support_count, eos_value_count, ont_value_count) VALUES (?, ?, 0, 0, 0, 0)'
        + ' ON DUPLICATE KEY UPDATE real_read_count = real_read_count + 1',
        [ post.id, 1 ]
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

    const result = await this.service.post.delete(id, ctx.user.id);
    if (!result) {
      ctx.body = ctx.msg.postDeleteError;
    } else {
      ctx.body = ctx.msg.success;
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

    const now = moment().format('YYYY-MM-DD HH:mm:ss');

    try {
      const result = await this.app.mysql.insert('comments', {
        username: this.ctx.user.username,
        uid: this.ctx.user.id,
        sign_id,
        comment,
        create_time: now,
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

    const post = await this.service.post.getForEdit(id, ctx.user.id);

    if (!post) {
      ctx.body = ctx.msg.postNotFound;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = post;
  }

  // async mailtest() {
  //   const ctx = this.ctx;
  //   const { supportid = 505 } = ctx.query;

  //   const mail = await this.service.mail.sendMail(supportid);
  //   // ctx.body = ctx.msg.success;
  //   // ctx.body.data = mail;
  //   ctx.body = mail;
  // }

  async transferOwner() {
    const ctx = this.ctx;
    const { uid, signid } = ctx.request.body;

    const success = await this.service.post.transferOwner(uid, signid, ctx.user.id);

    if (success) {
      ctx.body = ctx.msg.success;
    } else {
      this.response(500, "transferOwner error")
    }
  }

}

module.exports = PostController;