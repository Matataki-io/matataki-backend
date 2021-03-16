'use strict';

const Controller = require('../core/base_controller');

class HCaptchaController extends Controller {
  async doINeedCaptcha() {
    const { ctx } = this;
    const isInWhiteList = await this.service.hCaptcha.isUserInWhiteList(ctx.user.id);
    ctx.body = ctx.msg.success;
    ctx.body.data = { isInWhiteList };
  }
}

module.exports = HCaptchaController;
