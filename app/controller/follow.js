'use strict';

const Controller = require('../core/base_controller');
const moment = require('moment');
const _ = require('lodash');

class FollowController extends Controller {

  async follow() {
    const ctx = this.ctx;

    const { uid } = ctx.request.body;

    const resp = await this.service.follow.follow(uid);

    if (resp === 1) {
      ctx.body = ctx.msg.failure;
      return;
    }

    if (resp === 2) {
      ctx.body = ctx.msg.followYourself;
      return;
    }

    if (resp === 3) {
      ctx.body = ctx.msg.userNotExist;
      return;
    }

    ctx.body = ctx.msg.success;
  }

  async unfollow() {
    const ctx = this.ctx;

    const { uid } = ctx.request.body;

    const resp = await this.service.follow.unfollow(uid);

    if (resp === 1) {
      ctx.body = ctx.msg.failure;
      return;
    }

    if (resp === 2) {
      ctx.body = ctx.msg.followYourself;
      return;
    }

    if (resp === 3) {
      ctx.body = ctx.msg.userNotExist;
      return;
    }

    ctx.body = ctx.msg.success;
  }


  async follows() {
    const ctx = this.ctx;

    const { pagesize = 20, page = 1, uid = null } = ctx.query;

    const resp = await this.service.follow.follows(pagesize, page, uid);

    if (resp === 2) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = resp;
  }

  async fans() {
    const ctx = this.ctx;

    const { pagesize = 20, page = 1, uid = null } = ctx.query;

    const resp = await this.service.follow.fans(pagesize, page, uid);

    if (resp === 2) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = resp;
  }

}

module.exports = FollowController;
