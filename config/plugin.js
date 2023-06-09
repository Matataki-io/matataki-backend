'use strict';

/** @type Egg.EggPlugin */
module.exports = {
  cors: {
    enable: true,
    package: 'egg-cors',
  },

  nunjucks: {
    enable: true,
    package: 'egg-view-nunjucks',
  },

  mysql: {
    enable: true,
    package: 'egg-mysql',
  },

  redis: {
    enable: true,
    package: 'egg-redis',
  },

  oss: {
    enable: true,
    package: 'egg-oss',
  },

  // 增加限流控制
  ratelimiter: {
    enable: true,
    package: 'egg-ratelimiter',
  },

  logrotator: {
    enable: true,
    package: 'egg-logrotator',
  },

  // 微信支付
  wxpay: {
    enable: true,
    package: 'egg-wxpay',
  },

  tenpay: {
    enable: true,
    package: 'egg-tenpay',
  },

  alinode: {
    enable: false,
    package: 'egg-alinode',
  },
};
