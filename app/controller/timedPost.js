'use strict';

const Controller = require('../core/base_controller');
const { verify } = require('hcaptcha');

class TimedPostController extends Controller {
  async post() {
    const { ctx } = this;
    const draftId = parseInt(ctx.params.id);
    const postTime = new Date(ctx.request.body.postTime);

    const { hCaptchaData } = ctx.request.body;

    try {
      if (!hCaptchaData.token) throw new Error('Bad Captcha');
      const verifiedCaptchaData = await verify('0x7625265563A6378Af17bd7219D0647Fb6e665136', hCaptchaData.token);
      if (!verifiedCaptchaData.success) throw new Error('Bad Captcha');
    } catch (error) {
      ctx.status = 400;
      ctx.body = ctx.msg.failure;
      ctx.body.message = 'bad captcha';
      return;
    }

    const draft = await ctx.service.draft.get(draftId);
    // 草稿不存在
    if (!draft) return ctx.body = ctx.msg.draftNotFound;
    // 不是自己的草稿
    if (draft.uid !== ctx.user.id) return ctx.body = ctx.msg.notYourDraft;
    // 不许用过去的时间
    const twomLater = new Date();
    twomLater.setMinutes(twomLater.getMinutes() + 2);
    twomLater.setSeconds(0);
    twomLater.setMilliseconds(0);
    if (postTime.getTime() < twomLater.getTime()) return ctx.body = ctx.msg.notInTheFuture;

    await ctx.service.timedPost.add(draftId, postTime);
    ctx.body = ctx.msg.success;
  }

  async delete() {
    const { ctx } = this;
    const draftId = parseInt(ctx.params.id);
    const draft = await ctx.service.draft.get(draftId);
    // 草稿不存在
    if (!draft) return ctx.body = ctx.msg.draftNotFound;
    // 不是自己的草稿
    if (draft.uid !== ctx.user.id) return ctx.body = ctx.msg.notYourDraft;

    await ctx.service.timedPost.delete(draftId);
    ctx.body = ctx.msg.success;
  }
}

module.exports = TimedPostController;