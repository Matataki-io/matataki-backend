/**
 * Create a copy of this file named `config.default.js` and populate it with your secrets.
 * Some default values are set to work with the docker-compose setup.
 */

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * @param {import('egg').EggAppInfo} appInfo app info
 */
module.exports = appInfo => {

  const config = {};

  /**
   * App env, use for error handling and some service
   * env mode: local, test, prod
   * attention: should change to 'prod' before deploy to production env
   */
  config.env = 'test';

  /**
   * App debug mode, use for bypass some app logic
   * attention: do not enable it in production env
   */
  config.isDebug = config.env === 'local';

  /**
   * egg.js proxy mode, enable it can collect user's request ip
   */
  config.proxy = true;

  /**
   * Use for cookie sign key
   * attention: should change to your own and keep security
   */
  config.keys = appInfo.name + '_1552273931927_1142';

  /**
   * JWT token secret for auth
   * attention: should change to your own and keep security
   */
  config.jwtTokenSecret = 'smart signature auth secret';

  // ==========================
  //      Built-in Config
  // ==========================

  /**
   * Custom middleware config
   */
  config.middleware = [ 'errorHandler' ];
  // app/middleware/error_handler.js config
  config.errorHandler = {
    match: '/',
  };

  /**
   * egg-security(https://github.com/eggjs/egg-security) config
   * attention: you need set your own domain in production
   */
  config.security = {
    domainWhiteList: [ 'http://127.0.0.1:3000', 'http://localhost:3000' ],
    csrf: {
      enable: false,
    },
  };

  /**
   * egg-cors(https://github.com/eggjs/egg-cors/tree/f5030a9042fa277972ce786cdabbbba8c1dddafa) config
   */
  config.cors = {
    allowMethods: 'GET,HEAD,PUT,POST,DELETE,PATCH,OPTIONS',
    credentials: true,
  };

  /**
   * egg-multipart(https://github.com/eggjs/egg-multipart) config
   */
  config.multipart = {
    mode: 'file',
    tmpdir: './uploads',
  };

  /**
   * egg.js body parser limit config
   */
  config.bodyParser = {
    jsonLimit: '1mb',
    formLimit: '1mb',
  };

  // ==========================
  //      Database Config
  // ==========================

  /**
   * egg-mysql(https://github.com/eggjs/egg-mysql/tree/d3fa13cff21dcb4cf2d72d52e144fc5d37c26694) config
   * use mysql 5.7
   * attention: this config used for docker compose, if you don't use docker compose, you should change it
   */
  config.mysql = {
    client: {
      host: 'db_local',
      port: '3306',
      user: 'ss_test',
      password: 'p@sSw0Rd',
      database: 'ss',
      // ssl: {
      //   ca: fs.readFileSync(__dirname + '/certs/ca.pem'),
      //   key: fs.readFileSync(__dirname + '/certs/client-key.pem'),
      //   cert: fs.readFileSync(__dirname + '/certs/client-cert.pem')
      // },
      multipleStatements: true,
      charset: 'utf8mb4',
    },
  };

  /**
   * egg-redis(https://github.com/eggjs/egg-redis) config
   * use redis 7
   * attention: this config used for docker compose, if you don't use docker compose, you should change it
   */
  config.redis = {
    client: {
      port: 6379,
      host: 'redis_local',
      password: 'p@sSw0Rd',
      db: 0,
    },
  };

  /**
   * Elasticsearch config
   * use elasticsearch 7
   * attention: this config used for docker compose, if you don't use docker compose, you should change it
   */
  config.elasticsearch = {
    host: 'http://elasticsearch_local:9200',
    indexPosts: 'test_posts',
    indexUsers: 'test_users',
    indexShares: 'test_shares',
    indexTokens: 'test_tokens',
    indexTags: 'test_tags',
  };

  /**
   * egg-oss(https://github.com/eggjs/egg-oss) aliyun oss config
   * Matataki use Aliyun OSS to store images
   * attention: you need set your own aliyun oss config
   */
  config.oss = {
    client: {
      accessKeyId: 'your access key',
      accessKeySecret: 'your access secret',
      bucket: 'your bucket name',
      endpoint: '{https or http}://{your endpoint name}.aliyun.com',
      timeout: '60s',
    },
  };

  /**
   * Aliyun OSS bucket public url
   */
  const ossUrl = new URL(config.oss.client.endpoint);
  config.ssimg = `${ossUrl.protocol}//${config.oss.client.bucket}.${ossUrl.host}`;

  // ==========================
  //       Service Config
  // ==========================

  /**
   * SMTP mail config for sign-up and order
   * attention: you need set your own mail config
   */
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

  /**
   * SendCloud mail service config
   * attention: you need set your own SendCloud config
   */
  config.sendCloud = {
    apiUser: '<SendCloud api user>',
    apiKey: '<SendCloud api key>',
  };

  /**
   * GeeTest CAPTCHA config
   * attention: you need set your own GeeTest config
   */
  config.geetest = {
    geetestId: '<Geetest Id>',
    geetestKey: '<Geetest Key>',
  };

  /**
   * hCaptcha config
   * attention: you need set your own hCaptcha config
   */
  config.hCaptcha = {
    privateKey: '<hCaptcha private key>',
  };

  /**
   * WeChat share config
   * attention: you need set your own WeChat config
   */
  config.wx = {
    appId: '<WeChat app id>',
    appSecret: '<WeChat app secret>',
  };

  /**
   * WeChat auth config
   * attention: you need set your own WeChat config
   */
  config.wechat = {
    appId: '<WeChat app id>',
    appSecret: '<WeChat app secret>',
  };

  /**
   * WeChat service account config
   * attention: you need set your own WeChat service account config
   */
  config.wxServiceAccount = {
    appId: '<WeChat service account app id>',
    appSecret: '<WeChat service account app secret>',
  };

  /**
   * GitHub App oauth config
   * attention: you need set your own GitHub App config
   */
  config.github = {
    appName: '<GitHub app name>',
    clientId: '<GitHub app client id>',
    clientSecret: '<GitHub app client secret>',
  };

  /**
   * Twitter oauth config
   * attention: you need set your own Twitter config
   */
  config.twitter = {
    appKey: '<Twitter app key>',
    appSecret: '<Twitter app secret>',
    callbackUrl: '<Twitter callback url>',
  };

  /**
   * Twitter oauth config (another?)
   * attention: you need set your own Twitter config
   */
  config.passportTwitter = {
    key: '<Twitter api key>',
    secret: '<Twitter api secret>',
  };

  /**
   * Twitter oauth config for Matataki Timeline service
   * attention: you need set your own Twitter config
   */
  config.twitterConsumerKey = {
    key: '<Twitter api key>',
    secret: '<Twitter api secret>',
  };

  /**
   * Telegram bot auth config
   * attention: you need set your own Telegram config
   */
  config.telegramBot = {
    '<Telegram bot name>': '<Telegram bot token>',
  };

  /**
   * Google auth config
   * attention: you need set your own Google config
   */
  config.google = {
    appKey: '<Google app key>',
    appSecret: '<Google app secret>',
  };

  /**
   * Facebook auth config
   * attention: you need set your own Facebook config
   */
  config.facebook = {
    appKey: '<Facebook app key>',
    appSecret: '<Facebook app secret>',
  };

  /**
   * egg-alinode(https://github.com/eggjs/egg-alinode)
   * Add appid and secret from https://node.console.aliyun.com/
   * attention: you need set your own AliNode config
   */
  config.alinode = {
    appid: '<appid>',
    secret: '<secret>',
  };

  /**
   * MatatakiPuller(https://github.com/Matataki-io/MatatakiPuller) config
   * You can get MatatakiPuller from https://github.com/Matataki-io/MatatakiPuller
   * attention: you need set your own MatatakiPuller config
   */
  config.cacheAPI = {
    uri: '<MatatakiPuller service api>',
    apiToken: '<MatatakiPuller service api token>',
  };

  /**
   * Token Circle Backend(https://github.com/Matataki-io/TokenCircle-Bot-Backend)
   * You can get Token Circle Backend from https://github.com/Matataki-io/TokenCircle-Bot-Backend
   * attention: you need set your own Token Circle Backend config
   */
  config.tokenCircleBackend = {
    baseURL: '<Token Circle Backend service api>',
    bearerToken: '<Token Circle Backend service api token>',
  };

  /**
   * DingTalk bot for NotificationService, might be optional
   */
  config.dingtalkBots = {
    // '<Bot name>': '<Bot token>',
    badTokenMonitor: '',
    ipfs: '',
  };

  // ==========================
  //     Blockchain Config
  // ==========================

  /**
   * EOS chain config
   * attention: you need set your own
   */
  config.eos = {
    httpEndpoint: 'http://eos.greymass.com',
    chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
    keyProvider: 'a private key',
    contract: 'signature.bp',
    actor: 'kuriharachie',
    startAt: 1500,
    withdraw_account: 'kuriharachie',
    withdraw_pri: 'a private key',
    orange_contract: 'cryptomeetup',
  };

  /**
   * Ontology chain config
   * attention: you need set your own
   */
  config.ont = {
    httpEndpoint: 'http://polaris1.ont.io:20334',
    scriptHash: 'a75451b23609e04e6606b4a08bc0304bf727ccb5',
    websocketClient: 'ws://polaris1.ont.io:20335',
    withdraw_account: 'AYgQhQUmKuypXNb886m75n7KKAmunbDqct',
    withdraw_pri: 'a private key',
  };

  /**
   * Kubo IPFS config
   * attention: this config used for docker compose, if you don't use docker compose, you should change it
   */
  config.ipfs_service = {
    site: 'http://ipfs_local:5001',
    host: 'ipfs_local',
    port: 5001,
    protocol: 'http',
  };

  /**
   * Fleek IPFS config
   * attention: you need set your own Fleek IPFS config
   */
  config.fleekIPFS = {
    apiKey: '<Fleek api key>',
    apiSecret: '<Fleek api secret>',
  };

  /**
   * Mint token whitelist?
  */
  config.token = {
    maintokens: [ 'BTC', 'ETH', 'XRP', 'BCH', 'USDT', 'LTC', 'EOS', 'BNB', 'BSV', 'TRX', 'XLM', 'ADA', 'XMR', 'BRC', 'DASH', 'ATOM', 'ETC', 'ONT', 'NEO', 'QTUM', 'NAS', 'STEEM' ],
  };

  /**
   * Ethereum chain config
   * attention: you need set your own Ethereum config
   */
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

  /**
   * TimeMachine config
   */
  config.timemachine = {
    contracts: {
      prod: '0x0000000000000000000000000000000000000000',
      test: '0x0000000000000000000000000000000000000000',
    },
  };

  /**
   * Cross chain token in-out service config
   */
  config.tokenInAndOut = {
    // Collect the token for Matataki DB
    specialAccount: {
      uid: 1354, // testnet
      // uid: 2715, // mainnet
    },
  };

  /**
   * BSC cross chain api config
   * attention: you need set your own config
   */
  config.bscCrossChainApi = {
    endpoint: '<api url>',
    accessToken: 'access token uuid',
  };

  /**
   * Matic(Polygon) cross chain api config
   * attention: you need set your own config
   */
  config.maticCrossChainApi = {
    endpoint: '<api url>',
    accessToken: 'access token uuid',
  };

  // ==========================
  //       Payment Config
  // ==========================

  /**
   * egg-wxpay(https://github.com/wbget/egg-wxpay) config
   * attention: you need set your own WeChat pay config
   */
  config.wxpay = {
    appId: '<appid>',
    mchId: '<mchid>',
    partnerKey: '<partnerkey>',
    notifyUrl: '<backend api>/wx/notify',
    // ca: '<location-of-your-apiclient-cert.pem>',  // fs.readFileSync(path.join(__dirname, '../config/rootca.pem'))
    pfx: fs.readFileSync(path.join(__dirname, './apiclient_cert.p12')),
  };

  /**
   * WeChat pay for article config
   * attention: replace <backend api> to your own api domain
   */
  config.aritclePay = {
    notify_url: '<backend api>/wx/payarticlenotify',
  };

  /**
   * egg-tenpay(https://github.com/wbget/egg-tenpay) config
   * attention: you need set your own Tencent pay config
   */
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

  /**
   * AliPay config
   * attention: you need set your own AliPay config
   */
  config.alipay = {
    appId: '<alipay app id>',
    privateKey: fs.readFileSync(path.join(__dirname, './alipay/APP_PRIVATE_KEY.pem'), 'ascii'),
    alipayPublicKey: fs.readFileSync(path.join(__dirname, './alipay/APP_PUBLIC_KEY.pem'), 'ascii'),
    return_url: '<frontend url>',
    notify_url: '<backend api>/alipay/notify',
  };

  /**
   * Exchange user config
   */
  config.user = {
    virtualUserPrefix: 'exchange_',
    tradeUserPrefix: 'trade_',
  };

  // ==========================
  //       Other Config
  // ==========================

  /**
   * egg-ratelimiter(https://github.com/ZQun/egg-ratelimiter) config
   */
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

  /**
   * egg-socket.io(https://github.com/eggjs/egg-socket.io) config
   */
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

  /**
   * egg-logrotator(https://github.com/eggjs/egg-logrotator) config
   * if any files need rotate by file size, config here
   */
  config.logrotator = {
    filesRotateByHour: [], // list of files that will be rotated by hour
    hourDelimiter: '-', // rotate the file by hour use specified delimiter
    // filesRotateBySize: [master-stdout.log],           // list of files that will be rotated by size
    maxFileSize: 50 * 1024 * 1024, // Max file size to judge if any file need rotate
    maxFiles: 10, // pieces rotate by size
    rotateDuration: 60000, // time interval to judge if any file need rotate
    maxDays: 7, // keep max days log files, default is `31`. Set `0` to keep all logs
  };

  /**
   * Crypto config
   * attention: you need set your own secret key
   * 因为只有我们来操作加解密，所以我们只需要**对称性加密**，只需要私钥
   */
  config.crypto = {
    // 32bytes -> 256 bit, 我们是 AES-256，没毛病
    // 都是十六进制，需要 Buffer.from 指定 encoding 为 hex
    secretKey: '',
  };

  /**
   * Rewards points config
   */
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
