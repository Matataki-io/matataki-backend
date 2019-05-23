'use strict';
const { app, mock, assert } = require('egg-mock/bootstrap');

describe('get()', () => {
  it('should get exists user', async () => {
    // 创建 ctx
    const ctx = app.mockContext();
    // 通过 ctx 访问到 service.user
    const result = await ctx.service.post.testproduct();
    // assert(user);
  });
});
