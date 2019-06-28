'use strict';

const Controller = require('egg').Controller;

class CommentController extends Controller {
  async comments() {

    const ctx = this.ctx;

    const { pagesize = 20, page = 1, signid } = this.ctx.query;

    // singid缺少,此种情况用户正常使用时候不会出现
    if (!signid) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    const comments = await this.service.comment.commentList(parseInt(signid), parseInt(page), parseInt(pagesize));

    if (comments === null) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = comments;
  }
}

module.exports = CommentController;
