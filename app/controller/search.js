'use strict';

const Controller = require('egg').Controller;

class SearchController extends Controller {
  async search() {
    const ctx = this.ctx;
    const { type = 'post', word = 'smart', channel = null, page = 1, pagesize = 10 } = ctx.query;

    if (isNaN(parseInt(page)) || isNaN(parseInt(pagesize))) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    // 还需要记录搜索历史

    let result;
    if (type === 'post') {
      // 带了文章id， 视为精确搜索
      if (word[0] === '#') {
        const postid = parseInt(word.substring(1, word.length));
        if (isNaN(postid)) {
          ctx.body = ctx.msg.paramsError;
          return;
        }
        const post = await this.service.search.precisePost(postid);
        // 精确搜索， 需要独立把文章摘要提取出来
        result = post;
      } else {
        // 带category搜索
        if (channel) {
          const channelId = parseInt(channel);
          if (!(channelId === 1 || channelId === 2)) {
            ctx.body = ctx.msg.paramsError;
            return;
          }
          result = await this.service.search.searchPost(word, channelId, page, pagesize);
        // 不带category搜索
        } else {
          result = await this.service.search.searchPost(word, null, page, pagesize);
        }
      }
    }

    if (!result) {
      ctx.body = ctx.msg.failure;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = result;
  }

  async searchUser() {
    const ctx = this.ctx;
    const { word = 'smart', page = 1, pagesize = 10 } = ctx.query;

    if (isNaN(parseInt(page)) || isNaN(parseInt(pagesize))) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    const result = await this.service.search.searchUser(word, page, pagesize);

    if (!result) {
      ctx.body = ctx.msg.failure;
      return;
    }

    ctx.body = ctx.msg.success;
    ctx.body.data = result;
  }
}

module.exports = SearchController;
