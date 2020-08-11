'use strict';

const Controller = require('../core/base_controller');

class TimedPostController extends Controller {
  async post() {
    const { ctx } = this;
    const draftId = parseInt(ctx.params.id);
    const { postTime } = ctx.request.body;
    const draft = ctx.service.draft.get(draftId);
    // 草稿不存在
    if (!draft) return ctx.body = ctx.msg.draftNotFound;
    // 不是自己的草稿
    if (draft.uid !== ctx.user.id) return ctx.body = ctx.msg.notYourDraft;
    // 过去的时间
    const twomLater = new Date();
    twomLater.setMinutes(twomLater.getMinutes() + 2);
    twomLater.setSeconds(0);
    twomLater.setMilliseconds(0);
    if (postTime.getTime() < twomLater.getTime()) return ctx.body = ctx.msg.notInTheFuture;

    ctx.service.timedPost.add(draftId, postTime);
    ctx.body = ctx.msg.success;
  }

  async delete() {
    const { ctx } = this;
    const draftId = parseInt(ctx.params.id);
    const draft = ctx.service.draft.get(draftId);
    // 草稿不存在
    if (!draft) return ctx.body = ctx.msg.draftNotFound;
    // 不是自己的草稿
    if (draft.uid !== ctx.user.id) return ctx.body = ctx.msg.notYourDraft;

    ctx.service.timedPost.delete(draftId);
    ctx.body = ctx.msg.success;
  }
}

module.exports = TimedPostController;