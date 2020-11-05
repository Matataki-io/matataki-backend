const Controller = require('../core/base_controller');

class TimelineController extends Controller {
  async getTwitterTimeline() {
    const { ctx } = this;
    const { pagesize = 20, page = 1 } = ctx.query;
    const res = await this.service.timeline.getTwitterTimeline(ctx.user.id, parseInt(page), parseInt(pagesize));
    if (!res.code) {
      ctx.body = {
        ...ctx.msg.success,
        data: res.reply
      }
    }
    else if (res.code === 1) ctx.body = ctx.msg.twitterNotAuthorized;
    else if (res.code === 2) ctx.body = ctx.msg.twitterApiErrorFeedback;
    else ctx.body = ctx.msg.failure;
  }

  async getTwitterUserTimeline() {
    const { ctx } = this;
    const { userId, page = 1, pagesize = 20, maxId = 0 } = ctx.query;
    const accountInfo = await this.service.timeline.getTwitterUserTimeLineSwitch(parseInt(userId));
    if (accountInfo.code === 1) {
      // 未开启推特时间线
      ctx.body = ctx.msg.twitterTimelineIsNotTurnedOn;
      return
    }
    else if (accountInfo.code === 2) {
      // 未绑定推特
      ctx.body = ctx.msg.unboundTwitter;
      return
    }
    const res = await this.service.timeline.getTwitterUserTimeline(accountInfo.data.account, parseInt(page), parseInt(pagesize), parseInt(maxId));
    console.log('res结果：', accountInfo.data.account, res)
    if (!res.code) {
      ctx.body = {
        ...ctx.msg.success,
        data: {
          screen_name: accountInfo.data.account,
          list: res.reply
        }
      }
    }
    else if (res.code === 2) {
      if (res.reply.error === 'Not authorized.') ctx.body = ctx.msg.twitterIsLocked;
      else ctx.body = {
        ...ctx.msg.twitterApiErrorFeedback,
        data: {
          screen_name: accountInfo.data.account
        }
      };
    }
    else ctx.body = ctx.msg.failure;
  }

  async setTwitterUserTimeLineSwitch() {
    const { ctx } = this;
    const { timelineSwitch } = ctx.request.body;
    const res = await this.service.timeline.setTwitterUserTimeLineSwitch(ctx.user.id, parseInt(timelineSwitch))
    ctx.body = {
      ...ctx.msg.success,
      data: res
    }
  }

  async getTwitterUserInfo() {
    const { ctx } = this;
    const { screenName } = ctx.query;
    const res = await this.service.timeline.getTwitterUserInfo(screenName);
    if (!res.code) {
      ctx.body = {
        ...ctx.msg.success,
        data: res.reply
      }
    }
    else if (res.code === 2) ctx.body = ctx.msg.twitterApiErrorFeedback;
    else ctx.body = ctx.msg.failure;
  }
}

module.exports = TimelineController;