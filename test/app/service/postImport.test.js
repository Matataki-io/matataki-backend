'use strict';

const { app, assert } = require('egg-mock/bootstrap');
const moment = require('moment');
const md5 = require('crypto-js/md5');

describe('test/app/service/postImport.test.js', () => {
  it('should get correct steemit blog result', async () => {
    const md5String = md5('./uploads/steemit_00000000-0000-0000-0000-000000000000.jpg');
    const expected = {
      title: 'New Memes',
      cover: `/image/${moment().format('YYYY/MM/DD')}/${md5String}.jpg`,
      content: 'https://i.redd.it/3atk5nw97qi61.jpg',
      tags: 'steemit,funny,fun,memes',
    };
    const ctx = app.mockContext();
    const result = await ctx.service.postImport.handleSteemit('https://steemit.com/steemit/@abdelzaher1/2cn4y6-new-memes');
    assert.deepStrictEqual(result, expected);
  });
});
