'use strict';

const Controller = require('egg').Controller;

class SearchController extends Controller {
  async search() {
    const ctx = this.ctx;
    const { type = 'post', word = 'smart', user = 0 } = ctx.query;

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
        post.content = [];
        post.content.push(post.short_content);
        delete post.short_content;
        result = [ post ];
      } else {
        // 不带用户搜索
        if (user !== 0) {
          const userId = parseInt(user);
          if (isNaN(userId)) {
            ctx.body = ctx.msg.paramsError;
            return;
          }
          result = await this.service.search.searchPost(word, userId);
        // 带用户搜索
        } else {
          result = await this.service.search.searchPost(word);
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
}

module.exports = SearchController;
