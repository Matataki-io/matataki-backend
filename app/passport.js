'use strict';
const jwt = require('jwt-simple');
const message = require('../config/message');

module.exports = {

  // 验证登录，未登录抛异常
  async authorize(ctx, next) {
    const lang = ctx.headers.lang;
    const token = ctx.header['x-access-token'];

    // 没有authorization token信息
    if (token === undefined) {
      ctx.throw(401, 'Access denied.');
    }

    ctx.user = {};
    ctx.user.isAuthenticated = false;
    ctx.msg = message.returnObj(lang);

    // 校验 token， 解密， 验证token的可用性 ，检索里面的用户
    try {
      const decoded = jwt.decode(token, ctx.app.config.jwtTokenSecret);

      if (decoded.exp <= Date.now()) {
        ctx.throw(401, 'invaid access_token: expired');
      }

      ctx.user.username = decoded.iss;
      ctx.user.id = decoded.id;
      ctx.user.isAuthenticated = true;
      ctx.user.platform = decoded.platform;
    } catch (err) {
      ctx.throw(401, 'The token is error.', err);
    }

    await next();
  },

  // 验证登录token，未登录不抛异常
  async verify(ctx, next) {
    const lang = ctx.headers.lang;
    const token = ctx.header['x-access-token'];

    ctx.user = {};
    ctx.user.isAuthenticated = false;
    ctx.msg = message.returnObj(lang);

    // 校验 token， 解密， 验证token的可用性 ，检索里面的用户
    if (token !== undefined) {
      try {
        const decoded = jwt.decode(token, ctx.app.config.jwtTokenSecret);

        if (decoded.exp > Date.now()) {
          ctx.user.username = decoded.iss;
          ctx.user.id = decoded.id;
          ctx.user.isAuthenticated = true;
          ctx.user.id = decoded.id;
          ctx.user.platform = decoded.platform;
        }
      } catch (err) {

      }
    }

    await next();
  },

};

