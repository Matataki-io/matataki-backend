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

  // 阅读量历史数据
  async getBrowseReadHistory() {
    const res = await this.service.postDashboard.getPostActionHistory(this.ctx.user.id, 'read', parseInt(this.ctx.query.days));
    this.ctx.body = { ...this.ctx.msg.success, data: res }
  }
  
  // 推荐量历史数据
  async getBrowseLikeHistory() {
    const res = await this.service.postDashboard.getPostActionHistory(this.ctx.user.id, 'like', parseInt(this.ctx.query.days));
    this.ctx.body = { ...this.ctx.msg.success, data: res }
  }

  // 分享量历史数据
  async getBrowseShareHistory() {
    const res = await this.service.postDashboard.getPostActionHistory(this.ctx.user.id, 'share', parseInt(this.ctx.query.days));
    this.ctx.body = { ...this.ctx.msg.success, data: res }
  }

  // 解锁量历史数据
  async getBrowseUnlockHistory() {
    const res = await this.service.postDashboard.getPostActionHistory(this.ctx.user.id, 'unlock', parseInt(this.ctx.query.days));
    this.ctx.body = { ...this.ctx.msg.success, data: res }
  }

  // 收藏量历史数据
  async getBrowseBookmarkHistory() {
    const res = await this.service.postDashboard.getBrowseBookmarkHistory(this.ctx.user.id, parseInt(this.ctx.query.days));
    this.ctx.body = { ...this.ctx.msg.success, data: res }
  }

  // 评论量历史数据
  async getBrowseCommentHistory() {
    const res = await this.service.postDashboard.getBrowseCommentHistory(this.ctx.user.id, parseInt(this.ctx.query.days));
    this.ctx.body = { ...this.ctx.msg.success, data: res }
  }

  // 支付量历史数据
  async getBrowseSaleHistory() {
    const res = await this.service.postDashboard.getBrowseSaleHistory(this.ctx.user.id, parseInt(this.ctx.query.days));
    this.ctx.body = { ...this.ctx.msg.success, data: res }
  }

  // 赞赏量历史数据
  async getBrowseRewardHistory() {
    const res = await this.service.postDashboard.getBrowseRewardHistory(this.ctx.user.id, parseInt(this.ctx.query.days));
    this.ctx.body = { ...this.ctx.msg.success, data: res }
  }
}

module.exports = PostDashboardController;