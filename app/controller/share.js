'use strict';

const Controller = require('../core/base_controller');

const moment = require('moment');

class ShareController extends Controller {
  // 发布分享
  async create() {
    const ctx = this.ctx;
    const { author, content, platform, references } = ctx.request.body;

    // 上传ipfs
    const hash = await this.service.post.ipfsUpload(JSON.stringify({
      author,
      content,
    }));
    if (!hash) {
      ctx.body = ctx.msg.ipfsUploadFailed;
      return;
    }

    const id = await ctx.service.share.create({
      author,
      username: ctx.user.username,
      title: content,
      hash,
      is_original: 1,
      create_time: moment().format('YYYY-MM-DD HH:mm:ss'),
      platform,
      uid: ctx.user.id,
      is_recommend: 0,
      category_id: 0,
    });

    // 添加文章到elastic search
    // await this.service.search.importPost(id, ctx.user.id, title, '');

    if (id > 0) {
      ctx.body = ctx.msg.success;
      ctx.body.data = id;
    } else {
      ctx.body = ctx.msg.postPublishError; // todo 可以再细化失败的原因
    }
  }
  // 分享列表
  async index() {
    this.ctx.body = 1;
  }
  // 详情
  async show() {
    const { ctx } = this;
    const id = ctx.params;
    ctx.body = id;
  }
}

module.exports = ShareController;
