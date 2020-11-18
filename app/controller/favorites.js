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
  async edit() {
    const { ctx } = this;
    const { fid = '', name = '', brief = '', status = 0 } = ctx.request.body;
    const result = await ctx.service.favorites.edit({ fid, name, brief, status });
    ctx.body = {
      ...ctx.msg.success,
      ...result,
    };
  }
  async delete() {
    const { ctx } = this;
    const { fid = '' } = ctx.request.body;
    const result = await ctx.service.favorites.delete({ fid });
    ctx.body = {
      ...ctx.msg.success,
      ...result,
    };
  }
  async save() {
    const { ctx } = this;
    const { fid = '', pid = '' } = ctx.request.body;
    const result = await ctx.service.favorites.save({ fid, pid });
    ctx.body = {
      ...ctx.msg.success,
      ...result,
    };
  }
  async cancelSave() {
    const { ctx } = this;
    const { fid = '', pid = '' } = ctx.request.body;
    const result = await ctx.service.favorites.cancelSave({ fid, pid });
    ctx.body = {
      ...ctx.msg.success,
      ...result,
    };
  }

  async list() {
    const { ctx } = this;
    const { userId = '' } = ctx.query;
    const result = await ctx.service.favorites.list({ userId });
    ctx.body = {
      ...ctx.msg.success,
      ...result,
    };
  }
  async post() {
    const { ctx } = this;
    const { userId = '', fid = '', page = 1, pagesize = 20 } = ctx.query;
    const result = await ctx.service.favorites.post({ userId, fid, page, pagesize });
    ctx.body = {
      ...ctx.msg.success,
      ...result,
    };
  }
  async related() {
    const { ctx } = this;
    const { pid = '' } = ctx.query;
    const result = await ctx.service.favorites.related({ pid });
    ctx.body = {
      ...ctx.msg.success,
      ...result,
    };
  }
}

module.exports = FavoritesController;
