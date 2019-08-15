'use strict';

const Controller = require('egg').Controller;

class SearchController extends Controller {
  async search() {
    const ctx = this.ctx;
    const { type = 'post', word = 'smart' } = ctx.query;

    let result;
    if (type === 'post') {
      if (word[0] === '#') {
        const postid = parseInt(word.substring(1, word.length));
        if (isNaN(postid)) {
          ctx.body = ctx.msg.paramsError;
          return;
        }
        const post = await this.service.search.precisePost(postid);
        post.content = [];
        post.content.push(post.short_content);
        delete post.short_content;
        result = [ post ];
      } else {
        result = await this.service.search.searchPost(word);
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
