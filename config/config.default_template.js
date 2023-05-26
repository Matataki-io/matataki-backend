/* eslint valid-jsdoc: "off" */

'use strict';
const fs = require('fs');
const path = require('path');

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {

  const config = {};

  // env mode: local, test, prod
  config.env = 'test';

  // app debug mode
  config.isDebug = config.env === 'local';

  // egg.js proxy mode
  config.proxy = true;

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1552273931927_1142';

  // jwt token secret for auth
  config.jwtTokenSecret = 'smart signature auth secret';

  // ==========================
  //      Built-in Config
  // ==========================

  // add your middleware config here
  config.middleware = [ 'errorHandler' ];
  // app/middleware/error_handler.js config
  config.errorHandler = {
    match: '/',
  };

  // egg-security(https://github.com/eggjs/egg-security) config
  config.security = {
    // attention: you need set your own domain in production
    domainWhiteList: [ '127.0.0.1:8080', 'localhost:8080', 'sstest.frontenduse.top' ],
    csrf: {
      enable: false,
    },
  };

  // egg-cors(https://github.com/eggjs/egg-cors/tree/f5030a9042fa277972ce786cdabbbba8c1dddafa) config
  config.cors = {
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS',
    credentials: true,
  };

  // egg-multipart(https://github.com/eggjs/egg-multipart) config
  config.multipart = {
    mode: 'file',
    tmpdir: './uploads',
  };

  // egg.js body parser limit config
  config.bodyParser = {
    jsonLimit: '1mb',
    formLimit: '1mb',
  };

  // ==========================
  //      Database Config
  // ==========================

  // egg-mysql(https://github.com/eggjs/egg-mysql/tree/d3fa13cff21dcb4cf2d72d52e144fc5d37c26694) config
  // use mysql 5.7
  config.mysql = {
    client: {
      host: 'localhost',
      port: '3306',
      user: 'ssp_test',
      password: 'p@sSw0Rd',
      database: 'ssp_test',
      ssl: {
        // ca: fs.readFileSync(__dirname + '/certs/ca.pem'),
        // key: fs.readFileSync(__dirname + '/certs/client-key.pem'),
        // cert: fs.readFileSync(__dirname + '/certs/client-cert.pem')
      },
      multipleStatements: true,
      charset: 'utf8mb4',
    },
  };

  // egg-redis(https://github.com/eggjs/egg-redis) config
  config.redis = {
    client: {
      port: 6379,
      host: 'redis',
      password: 'p@sSw0Rd',
      db: 0,
    },
  };

  // egg-oss(https://github.com/eggjs/egg-oss) aliyun oss config
  config.oss = {
    client: {
      accessKeyId: 'your access key',
      accessKeySecret: 'your access secret',
      bucket: 'your bucket name',
      endpoint: '{https or http}://{your endpoint name}.aliyun.com',
      timeout: '60s',
    },
  };

  config.elasticsearch = {
    host: 'http://localhost:9200',
    indexPosts: 'test_posts',
    indexUsers: 'test_users',
  };

  // ==========================
  //       Service Config
  // ==========================

  // mail config for sign-up and order
  config.mailSetting = true;
  config.mail = {
    // smtp service host
    host: 'smtp.example.com',
    port: 465,
    secure: true,
    auth: {
      // a email address for sending mail
      user: 'sender@example.com',
      // smtp password
      pass: 'p@sSw0Rd',
    },
  };

  // SendCloud mail service config
  config.sendCloud = {
    apiUser: '<SendCloud api user>',
    apiKey: '<SendCloud api key>',
  };

  // GeeTest CAPTCHA config
  config.geetest = {
    geetestId: '<Geetest Id>',
    geetestKey: '<Geetest Key>',
  };

  // hCaptcha config
  config.hCaptcha = {
    privateKey: '<hCaptcha private key>',
  };

  // WeChat config
  config.wx = {
    appId: '<WeChat app id>',
    appSecret: '<WeChat app secret>',
  };

  config.wechat = {
    appId: '<WeChat app id>',
    appSecret: '<WeChat app secret>',
  };

  // WeChat service account config
  config.wxServiceAccount = {
    appId: '<WeChat service account app id>',
    appSecret: '<WeChat service account app secret>',
  };

  // GitHub App auth config
  config.github = {
    appName: '<GitHub app name>',
    clientId: '<GitHub app client id>',
    clientSecret: '<GitHub app client secret>',
  };

  // Twitter auth config
  config.twitter = {
    appKey: '<Twitter app key>',
    appSecret: '<Twitter app secret>',
    callbackUrl: '<Twitter callback url>',
  };

  // Twitter auth config (another?)
  config.passportTwitter = {
    key: '<Twitter api key>',
    secret: '<Twitter api secret>',
  };

  // Telegram auth config
  config.telegramBot = {
    '<Telegram bot name>': '<Telegram bot token>',
  };

  // Google auth config
  config.google = {
    appKey: '<Google app key>',
    appSecret: '<Google app secret>',
  };

  // Facebook auth config
  config.facebook = {
    appKey: '<Facebook app key>',
    appSecret: '<Facebook app secret>',
  };

  // egg-alinode(https://github.com/eggjs/egg-alinode)
  // Add appid and secret from https://node.console.aliyun.com/
  config.alinode = {
    appid: '<appid>',
    secret: '<secret>',
  };

  // MatatakiPuller(https://github.com/Matataki-io/MatatakiPuller) config
  config.cacheAPI = {
    uri: '<MatatakiPuller service api>',
    apiToken: '<MatatakiPuller service api token>',
  };

  // Token Circle Backend(https://github.com/Matataki-io/TokenCircle-Bot-Backend)
  config.tokenCircleBackend = {
    baseURL: '<Token Circle Backend service api>',
    bearerToken: '<Token Circle Backend service api token>',
  };

  // for NotificationService
  config.dingtalkBots = {
    // '<Bot name>': '<Bot token>',
    badTokenMonitor: '',
    ipfs: '',
  };

  // ==========================
  //     Blockchain Config
  // ==========================

  // EOS chain config
  config.eos = {
    httpEndpoint: 'http://eos.greymass.com',
    chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
    keyProvider: 'a private key',
    contract: 'signature.bp',
    actor: 'kuriharachie',
    startAt: 1500,
  };

  config.ont = {
    httpEndpoint: 'http://polaris1.ont.io:20334',
    scriptHash: 'a75451b23609e04e6606b4a08bc0304bf727ccb5',
    websocketClient: 'ws://polaris1.ont.io:20335',
    withdraw_account: 'AYgQhQUmKuypXNb886m75n7KKAmunbDqct',
    withdraw_pri: 'e21887a5ef830d2aead4e0cdf02f44ff616a30d3e690342327fba5259ffa2361',
  };

  config.ipfs_service = {
    site: 'http://ipfs:5001',
    host: 'ipfs',
    port: 5001,
    protocol: 'http',
  };

  config.token = {
    maintokens: [ 'BTC', 'ETH', 'XRP', 'BCH', 'USDT', 'LTC', 'EOS', 'BNB', 'BSV', 'TRX', 'XLM', 'ADA', 'XMR', 'BRC', 'DASH', 'ATOM', 'ETC', 'ONT', 'NEO', 'QTUM', 'NAS', 'STEEM' ],
  };

  config.ethereum = {
    runningNetwork: 'mainnet',
    infura: {
      id: '<infura id>',
      secret: '<infura secret>',
    },
    privateKey: '',
    airdrop: {
      api: 'https://us-central1-ether-air-dropper.cloudfunctions.net/batch_airdrop',
      token: '',
      privateKey: '',
    },
  };

  config.timemachine = {
    contracts: {
      prod: '0x0000000000000000000000000000000000000000',
      test: '0x0000000000000000000000000000000000000000',
    },
  };

  config.tokenInAndOut = {
    // Collect the token for Matataki DB
    specialAccount: {
      uid: 1354, // testnet
      // uid: 2715, // mainnet
    },
  };

  // ==========================
  //       Payment Config
  // ==========================

  // egg-wxpay(https://github.com/wbget/egg-wxpay) config
  config.wxpay = {
    appId: '<appid>',
    mchId: '<mchid>',
    partnerKey: '<partnerkey>',
    notifyUrl: '<backend api>/wx/notify',
    // ca: '<location-of-your-apiclient-cert.pem>',  // fs.readFileSync(path.join(__dirname, '../config/rootca.pem'))
    pfx: fs.readFileSync(path.join(__dirname, './apiclient_cert.p12')),
  };

  // egg-tenpay(https://github.com/wbget/egg-tenpay) config
  config.tenpay = {
    client: {
      appid: '<appid>',
      mchid: '<mchid>',
      partnerKey: '<partnerkey>',
      notify_url: '<backend api>/wx/notify',
      refund_url: '<backend api>/wx/refundNotify',
      pfx: fs.readFileSync(path.join(__dirname, './apiclient_cert.p12')),
    },
  };

  // alipay config
  config.alipay = {
    appId: '<alipay app id>',
    privateKey: fs.readFileSync(path.join(__dirname, './alipay/APP_PRIVATE_KEY.pem'), 'ascii'),
    alipayPublicKey: fs.readFileSync(path.join(__dirname, './alipay/APP_PUBLIC_KEY.pem'), 'ascii'),
    return_url: '<frontend url>',
    notify_url: '<backend api>/alipay/notify',
  };

  config.aritclePay = {
    notify_url: '<backend api>/wx/payarticlenotify',
  };

  // exchange user config
  config.user = {
    virtualUserPrefix: 'exchange_',
  };

  // ==========================
  //       Other Config
  // ==========================

  // egg-ratelimiter(https://github.com/ZQun/egg-ratelimiter) config
  config.ratelimiter = {
    router: [
      {
        path: '/order', // 限制路由路径 此规则不会匹配(index.html?id=1)[http://url/index.html?id=1]
        max: 3,
        time: '10s', // 时间单位 s m h d y ...
        message: 'Custom request overrun error message', // 自定义请求超限错误信息
      },
      {
        path: '/post/publish', // 限制路由路径 此规则不会匹配(index.html?id=1)[http://url/index.html?id=1]
        max: 10,
        time: '1m', // 时间单位 s m h d y ...
        message: 'Custom request overrun error message', // 自定义请求超限错误信息
      },
      {
        path: '/comment/comment', // 限制路由路径 此规则不会匹配(index.html?id=1)[http://url/index.html?id=1]
        max: 10,
        time: '1m', // 时间单位 s m h d y ...
        message: 'Custom request overrun error message', // 自定义请求超限错误信息
      },
    ],
  };

  // egg-socket.io(https://github.com/eggjs/egg-socket.io) config
  config.io = {
    redis: {
      port: config.redis.client.port,
      host: config.redis.client.host,
      auth_pass: config.redis.client.password,
      db: config.redis.client.db,
    },
    init: {}, // passed to engine.io
    namespace: {
      '/': {
        connectionMiddleware: [],
        packetMiddleware: [],
      },
      '/chat': {
        connectionMiddleware: [ 'auth' ],
        packetMiddleware: [ 'filter' ],
      },
    },
  };

  // 因为只有我们来操作加解密，所以我们只需要**对称性加密**，只需要私钥
  config.crypto = {
    // 32bytes -> 256 bit, 我们是 AES-256，没毛病
    // 都是十六进制，需要 Buffer.from 指定 encoding 为 hex
    secretKey: '',
  };

  config.points = {
    regInviter: 66, // 每成功邀请一名好友注册，邀请者可得到xx积分
    regInvitee: 500, // 成功被邀请注册，登录即可领取xx积分
    regInviteFinished: 600, // 邀请任务完成奖励600积分

    loginNew: 300, // 所有新用户在活动期间首次登录即可领取x积分奖励
    loginOld: 1000, // 所有老用户在活动期间首次登录即可领取x积分奖励

    profile: 50, // 完善资料获取积分

    readRate: 15, // 15 = 30 / 2，阅读多少秒可以获得1积分，每30秒获得2积分
    readNew: 5, // 阅读新文章
    readNewAuthor: 1, // 阅读新文章，作者
    readAuthorRate: 0.5, // 阅读，作者获得阅读积分的1/2
    readReferralRate: 0.25, // 你邀请的好友通过阅读获得积分奖励，你额外可得1/4
    readDailyMax: 100, // 每日阅读最大积分
    readOnceMax: 10, // 阅读每篇文章可获得的最大积分

    publish: 100, // 发布文章
    publishReferral: 20, // 你邀请的好友发布新文章，你额外可得10积分
    publishDailyMax: 300, // 每日发文最大积分
  };

  return config;
};
