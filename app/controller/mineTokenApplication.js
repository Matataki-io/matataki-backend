'use strict';
const Controller = require('../core/base_controller');

class MineTokenApplicationController extends Controller {
  async userApplicationSurvey() {
    const { ctx } = this;
    const result = await this.ctx.service.mineTokenApplication.userApplicationSurvey();
    if (result.code === 0) {
      ctx.body = ctx.msg.success;
      ctx.body.data = result.data;
    } else {
      ctx.body = ctx.msg.failure;
      if (result.message) {
        ctx.body.message = result.message;
      }
    }
  }
  async userApplication() {
    const { ctx } = this;
    const result = await this.ctx.service.mineTokenApplication.userApplication();
    if (result.code === 0) {
      ctx.body = ctx.msg.success;
      ctx.body.data = result.data;
    } else {
      ctx.body = ctx.msg.failure;
      if (result.message) {
        ctx.body.message = result.message;
      }
    }
  }

  async index() {
    const { ctx } = this;
    /**
     * type
     *  draft 保存内容
     *  submit 提交申请
     *  reset 重新申请 || 取消申请
     */
    const { type, logo = '', name = '', symbol = '', brief = '', tag = [] } = ctx.request.body;

    const result = await this.ctx.service.mineTokenApplication.index(type, logo, name, symbol, brief, tag);
    if (result.code === 0) {
      ctx.body = ctx.msg.success;
    } else {
      ctx.body = ctx.msg.failure;
      if (result.message) {
        ctx.body.message = result.message;
      }
    }

  }
  async survey() {
    const { ctx } = this;
    // 参数可以参考数据库字段comment
    const {
      introduction = '', age = '', number = '',
      career = '', field = '', platform = '',
      nickname = '', link = '', interview = 1,
      know = '', publish = '', info = '',
      promote = '',
    } = ctx.request.body;


    const result = await this.ctx.service.mineTokenApplication.survey(
      introduction, age, number,
      career, field, platform,
      nickname, link, interview,
      know, publish, info,
      promote
    );
    if (result.code === 0) {
      ctx.body = ctx.msg.success;
    } else {
      ctx.body = ctx.msg.failure;
      if (result.message) {
        ctx.body.message = result.message;
      }
    }
  }

  async verify() {
    const { ctx } = this;
    const { symbol = '' } = ctx.request.body;
    const pattern = /^[A-Za-z0-9]+$/gi;
    if (!pattern.test(symbol)) {
      ctx.body = {
        ...ctx.msg.failure,
        message: 'Please enter numbers and letters',
      };
      return;
    }
    const result = await this.ctx.service.mineTokenApplication.verify(symbol);
    if (result.code === 0) {
      ctx.body = ctx.msg.success;
    } else {
      ctx.body = ctx.msg.failure;
      if (result.message) {
        ctx.body.message = result.message;
      }
    }
  }
}

module.exports = MineTokenApplicationController;
