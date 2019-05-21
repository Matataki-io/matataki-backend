'use strict';

const Controller = require('egg').Controller;
var _ = require('lodash');

class ShareController extends Controller {

  async shares() {

    const ctx = this.ctx;

    const { pagesize = 20, page = 1, signid } = this.ctx.query;

    // singid缺少,此种情况用户正常使用时候不会出现
    if (!signid) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    const shares = await this.service.share.shareList(signid, page, pagesize);

    if (shares === null) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = shares;
  }
}

module.exports = ShareController;
