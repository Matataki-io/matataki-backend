'use strict';

const Controller = require('../core/base_controller');

class NotificationController extends Controller {  
  /*!
  * 这两个请求的方法目前只是测试用的，并没有实际对接前端。
  * 有了具体需求之后再做正式的。
  */

  async getUserEvents() {
    const ctx = this.ctx;
    const {pageSize = 20, page = 1, unread = 1 } = ctx.query;
    const result = await this.service.notify.event.getEventsByUid(parseInt(page), parseInt(pageSize), ctx.user.id, unread == 1);

    ctx.body = ctx.msg.success;
    ctx.body.data = result;
  }

  async haveRead() {
    const ctx = this.ctx;
    const { startId, endId } = ctx.request.body;
    const result = await this.service.notify.event.haveReadByRegion(ctx.user.id, parseInt(startId), parseInt(endId));
    if(result) {
      ctx.body = ctx.msg.success;
      ctx.body.data = result;
    }
    else ctx.body = ctx.msg.failure;
  }

}

module.exports = NotificationController;
