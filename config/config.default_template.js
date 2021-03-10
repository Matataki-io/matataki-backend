/* eslint valid-jsdoc: "off" */

'use strict';
const fs = require('fs');
const path = require('path');

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = appInfo => {

  const config = {};

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1552273931927_1142';
  config.jwtTokenSecret = 'smart signature auth secret';

  config.env = 'test';
  // add your middleware config here
  config.middleware = [ 'errorHandler' ];

  config.errorHandler = {
    match: '/',
  };

  config.mysql = {
    // 单数据库信息配置
    client: {
      // host
      host: 'xxxxx',
      // 端口号
      port: '3306',
      // 用户名
      user: 'xxx',
      // 密码
      password: 'xxxxx',
      // 数据库名
      database: 'xxxx',
      ssl: {
        // ca: fs.readFileSync(__dirname + '/certs/ca.pem'),
        // key: fs.readFileSync(__dirname + '/certs/client-key.pem'),
        // cert: fs.readFileSync(__dirname + '/certs/client-cert.pem')
      },
    },
    // 是否加载到 app 上，默认开启
    app: true,
    // 是否加载到 agent 上，默认关闭
    agent: false,
  };

  config.eos = {
    httpEndpoint: 'http://eos.greymass.com',
    chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
    keyProvider: 'a private key',
    contract: 'signature.bp',
    actor: 'kuriharachie',
    startAt: 1500,
  };

  config.mailSetting = true;
  config.mail = {
    host: 'xxx',
    port: 465,
    secure: true,
    auth: {
      user: 'xxx',
      pass: 'xxx',
    },
  };

  config.security = {
    // TODO: reset in production
    domainWhiteList: [ 'localhost:8080', 'ss-web.starling.team', '.ngrok.io', '192.168.0.102:8080', 'sign-dev.dravatar.xyz', '192.168.31.67:8080' ],
    csrf: {
      enable: false,
    },
  };

  config.cors = {
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS',
    credentials: true,
  };

  config.cacheAPI = {
    uri: '',
    apiToken: '',
  };

  config.oAuth2Server = {
    debug: config.env === 'local',
    grants: [ 'password', 'client_credentials' ],
  };

  config.ont = {
    httpEndpoint: '',
    scriptHash: '',
    websocketClient: '',
    withdraw_account: '',
    withdraw_pri: '',
  };

  config.ipfs_service = {
    host: 'ipfs.infura.io',
    port: 5001,
    protocol: 'https',
  };

  config.isDebug = true;

  config.proxy = true;

  // 限流
  config.ratelimiter = {
    // db: {}, // 如已配置egg-redis 可删除此配置
    router: [
      {
        path: '/order', // 限制路由路径 此规则不会匹配(index.html?id=1)[http://url/index.html?id=1]
        max: 300,
        time: '10s', // 时间单位 s m h d y ...
        message: 'Custom request overrun error message', // 自定义请求超限错误信息
      },
      {
        path: '/post/publish', // 限制路由路径 此规则不会匹配(index.html?id=1)[http://url/index.html?id=1]
        max: 30000000,
        time: '1m', // 时间单位 s m h d y ...
        message: 'Custom request overrun error message', // 自定义请求超限错误信息
      },
    ],
  };

  // 限流如果不在db中初始化redis，则需要启用egg-redis
  config.redis = {
    client: {
      port: 6379, // Redis port
      host: '',
      password: '',
      db: 0,
    },
  };

  // 设置mulitpart
  config.multipart = {
    mode: 'file',
    tmpdir: './uploads',
  };

  // 设置oss
  config.oss = {
    client: {
      accessKeyId: '',
      accessKeySecret: '',
      bucket: '',
      endpoint: '',
      timeout: '60s',
    },
  };

  config.wx = {
    appId: '',
    appSecret: '',
  };

  config.wxServiceAccount = {
    appId: '',
    appSecret: '',
  };

  config.bodyParser = {
    jsonLimit: '1mb',
    formLimit: '1mb',
  };

  config.elasticsearch = {
    host: 'http://localhost:9200',
    indexPosts: 'test_posts',
    indexUsers: 'test_users',
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

  config.geetest = {
    geetest_id: '',
    geetest_key: '',
  };

  config.sendCloud = {
    API_USER: '',
    API_KEY: '',
  };

  config.wechat = {
    appId: '',
    appSecret: '',
  };

  config.wxpay = {
    partnerKey: '',
    appId: '',
    mchId: '',
    notifyUrl: 'https://apitest.smartsignature.io/wx/notify',
    pfx: fs.readFileSync(path.join(__dirname, './apiclient_cert.p12')),
  };

  config.aritclePay = {
    notifyUrl: 'https://apitest.smartsignature.io/wx/notify',
  };

  config.tenpay = {
    client: {
      appid: '',
      mchid: '',
      partnerKey: '',
      notify_url: 'https://apitest.smartsignature.io/wx/notify',
      pfx: fs.readFileSync(path.join(__dirname, './apiclient_cert.p12')),
    },
  };

  config.user = {
    virtualUserPrefix: 'exchange_',
  };

  config.token = {
    maintokens: [ 'BTC', 'ETH', 'XRP', 'BCH', 'USDT', 'LTC', 'EOS', 'BNB', 'BSV', 'TRX', 'XLM', 'ADA', 'XMR', 'BRC', 'DASH', 'ATOM', 'ETC', 'ONT', 'NEO', 'QTUM', 'NAS', 'STEEM' ],
  };

  config.ethereum = {
    runningNetwork: 'rinkeby', // mainnet or rinkeby
    infura: {
      id: '',
      secret: '',
    },
    // privateKey 还没决定好，我先用于开发工作 by Frank
    privateKey: '',
    airdrop: {
      api: 'https://us-central1-ether-air-dropper.cloudfunctions.net/batch_airdrop',
      token: '',
      privateKey: '',
    },
  };

  config.binanceSmartChain = {
    runningNetwork: 'testnet', // mainnet or testnet
    chainId: 0x61, // testnet
    privateKey: '',
    contractAddress: {
      minterContract: '0xe8142C86f7c25A8bF1c73Ab2A5Dd7a7A5C429171',
      peggedTokenFactory: '0x4452c9ec5F0e3840CaBe7f4c194b12298e5A1713',
    },
  };

  config.nextApi = {
    endpoint: 'http://127.0.0.1:3000',
    accessToken: '',
  };

  config.google = {
    appkey: '',
    appsecret: '',
  };

  config.facebook = {
    appKey: '',
    appSecret: '',
  };

  config.timemachine = {
    contracts: {
      prod: '',
      test: '',
    },
  };

  config.alipay = {
    gateway: 'https://openapi.alipay.com/gateway.do',
    APP_ID: '',
    ALIPAY_PUBLIC_KEY: fs.readFileSync(path.join(__dirname, './alipay/ALIPAY_PUBLIC_KEY.pem'), 'ascii'),
    APP_PUBLIC_KEY: fs.readFileSync(path.join(__dirname, './alipay/APP_PUBLIC_KEY.pem'), 'ascii'),
    APP_PRIVATE_KEY: fs.readFileSync(path.join(__dirname, './alipay/APP_PRIVATE_KEY.pem'), 'ascii'),
  };

  // 因为只有我们来操作加解密，所以我们只需要**对称性加密**，只需要私钥
  config.crypto = {
    // 32bytes -> 256 bit, 我们是 AES-256，没毛病
    // 都是十六进制，需要 Buffer.from 指定 encoding 为 hex
    secretKey: '',
  };

  config.awsIpfs = {
    username: '',
    password: '',
  };

  config.tokenCircleBackend = {
    baseURL: 'https://data-for-bot-testing.mttk.net',
    bearerToken: '',
  };

  config.alinode = {
    appid: '',
    secret: '',
  };

  config.passportTwitter = {
    key: '',
    secret: '',
  };

  config.tokenInAndOut = {
    // Collect the token for Matataki DB
    specialAccount: {
      uid: 1354, // testnet
      // uid: 2715, // mainnet
    },
  };

  // 用于 this.service.notification
  config.dingtalkBots = {
    badTokenMonitor: '',
    ipfs: '',
  };

  return config;
};

