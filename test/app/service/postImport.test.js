'use strict';

const { app, assert } = require('egg-mock/bootstrap');

describe('test/app/service/postImport.test.js', () => {
  it('should get correct steemit blog result', async () => {
    const expected = {
      title: 'New Memes',
      cover: 'https://i.redd.it/3atk5nw97qi61.jpg',
      content: 'https://i.redd.it/3atk5nw97qi61.jpg',
      tags: 'steemit,funny,fun,memes',
    };
    const ctx = app.mockContext();
    const result = await ctx.service.postImport.handleSteemit('https://steemit.com/steemit/@abdelzaher1/2cn4y6-new-memes');
    assert.deepStrictEqual(result, expected);
  });
});
