'use strict';

const Controller = require('../core/base_controller');

const moment = require('moment');

class ShareController extends Controller {
  // 发布分享
  async create() {
    const ctx = this.ctx;
    // ref_sign_id title summary cover url
    const { author, content, platform, refs } = ctx.request.body;
    if (!Array.isArray(refs)) {
      ctx.body = ctx.msg.paramsError;
      return;
    }
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    const timestamp = moment(now).valueOf() / 1000;

    // 上传ipfs
    const hash = await this.service.post.ipfsUpload(JSON.stringify({
      timestamp,
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
      short_content: content,
      hash,
      is_original: 1,
      create_time: now,
      platform,
      uid: ctx.user.id,
      is_recommend: 0,
      category_id: 0,
    }, refs);

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
    const { ctx } = this;
    const { page = 1, pagesize = 20, type = 'time' } = ctx.query;
    let postData = null;
    if (type === 'time') {
      postData = await this.service.share.timeRank(page, pagesize);
    } else if (type === 'hot') {
      postData = await this.service.share.hotRank(page, pagesize);
    }

    if (postData === 2 || postData === null) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    if (postData) {
      ctx.body = ctx.msg.success;
      ctx.body.data = postData;
      return;
    }
  }
  // 详情
  async show() {
    const { ctx } = this;
    const id = ctx.params.id;
    const result = await this.service.share.get(id);
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }
}

module.exports = ShareController;
