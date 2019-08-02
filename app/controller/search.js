'use strict';

const Controller = require('egg').Controller;

class SearchController extends Controller {
  async search() {
    const ctx = this.ctx;
    const { type = 'post', word = 'smart' } = ctx.query;

    let result;
    if (type === 'post') {
      result = await this.service.search.searchPost(word);
    }

    if (!result) {
      ctx.body = ctx.msg.failure;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = result;
  }
}

module.exports = SearchController;
