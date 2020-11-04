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
    else ctx.body = ctx.msg.failure;
  }
}

module.exports = TimelineController;