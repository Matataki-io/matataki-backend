'use strict';
const Controller = require('../core/base_controller');

const BROWSE_DEFAULT_TYPES = ['read', 'like', 'share', 'unlock'];
/** 关于 browse url 中的 type 要写什么，请参考这个： */
const BROWSE_ALL_TYPES = [
  'read',     // 阅读
  'like',     // 推荐
  'share',    // 分享
  'unlock',   // 解锁
  'bookmark', // 收藏
  'comment',  // 评论
  'sale',     // 支付
  'reward'    // 赞赏
]

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

  /**
   * 获取该用户发布文章的阅览量历史，单位时间是天。
   * params.type: 必填。表示获取哪种数据的历史，例如 read 或 like，详情请参考 BROWSE_ALL_TYPES。
   * query.days: 可选。表示筛选 N 天内的数据，不填则返回全部数据。
   */
  async getBrowseHistory() {
    const ctx = this.ctx;
    const { days } = ctx.query;
    const { type } = ctx.params;
    if (!BROWSE_ALL_TYPES.includes(type)) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    let res;
    if (BROWSE_DEFAULT_TYPES.includes(type)) { // 默认
      res = await this.service.postDashboard.getPostActionHistory(ctx.user.id, type, parseInt(days));
    }
    else { // 其它情况
      switch (type) {
        case BROWSE_ALL_TYPES[4]: // 收藏
          res = await this.service.postDashboard.getBrowseBookmarkHistory(ctx.user.id, parseInt(days));
          break;
        case BROWSE_ALL_TYPES[5]: // 评论
          res = await this.service.postDashboard.getBrowseCommentHistory(ctx.user.id, parseInt(days));
          break;
        case BROWSE_ALL_TYPES[6]: // 支付
          res = await this.service.postDashboard.getBrowseSaleHistory(ctx.user.id, parseInt(days));
          break;
        case BROWSE_ALL_TYPES[7]: // 赞赏
          res = await this.service.postDashboard.getBrowseRewardHistory(ctx.user.id, parseInt(days));
          break;
      }
    }

    if (res) {
      ctx.body = {
        ...ctx.msg.success,
        data: res
      };
    }
    else ctx.body = ctx.msg.failure;
  }

  /**
   * 获取该用户发布的文章排名。
   * params.type: 必填。表示排名的依据，例如 read 或 like，详情请参考 BROWSE_ALL_TYPES。
   * query.days: 可选。表示依据 N 天内的数据进行排名，不填则依据全部历史数据排名。
   * query.page, pagesize: 可选。分页参数，默认 1页 10行。
   */
  async getBrowsePostRank() {
    const ctx = this.ctx;
    const { days, page = 1, pagesize = 10 } = ctx.query;
    const { type } = ctx.params;
    if (!BROWSE_ALL_TYPES.includes(type)) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    let res;
    if (BROWSE_DEFAULT_TYPES.includes(type)) { // 默认
      res = await this.service.postDashboard.getBrowsePostActionRank(ctx.user.id, type, parseInt(days), parseInt(page), parseInt(pagesize));
    }
    else { // 其它情况
      switch (type) {
        case BROWSE_ALL_TYPES[4]: // 收藏
          res = await this.service.postDashboard.getBrowseBookmarkRank(ctx.user.id, parseInt(days), parseInt(page), parseInt(pagesize));
          break;
        case BROWSE_ALL_TYPES[5]: // 评论
          res = await this.service.postDashboard.getBrowseCommentRank(ctx.user.id, parseInt(days), parseInt(page), parseInt(pagesize));
          break;
        case BROWSE_ALL_TYPES[6]: // 支付
          res = await this.service.postDashboard.getBrowseSaleRank(ctx.user.id, parseInt(days), parseInt(page), parseInt(pagesize));
          break;
        case BROWSE_ALL_TYPES[7]: // 赞赏
          res = await this.service.postDashboard.getBrowseRewardRank(ctx.user.id, parseInt(days), parseInt(page), parseInt(pagesize));
          break;
      }
    }

    if (res) {
      ctx.body = {
        ...ctx.msg.success,
        data: res
      };
    }
    else ctx.body = ctx.msg.failure;
  }
}

module.exports = PostDashboardController;