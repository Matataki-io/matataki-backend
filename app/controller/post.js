'use strict';

const Controller = require('../core/base_controller');

const EOS = require('eosjs');
const ecc = require('eosjs-ecc');
const moment = require('moment');
const _ = require('lodash');
const ONT = require('ontology-ts-sdk');

const md5 = require('crypto-js/md5');

class PostController extends Controller {

  constructor(ctx) {
    super(ctx);

    this.app.mysql.queryFromat = function(query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function(txt, key) {
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
      cover, is_original = 0, platform = 'eos', tags = '' } = ctx.request.body;

    ctx.logger.info('debug info', author, title, content, publickey, sign, hash, is_original);

    if (fissionFactor > 2000) {
      ctx.body = ctx.msg.postPublishParamsError; // msg: 'fissionFactor should >= 2000',
      return;
    }

    try {
      if (platform === 'eos') {
        const hash_piece1 = hash.slice(0, 12);
        const hash_piece2 = hash.slice(12, 24);
        const hash_piece3 = hash.slice(24, 36);
        const hash_piece4 = hash.slice(36, 48);

        const sign_data = `${author} ${hash_piece1} ${hash_piece2} ${hash_piece3} ${hash_piece4}`;
        await this.eos_signature_verify(author, sign_data, sign, publickey);
      } else if (platform === 'ont') {
        const msg = ONT.utils.str2hexstr(`${author} ${hash}`);
        this.ont_signature_verify(msg, sign, publickey);
      } else if (platform === 'github') {
        this.logger.info('There is a GitHub user publishing...');
      } else {
        ctx.body = ctx.msg.postPublishSignVerifyError; // 'platform not support';
        return;
      }
    } catch (err) {
      ctx.body = ctx.msg.postPublishSignVerifyError; // err.message;
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
      cover, // 封面url
      platform,
      uid: ctx.user.id,
      is_recommend: 0,
      category_id: 0,
    });

    if (tags) {
      let tag_arr = tags.split(',');
      tag_arr = tag_arr.filter(x => { return x !== ''; });
      await ctx.service.post.create_tags(id, tag_arr);
    }

    if (id > 0) {
      ctx.body = ctx.msg.success;
      ctx.body.data = id;
    } else {
      ctx.body = ctx.msg.postPublishError; // todo 可以再细化失败的原因
    }
  }

  async edit() {
    const ctx = this.ctx;
    const { signId, author = '', title = '', content = '', publickey, sign, hash, fissionFactor = 2000, cover, is_original = 0, platform = 'eos', tags = '' } = ctx.request.body;

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
      if (platform === 'eos') {
        const hash_piece1 = hash.slice(0, 12);
        const hash_piece2 = hash.slice(12, 24);
        const hash_piece3 = hash.slice(24, 36);
        const hash_piece4 = hash.slice(36, 48);

        const sign_data = `${author} ${hash_piece1} ${hash_piece2} ${hash_piece3} ${hash_piece4}`;

        await this.eos_signature_verify(author, sign_data, sign, publickey);
      } else if (platform === 'ont') {
        const msg = ONT.utils.str2hexstr(`${author} ${hash}`);
        this.ont_signature_verify(msg, sign, publickey);
      } else if (platform === 'github') {
        this.logger.info('There is a GitHub user editing...');
      } else {
        this.ctx.status = 403;
        this.ctx.body = 'platform not support';
        return;
      }
    } catch (err) {
      ctx.status = 403;
      ctx.body = err.message;
      return;
    }

    try {
      const conn = await this.app.mysql.beginTransaction();

      try {
        // insert edit history
        const now = moment().format('YYYY-MM-DD HH:mm:ss');
        await conn.insert('edit_history', {
          sign_id: signId,
          hash: post.hash,
          title: post.title,
          sign: post.sign,
          cover: post.cover,
          is_original: post.is_original,
          public_key: post.public_key,
          create_time: now,
        });

        const updateRow = {
          hash,
          public_key: publickey,
          sign,
        };

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
        await conn.update('posts', updateRow, { where: { id: signId } });

        let tag_arr = tags.split(',');
        tag_arr = tag_arr.filter(x => { return x !== ''; });
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
    const { page = 1, pagesize = 20, user = null, channel = null } = this.ctx.query;

    const postData = await this.service.post.supportedPosts(page, pagesize, user, channel);

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

  // 待删除，合并到OrderController、SupportController，以后可增加独立的comment模块
  async comment() {
    const ctx = this.ctx;
    const { comment = '', sign_id } = ctx.request.body;

    if (!sign_id) {
      ctx.status = 500;
      ctx.body = 'sign_id required';
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

  // 获取我的文章，不是我的文章会报401
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
      this.response(500, 'transferOwner error');
    }
  }

  async uploadImage() {
    const ctx = this.ctx;
    const file = ctx.request.files[0];
    const filetype = file.filename.split('.');

    // 文件上OSS的路径
    const filename = '/image/'
      + moment().format('YYYY/MM/DD/')
      + md5(file.filepath).toString()
      + '.' + filetype[filetype.length - 1];

    // // 文件在本地的缓存路径
    // const filelocation = 'uploads/' + path.basename(file.filename);

    // filepath需要再改
    const uploadStatus = await this.service.post.uploadImage(filename, file.filepath);

    if (uploadStatus !== 0) {
      ctx.body = ctx.msg.failure;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = { cover: filename };
  }

}

module.exports = PostController;
