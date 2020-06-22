'use strict';

const Controller = require('../core/base_controller');

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

  // 直接评论，需要支付积分
  async comment() {
    const ctx = this.ctx;
    const { signId, comment } = this.ctx.request.body;

    const result = await this.service.comment.payPointCreate(ctx.user.id, ctx.user.username, signId, comment, this.clientIP);
    if (result.status === -1) {
      ctx.body = ctx.msg.pointNotEnough;
      return;
    } else if (result.status < 0) {
      ctx.body = ctx.msg.failure;
      return;
    }
    // 为评论行为创建一个事件通知
    const { uid } = await this.service.post.get(signId);
    this.service.notify.event.sendEvent(ctx.user.id, [ uid ], 'comment', signId, 'article', result.id);

    ctx.body = ctx.msg.success;
  }
  // 添加评论
  async reply() {
    const ctx = this.ctx;
    const { signId, comment, replyId } = ctx.request.body;
    const result = await this.service.comment.reply({
      uid: ctx.user.id,
      username: ctx.user.username,
      sign_id: signId,
      comment,
      reply_id: replyId,
    });
    if (result === -1) {
      ctx.body = ctx.msg.notFountComment;
      return;
    }
    if (result.status === -1) {
      ctx.body = ctx.msg.pointNotEnough;
      return;
    } else if (result.status < 0) {
      ctx.body = ctx.msg.failure;
      return;
    }
    // 为评论行为创建一个事件通知
    const { uid } = await this.app.mysql.get('comments', { id: replyId });
    console.log(ctx.user.id, [ uid ], 'reply', replyId, 'comment', result);
    this.service.notify.event.sendEvent(ctx.user.id, [ uid ], 'reply', replyId, 'comment', result.insertId);

    ctx.body = ctx.msg.success;
  }
  // 点赞
  async like() {
    const ctx = this.ctx;
    const { id } = ctx.params;
    const result = await this.service.comment.like(id);
    if (result === -1) {
      ctx.body = ctx.msg.failure;
      return;
    }
    ctx.body = ctx.msg.success;
  }
  async getComments() {
    const ctx = this.ctx;
    const { pagesize = 20, page = 1, signid } = this.ctx.query;

    // singid缺少,此种情况用户正常使用时候不会出现
    if (!signid) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    const comments = await this.service.comment.getComments(parseInt(signid), parseInt(page), parseInt(pagesize));

    if (comments === null) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = comments;
  }

  async getCommentIndexById() {
    const ctx = this.ctx;
    const { id } = ctx.params;
    if(!id) ctx.msg.paramsError;
    const result = await this.service.comment.getCommentIndexById(parseInt(id));
    if(result) {
      ctx.body = ctx.msg.success;
      ctx.body.data = result;
    }
    else ctx.body = ctx.msg.notFountComment;
  }

  /** 删除评论 */
  async delete() {
    const ctx = this.ctx;
    const { id } = ctx.params;
    if (!id) ctx.msg.paramsError;
    const result = await this.service.comment.delete(parseInt(id), ctx.user.id);
    ctx.body = result ? ctx.msg.success : ctx.msg.failure;
  }
}

module.exports = CommentController;
