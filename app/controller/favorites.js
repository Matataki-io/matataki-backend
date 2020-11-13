'use strict';

const Controller = require('../core/base_controller');

class FavoritesController extends Controller {
  async create() {
    const { ctx } = this;
    const { name = '', brief = '', status = 0 } = ctx.request.body;
    const result = await ctx.service.favorites.create({ name, brief, status });

    if (result.code === 0) {
      ctx.body = {
        ...ctx.msg.success,
      };
    } else {
      ctx.body = {
        ...ctx.msg.failure,
      };
      ctx.body.message = result.message;
    }
  }
  async save() {
    const { ctx } = this;
    const { fid = '', pid = '' } = ctx.request.body;
    const result = await ctx.service.favorites.save({ fid, pid });

    if (result.code === 0) {
      ctx.body = {
        ...ctx.msg.success,
      };
    } else {
      ctx.body = {
        ...ctx.msg.failure,
      };
      ctx.body.message = result.message;
    }
  }
  async list() {
    const { ctx } = this;
    const { userId } = ctx.query;
    const result = await ctx.service.favorites.list({ userId });
    ctx.body = {
      ...result,
    };
  }
}

module.exports = FavoritesController;
