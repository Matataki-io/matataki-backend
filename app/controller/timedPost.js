'use strict';

const Controller = require('../core/base_controller');
const { verify } = require('hcaptcha');

class TimedPostController extends Controller {
  async post() {
    const { ctx } = this;
    const draftId = parseInt(ctx.params.id);
    const postTime = new Date(ctx.request.body.postTime);

    const draft = await ctx.service.draft.get(draftId);
    // 草稿不存在
    if (!draft) { ctx.body = ctx.msg.draftNotFound; return; }
    // 不是自己的草稿
    if (draft.uid !== ctx.user.id) { ctx.body = ctx.msg.notYourDraft; return; }
    // 不许用过去的时间
    const twomLater = new Date();
    twomLater.setMinutes(twomLater.getMinutes() + 2);
    twomLater.setSeconds(0);
    twomLater.setMilliseconds(0);
    if (postTime.getTime() < twomLater.getTime()) { ctx.body = ctx.msg.notInTheFuture; return; }

    await ctx.service.timedPost.add(draftId, postTime);
    ctx.body = ctx.msg.success;
  }

  async delete() {
    const { ctx } = this;
    const draftId = parseInt(ctx.params.id);
    const draft = await ctx.service.draft.get(draftId);
    // 草稿不存在
    if (!draft) { ctx.body = ctx.msg.draftNotFound; return; }
    // 不是自己的草稿
    if (draft.uid !== ctx.user.id) { ctx.body = ctx.msg.notYourDraft; return; }

    await ctx.service.timedPost.delete(draftId);
    ctx.body = ctx.msg.success;
  }
}

module.exports = TimedPostController;
