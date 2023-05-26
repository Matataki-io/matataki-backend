'use strict';

const Service = require('egg').Service;
const md5 = require('crypto-js/md5');
const sha256 = require('crypto-js/sha256');
const axios = require('axios');
const qs = require('qs');
const moment = require('moment');
const jwt = require('jwt-simple');
const consts = require('./consts');
const ecc = require('eosjs-ecc');
const ONT = require('ontology-ts-sdk');
const EOS = require('eosjs');
const OAuth = require('oauth');
const { createHash, createHmac } = require('crypto');
const { google } = require('googleapis');
const codebird = require('../extend/codebird');
const random = require('string-random');

class AuthService extends Service {

  constructor(ctx, app) {
    super(ctx, app);
    this.app.mysql.queryFromat = function(query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function(txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    };
    this.eosClient = EOS({
      chainId: ctx.app.config.eos.chainId,
      httpEndpoint: ctx.app.config.eos.httpEndpoint,
    });
  }

  async eos_auth(sign, username, publickey) {
    // 2. 验证签名
    try {
      const recover = ecc.recover(sign, username);
      if (recover !== publickey) {
        return false;
      }
    } catch (err) {
      return false;
    }

    // 由于EOS的帐号系统是 username 和 公钥绑定的关系，所有要多加一个验证，username是否绑定了签名的EOS公钥
    try {
      const eosacc = await this.eosClient.getAccount(username);
      let pass_permission_verify = false;

      for (let i = 0; i < eosacc.permissions.length; i++) {
        const permit = eosacc.permissions[i];
        const keys = permit.required_auth.keys;
        for (let j = 0; j < keys.length; j++) {
          const pub = keys[j].key;
          if (publickey === pub) {
            pass_permission_verify = true;
          }
        }
      }

      if (!pass_permission_verify) {
        return false;
      }
    } catch (err) {
      // this.logger.error('AuthController.eos_auth error: %j', err);
      return false;
    }

    return true;
  }

  async ont_auth(sign, username, publickey) {

    const pub = new ONT.Crypto.PublicKey(publickey);

    const msg = ONT.utils.str2hexstr(username);

    const signature = ONT.Crypto.Signature.deserializeHex(sign);

    const pass = pub.verify(msg, signature);

    return pass;

  }

  telegram_auth(token, { hash, ...data }) {
    const secret = createHash('sha256')
      .update(token)
      .digest();
    const checkString = Object.keys(data)
      .sort()
      .map(k => `${k}=${data[k]}`)
      .join('\n');
    const hmac = createHmac('sha256', secret)
      .update(checkString)
      .digest('hex');
    this.logger.info('controller:telegram_auth::', { hash, hmac });
    return hmac === hash;
  }

  twitter_prepare(type = 'binding') {
    const oauth = new OAuth.OAuth(
      'https://api.twitter.com/oauth/request_token',
      'https://api.twitter.com/oauth/access_token',
      this.app.config.twitter.appKey,
      this.app.config.twitter.appSecret,
      '1.0',
      this.app.config.twitter.callbackUrl + '?type=' + type,
      'HMAC-SHA1'
    );

    return new Promise((resolve, reject) => {
      oauth.getOAuthRequestToken((err, token) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(token);
      });
    });
  }

  // twitter号验证，获取oauth_token_secret
  // 详情见https://developer.twitter.com/en/docs/basics/authentication/guides/log-in-with-twitter
  async twitter_auth(oauth_token, oauth_verifier) {
    const { data } = await axios({
      method: 'POST',
      url: 'https://api.twitter.com/oauth/access_token',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: qs.stringify({ oauth_token, oauth_verifier }),
    });

    return qs.parse(data);
  }

  // twitter号登录，验证token和secret
  // 方法见https://webapplog.com/node-js-oauth1-0-and-oauth2-0-twitter-api-v1-1-examples/
  async twitter_login(oauth_token, oauth_token_secret) {
    let tokendata = null;
    try {
      const oauth = new OAuth.OAuth(
        'https://api.twitter.com/oauth/request_token',
        'https://api.twitter.com/oauth/access_token',
        this.app.config.twitter.appKey,
        this.app.config.twitter.appSecret,
        '1.0A',
        null,
        'HMAC-SHA1'
      );
      const userdata = await new Promise((resolve, reject) => oauth.get(
        'https://api.twitter.com/1.1/account/verify_credentials.json?id=23424977',
        oauth_token,
        oauth_token_secret,
        function(e, data, res) {
          if (e) {
            reject(e);
          }
          resolve(JSON.parse(data));
        })
      );
      tokendata = userdata;
    } catch (err) {
      this.logger.error('AuthService:: verifyCode failed: err: %j', err);
      return null;
    }
    return tokendata;
  }

  googleLoginPrepare(callbackUrl, state) {
    const oauth = new google.auth.OAuth2(
      this.app.config.google.appKey,
      this.app.config.google.appSecret, callbackUrl);

    return oauth.generateAuthUrl({
      redirect_uri: callbackUrl,
      scope: [ 'profile', 'email' ],
      state,
    });
  }
  async googleLogin(code, callbackUrl) {
    const oauth = new google.auth.OAuth2(
      this.app.config.google.appKey,
      this.app.config.google.appSecret, callbackUrl);
    const { tokens } = await oauth.getToken(code);

    const { data } = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + tokens.access_token);

    return data;
  }

  facebookLoginPrepare(callbackUrl, state) {
    const appKey = this.app.config.facebook.appKey;

    return `https://www.facebook.com/v7.0/dialog/oauth?client_id=${appKey}&redirect_uri=${encodeURIComponent(callbackUrl)}&state=${state}`;
  }
  async facebookLogin(code, callbackUrl) {
    const { data: oauthResponse } = await axios.get('https://graph.facebook.com/v7.0/oauth/access_token', {
      params: {
        client_id: this.app.config.facebook.appKey,
        client_secret: this.app.config.facebook.appSecret,
        redirect_uri: callbackUrl,
        code,
      },
    });

    const { data } = await axios.get('https://graph.facebook.com/me', {
      params: {
        access_token: oauthResponse.access_token,
        fields: 'name,picture.type(large){url}',
      },
    });

    return data;
  }

  // github账号登录，验证access_token, 暂时是不verify state的
  async verifyCode(code) {
    let tokendata = null;
    try {
      const token = await axios({
        method: 'POST',
        url: 'https://github.com/login/oauth/access_token',
        headers: {
          accept: 'application/json',
          'User-Agent': this.ctx.app.config.github.appName,
        },
        data: {
          client_id: this.ctx.app.config.github.clientId,
          client_secret: this.ctx.app.config.github.clientSecret,
          code,
        },
      });
      tokendata = token.data;
    } catch (err) {
      this.logger.error('AuthService:: verifyCode failed: err: %j', err);
      return null;
    }
    if (tokendata.access_token === undefined) {
      return null;
    }
    return tokendata;
  }

  // 获取github用户信息
  async getGithubUser(usertoken) {

    let userinfo = null;
    try {
      userinfo = await axios({
        method: 'GET',
        url: 'https://api.github.com/user',
        headers: {
          Authorization: 'token ' + usertoken,
          'User-Agent': this.ctx.app.config.github.appName,
          accept: 'application/json',
        },
      });

    } catch (err) {
      this.logger.error('AuthService:: getUserinfo failed: %j', err);
      return null;
    }
    return userinfo.data;
  }

  // github账号登录，创建或登录用户, 发放jwt token
  // todo：2019-8-27 缺少登录日志
  // wechat、telegram、twitter、google 通用方法
  // 2021-3-11: 为 github 新增 access_token 存储
  async saveUser(username, nickname, avatarUrl, ip = '', referral = 0, platform = 'github', access_token = '') {
    try {
      let currentUser = await this.service.account.binding.get2({ username, platform });
      // 用户是第一次登录, 先创建
      if (currentUser === null) {

        await this.insertUser(username, '', platform, 'ss', ip, '', referral);

        const avatar = await this.service.user.uploadAvatarFromUrl(avatarUrl);

        // 更新头像
        await this.app.mysql.update('users',
          { avatar },
          { where: { username, platform } }
        );

        currentUser = await this.service.account.binding.get2({ username, platform });
        if (platform === 'telegram') { // update telegramUid
          await this.service.tokenCircle.api.updateUser(
            currentUser.id, { telegramUid: username }
          );
        }
      }

      // await this.service.search.importUser(currentUser.id);

      // 增加登录日志
      await this.insertLoginLog(currentUser.id, ip);
      // const expires = moment().add(7, 'days').valueOf();
      this.logger.info('currentUser', currentUser);
      if (platform === 'github') {
        const github = await this.app.mysql.get('github', { uid: currentUser.id });
        const article_repo = 'matataki-save';
        if (!github) {
          // 似乎不需要 create_time？
          // const now = moment().format('YYYY-MM-DD HH:mm:ss');
          this.app.mysql.insert('github', {
            uid: currentUser.id,
            access_token,
            article_repo,
            // create_time: now,
          });
        } else {
          this.app.mysql.update('github', { access_token }, {
            where: {
              uid: currentUser.id,
            },
          });
        }
      }
      const jwttoken = this.jwtSign(currentUser);
      // jwt.encode({
      //   iss: currentUser.username,
      //   exp: expires,
      //   platform,
      //   id: currentUser.id,
      // }, this.app.config.jwtTokenSecret);

      return jwttoken;

    } catch (err) {
      this.logger.error('AuthService:: getUserinfo failed: %j', err);
      return null;
    }
  }

  // weChat账号登录，创建或登录用户, 发放jwt token
  // todo：2019-8-27 缺少登录日志
  // TODO: 需要删除
  async saveWeChatUser(username, _nickname, avatarUrl, ip = '', referral = 0, platform = 'weixin') {
    const nickname = _nickname; // copy
    try {
      let currentUser = await this.service.account.binding.get2({ username, platform });
      // 用户是第一次登录, 先创建
      if (currentUser === null) {
        const res = await this.insertUser(username, '', platform, 'ss', ip, '', referral);
        if (res) {

          this.logger.info('saveWeChatUser avatarUrl', avatarUrl);
          const avatar = await this.service.user.uploadAvatarFromUrl(avatarUrl);

          // 更新昵称
          await this.app.mysql.update('users',
            { avatar },
            { where: { username, platform } }
          );

          currentUser = await this.service.account.binding.get2({ username, platform });

        } else {
          return '';
        }

      }

      // 增加登录日志
      await this.insertLoginLog(currentUser.id, ip);

      const jwttoken = this.jwtSign(currentUser);
      return jwttoken;

    } catch (err) {
      this.logger.error('AuthService:: getUserinfo failed: %j', err);
      return null;
    }
  }

  // twitter账号登录，创建或登录用户, 发放jwt token
  // TODO: 需要删除
  async saveTwitterUser(username, nickname, avatarUrl, ip = '', referral = 0, platform = 'twitter') {
    // 注释方面直接参考上面的saveUser
    try {
      let currentUser = await this.service.account.binding.get2({ username, platform });
      if (currentUser === null) {
        await this.insertUser(username, '', platform, 'ss', ip, '', referral);

        const avatar = await this.service.user.uploadAvatarFromUrl(avatarUrl);

        await this.app.mysql.update('users',
          { avatar },
          { where: { username, platform } }
        );
        currentUser = await this.service.account.binding.get2({ username, platform });
      }
      await this.insertLoginLog(currentUser.id, ip);
      const jwttoken = this.jwtSign(currentUser);
      return jwttoken;
    } catch (err) {
      this.logger.error('AuthService:: getUserinfo failed: %j', err);
      return null;
    }
  }

  // 验证用户账号是否存在， todo，添加platform信息
  async verifyUser(username) {
    /* const user = await this.app.mysql.query(
      'SELECT id FROM users WHERE username = :username;',
      { username }
    ); */
    const user = await this.service.account.binding.get2({ username, platform: 'email' });
    return !!user;
    /* const userBinding = await this.app.mysql.get('user_accounts', { account: username, platform: 'email' });
    return user.length > 0 || userBinding !== null; */
  }

  async sendRegisteredCaptchaMail(email) {
    return this.sendCaptchaMail(email);
  }

  async sendResetpasswordCaptchaMail(email) {
    return this.sendCaptchaMail(email, consts.mailTemplate.resetPassword);
  }

  // 发送邮箱验证码
  async sendCaptchaMail(email, type = consts.mailTemplate.registered) {

    const mailhash = `captcha:${type}:${md5(email).toString()}`;
    const timestamp = Date.now();
    // 是否在1分钟之内获取过验证码， 无论是否消耗
    const lastSentQuery = await this.app.redis.get(mailhash);
    if (lastSentQuery) {
      const lastSentInfo = JSON.parse(lastSentQuery);
      // 上个验证码的生成时间不到60000ms
      if (timestamp - lastSentInfo.timestamp < 60000) {
        this.logger.info('AuthService:: sendCaptchaMail: Captcha rate limit for Email', email);
        return 1;
      }
    }

    // 为了生成验证码（CAPTCHA）
    const randomString = timestamp + email + 'salt';
    const md5raw = md5(randomString).words[0];
    const md5str = Math.abs(md5raw).toString();

    let captcha;
    if (md5str.length < 6) {
      captcha = '0'.repeat(6 - md5str.length) + md5str;
    } else {
      captcha = md5str.substring(md5str.length - 6, md5str.length);
    }

    // 生成需要存放的数据： 验证码， 时间戳， 状态
    const storeItems = { captcha, timestamp, status: 3 };
    const storeString = JSON.stringify(storeItems);
    await this.app.redis.set(mailhash, storeString, 'EX', 300);
    this.logger.info('AuthService:: sendCaptchaMail: Captcha generated: ', email);
    // await this.app.redis.hmset(mailhash, storeItems);

    // const captchaStatus = await this.app.redis.get(mailhash);
    // console.log(captchaStatus);

    const sendCloudResult = await this.service.sendCloud.sendCaptcha(email, captcha, type);
    this.ctx.logger.info('sendCloudResult', sendCloudResult);
    if (sendCloudResult) {
      return 0;
    }
    const sendResult = await this.service.mail.sendCaptcha(email, captcha, type);
    if (sendResult) {
      return 0;
    }
    return 2;
  }

  // 重置密码
  async resetPassword(email, captcha, password) {
    const mailhash = `captcha:${consts.mailTemplate.resetPassword}:${md5(email).toString()}`;
    const captchaQuery = await this.app.redis.get(mailhash);
    // 从未获取过验证码
    if (!captchaQuery) {
      this.logger.info('AuthService:: resetPassword: Captcha haven\'t been generated for email ', email);
      return 1;
    }
    const captchaInfo = JSON.parse(captchaQuery);
    // 验证码不对， 减少有效次数
    if (captchaInfo.captcha !== captcha) {
      captchaInfo.status -= 1;
      this.logger.info('AuthService:: resetPassword: Captcha is wrong for email ', email);
      // 已经错误3次， 验证码失效
      if (captchaInfo.status === 0) {
        this.logger.info('AuthService:: resetPassword: Captcha expired');
        await this.app.redis.del(mailhash);
        return 2;
      }
      const storeString = JSON.stringify(captchaInfo);
      // 获取剩余TTL
      const remainTime = await this.app.redis.call('TTL', mailhash);
      // 更新剩余次数， 并维持TTL
      await this.app.redis.set(mailhash, storeString, 'EX', remainTime);
      return 3;
    }
    const passwordHash = sha256(password).toString();
    const result = await this.updatePassword(passwordHash, email);
    if (!result) {
      return 5;
    }
    this.logger.info('AuthService:: resetPassword: email ', email);
    return 0;
  }

  // 邮箱注册
  async doReg(email, captcha, password, ipaddress, referral) {
    const mailhash = `captcha:${consts.mailTemplate.registered}:${md5(email).toString()}`;
    const captchaQuery = await this.app.redis.get(mailhash);
    // 从未获取过验证码
    if (!captchaQuery) {
      this.logger.info('AuthService:: doReg: Captcha haven\'t been generated for email ', email);
      return 1;
    }
    const captchaInfo = JSON.parse(captchaQuery);
    // // 验证码已经失效， 输入次数过多
    // if (captchaInfo.status === 0) {
    //   return 2;
    // }
    // 验证码不对， 减少有效次数
    if (captchaInfo.captcha !== captcha) {
      captchaInfo.status -= 1;
      this.logger.info('AuthService:: doReg: Captcha is wrong for email ', email);
      // 已经错误3次， 验证码失效
      if (captchaInfo.status === 0) {
        this.logger.info('AuthService:: doReg: Captcha expired');
        await this.app.redis.del(mailhash);
        return 2;
      }
      const storeString = JSON.stringify(captchaInfo);
      // 获取剩余TTL
      const remainTime = await this.app.redis.call('TTL', mailhash);
      // 更新剩余次数， 并维持TTL
      await this.app.redis.set(mailhash, storeString, 'EX', remainTime);
      return 3;
    }

    // 增加用户
    // const now = moment().format('YYYY-MM-DD HH:mm:ss');
    const passwordHash = sha256(password).toString();
    const result = await this.insertUser(email, email, consts.platforms.email, 'ss', ipaddress, passwordHash, referral);
    // const createAccount = await this.app.mysql.query(
    //   'INSERT INTO users (username, email, create_time, last_login_time, platform, source, reg_ip, password_hash) '
    //   + 'VALUES (:username, :email, :now, :now, \'email\', \'ss\', :ipaddress, :password);',
    //   { username: email, email, ipaddress, password: passwordHash, now }
    // );

    // if (createAccount.affectedRows !== 1) {
    //   return 5;
    // }
    if (!result) {
      return 5;
    }

    // const currentUser = await this.app.mysql.get('users', { username: email, platform: 'email' });
    // await this.service.search.importUser(currentUser.id);

    this.logger.info('AuthService:: doReg: New user Added for email ', email);
    return 0;
  }

  // 邮箱账号密码登录
  async verifyLogin(username, password, ipaddress) {
    // 提取用户信息
    // let userPw;
    const platform = 'email';
    /* try {
      userPw = await this.app.mysql.query(
        'SELECT id, username, password_hash,platform FROM users WHERE username = :username AND platform = :platform;',
        { username, platform }
      );
    } catch (err) {
      this.logger.error('AuthService:: verifyLogin: Error ', err);
      return 3;
    } */

    // if (userPw.length === 0) {
    // const userPw = await this.service.account.binding.getSyncFieldWithUser(username, platform);
    const userPw = await this.service.account.binding.get2({ username, platform, needPasswordHash: true });
    this.logger.info('AuthService:: verifyLogin: userPw ', userPw);

    if (!userPw) {
      this.logger.info('AuthService:: verifyLogin: User doesn\'t exist ', username);
      return 1;
    }
    // 密码对不上
    const passwordHash = sha256(password).toString();
    if (userPw.password_hash !== passwordHash) {
      this.logger.info('AuthService:: verifyLogin: Wrong password ', username);
      return 2;
    }

    // 增加登录日志
    await this.insertLoginLog(userPw.id, ipaddress);
    // const now = moment().format('YYYY-MM-DD HH:mm:ss');
    // let addLoginLog;
    // try {
    //   addLoginLog = await this.app.mysql.query(
    //     'INSERT INTO users_login_log (uid, ip, source, login_time) VALUES '
    //     + '(:uid, :ipaddress, \'ss\', :now);',
    //     { uid: userPw[0].id, ipaddress, now }
    //   );
    // } catch (err) {
    //   this.logger.error('AuthService:: verifyLogin: Error ', err);
    //   return 3;
    // }
    // if (addLoginLog.affectedRows !== 1) {
    //   return 3;
    // }

    // 生成token
    // const expires = moment().add(7, 'days').valueOf();
    // const jwttoken = jwt.encode({
    //   iss: userPw[0].username,
    //   exp: expires,
    //   platform: 'email',
    //   id: userPw[0].id,
    // }, this.app.config.jwtTokenSecret);
    // this.logger.info('AuthService:: verifyLogin: User Login... ', username);

    return this.jwtSign(userPw);
  }

  // 生成随机用户昵称
  async generateRandomNickname() {
    let nickname = '';
    const generate = async () => {
      const _str = random(10);
      nickname = _str;
      // 检测有没有重复
      const _sql = 'SELECT * FROM users WHERE nickname = ?';
      const userNickname = await this.app.mysql.query(_sql, [ nickname ]);
      if (userNickname.length) {
        await generate();
      }
      return;
    };
    await generate();

    return `USER-${nickname}`;
  }

  // 插入用户
  async insertUser(username, email, platform, source, ip, pwd, referral) {
    // 确认推荐人是否存在
    let referral_uid = parseInt(referral);
    if (referral_uid > 0) {
      const referral_user = await this.service.user.get(referral_uid);
      if (!referral_user) {
        referral_uid = 0;
      }
    }
    const now = moment().format('YYYY-MM-DD HH:mm:ss');

    const tran = await this.app.mysql.beginTransaction();
    let createAccount = null;
    try {
      const nickname = await this.generateRandomNickname();
      createAccount = await tran.query(
        'INSERT INTO users (username, email, nickname, create_time, platform, source, reg_ip, password_hash,referral_uid) '
        + 'VALUES (:username, :email, :nickname, :now, :platform, :source, :ip, :password, :referral);',
        { username, email, nickname, ip, platform, source, password: pwd, now, referral: referral_uid }
      );
      this.logger.info('service:: Auth: insertUser: %j', createAccount);
      const account = await this.service.account.binding.create({ uid: createAccount.insertId, account: username, password_hash: pwd, platform, is_main: 1 }, tran);
      if (!account) await tran.rollback();
      else await tran.commit();
    } catch (err) {
      await tran.rollback();
      this.logger.error('service:: Auth:: insertUser: Error. %j', err);
      return false;
    }

    if (createAccount.affectedRows === 1) {
      // 插入ES

      try {
        await this.service.search.importUser(createAccount.insertId);
        this.logger.info('service:: Auth: insertUser: success');
      } catch (e) {
        this.logger.info('search importUser error', e);
      }


      // 处理注册推荐积分
      if (referral_uid > 0) {
        await this.service.mining.register(createAccount.insertId, referral, ip);

        // 处理推荐人任务，防刷	你成功邀请的好友阅读并评价了5篇文章，你可得到xx积分
        const rediskey = `invite:read:${createAccount.insertId}`;
        await this.app.redis.lpush(rediskey, [ 1, 2, 3, 4, 5 ]);
        this.app.redis.expire(rediskey, 30 * 24 * 3600); // 30天过期
      }

      try {
        // 检测用户有没有托管的以太坊私钥，没有就生成
        const wallet = await this.service.account.hosting.create(createAccount.insertId);
        await this.service.tokenCircle.api.addUserProfile(
          createAccount.insertId, username, wallet
        );
      } catch (e) {
        this.logger.error('service.account.hosting.create error', e);
      }

      // 初始化新用户公告
      await this.service.notify.announcement.initRecipients(createAccount.insertId, 'informNewUser');

      return true;
    }
    return false;
  }

  async updatePassword(passwordHash, email) {
    const tran = await this.app.mysql.beginTransaction();
    try {
      await tran.query(
        'UPDATE users SET password_hash = :passwordHash WHERE username = :email AND platform = \'email\';'
        + 'UPDATE user_accounts SET password_hash = :passwordHash WHERE account = :email AND platform = \'email\'', {
          passwordHash,
          email,
        });
      await tran.commit();
      return true;
    } catch (err) {
      await tran.rollback();
      this.logger.error('AuthService:: updatePassword: Error ', err);
      return false;
    }
  }

  // 插入登录日志
  async insertLoginLog(uid, ip) {
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    try {
      await this.app.mysql.query(
        `UPDATE users SET last_login_time=:now, last_login_ip=:ip WHERE id=:uid;
         INSERT INTO users_login_log (uid, ip, source, login_time) VALUES (:uid, :ip, \'ss\', :now);`,
        { uid, ip, now }
      );

      return true;
    } catch (err) {
      this.logger.error('AuthService:: verifyLogin: Error ', err);
      return false;
    }
  }

  // jwt token
  jwtSign(user) {
    const expires = moment().add(7, 'days').valueOf();
    const jwttoken = jwt.encode({
      iss: user.username,
      exp: expires,
      platform: user.platform,
      id: user.id,
    }, this.app.config.jwtTokenSecret);

    return jwttoken;
  }

  async getUser(username, platform) {
    return await this.service.account.binding.get2({ username, platform });
    // return await this.app.mysql.get('users', { username, platform });
  }

  /** 获取 twitter 授权的请求 token */
  async twitterRequestToken(callbackUrl) {
    const oauthRequestToken = () => {
      const cb = new codebird();
      cb.setUseProxy(true);
      cb.setConsumerKey(this.config.twitterConsumerKey.key, this.config.twitterConsumerKey.secret);
      return new Promise((resolve, reject) => {
        cb.__call('oauth_requestToken', { oauth_callback: callbackUrl }, (reply, rate, err) => {
          if (err) {
            reject('error response or timeout exceeded' + err.error);
            return;
          }
          if (reply) {
            if (reply.errors && reply.errors['415']) {
              reject(reply.errors['415']);
              return;
            }
            resolve(reply);
            return;
          }
          resolve(null);
        });
      });
    };

    const reply = await oauthRequestToken();
    if (!reply) return;

    const key = 'twitter:authorizeToken:' + reply.oauth_token;
    await this.app.redis.set(key, reply.oauth_token_secret);
    await this.app.redis.expire(key, 60 * 5);

    return reply;
  }

  /** 获取 twitter 授权 token */
  async twitterAccessToken(userId, oauthToken, oauthVerifier) {
    const oauthAccessToken = () => {
      const cb = new codebird();
      cb.setUseProxy(true);
      cb.setConsumerKey(this.config.twitterConsumerKey.key, this.config.twitterConsumerKey.secret);
      cb.setToken(oauthToken, oauthTokenSecret);
      return new Promise((resolve, reject) => {
        cb.__call('oauth_accessToken', { oauth_verifier: oauthVerifier }, (reply, rate, err) => {
          if (err) {
            reject('error response or timeout exceeded' + err.error);
            return;
          }
          if (reply) {
            resolve(reply);
            return;
          }
          resolve();
        }
        );
      });
    };

    const key = 'twitter:authorizeToken:' + oauthToken;
    const oauthTokenSecret = await this.app.redis.get(key);
    if (!oauthTokenSecret) return { code: 1 };

    const reply = await oauthAccessToken();
    if (!reply) return;

    await this.app.mysql.query(`
      INSERT INTO user_twitter_credential (
        user_id,
        oauth_token,
        oauth_token_secret,
        twitter_id,
        screen_name,
        create_time
      )
      VALUES (
        :userId,
        :oauthToken,
        :oauthTokenSecret,
        :twitterId,
        :screenName,
        :createTime
      )
      ON DUPLICATE KEY UPDATE
        oauth_token = :oauthToken,
        oauth_token_secret = :oauthTokenSecret,
        twitter_id = :twitterId,
        screen_name = :screenName,
        create_time = :createTime
    `, {
      userId,
      oauthToken: reply.oauth_token,
      oauthTokenSecret: reply.oauth_token_secret,
      twitterId: reply.user_id,
      screenName: reply.screen_name,
      createTime: moment().format('YYYY-MM-DD HH:mm:ss'),
    });

    return { code: 0, reply };
  }

  /** 删除用户的推特授权 token */
  async twitterDeauthorize(userId) {
    const { affectedRows } = await this.app.mysql.delete('user_twitter_credential', { user_id: userId });
    return affectedRows === 1;
  }
}

module.exports = AuthService;
