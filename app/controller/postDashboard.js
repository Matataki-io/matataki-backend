'use strict';
const Controller = require('../core/base_controller');

class PostDashboardController extends Controller {
  async get() {
    const ctx = this.ctx;
    const { days } = ctx.query;
    const res = await this.service.postDashboard.get(ctx.user.id, parseInt(days));
    ctx.body = {
      ...ctx.msg.success,
      data: res
    }
  }
}

module.exports = PostDashboardController;