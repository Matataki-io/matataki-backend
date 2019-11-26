'use strict';

const Controller = require('../core/base_controller');

class NotificationController extends Controller {
  async fetch() {
    const ctx = this.ctx;
    const { pageSize = 20, page = 1, timeType = 'check_time' } = ctx.query;
    const resp = await this.service.notification.fetch(null, timeType, page, pageSize);

    if (resp === 1) {
      ctx.body = ctx.msg.failure;
      return;
    }

    if (resp === 2) {
      ctx.body = ctx.msg.userNotExist;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = resp;
  }

  async read() {
    const ctx = this.ctx;
    const { provider } = ctx.body;
    const resp = await this.service.notification.mark(provider, 'read_time');

    if (resp === 1 || resp === 3) {
      ctx.body = ctx.msg.failure;
      return;
    }

    if (resp === 2) {
      ctx.body = ctx.msg.userNotExist;
      return;
    }

    ctx.body = ctx.msg.success;
  }
}

module.exports = NotificationController;
