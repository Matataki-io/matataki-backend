'use strict';

const Service = require('egg').Service;
const crypto = require('crypto');
const md5 = require('crypto-js/md5');
const sha256 = require('crypto-js/sha256');
const axios = require('axios');
const moment = require('moment');
const jwt = require('jwt-simple');

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
  }

  // 验证access_token, 暂时是不verify state的
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

  // 获取用户信息
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

  // 创建或登录用户, 发放jwt token
  async saveUser(username, nickname, avatarUrl, platform = 'github') {
    try {
      const userExistence = await this.app.mysql.get('users', { username, platform });
      // 用户是第一次登录, 先创建
      if (userExistence === null) {
        await this.app.mysql.insert('users', {
          username,
          platform,
          create_time: moment().format('YYYY-MM-DD HH:mm:ss'),
        });

        // 若没有昵称, 先把username给nickname
        if (nickname === null) {
          nickname = username;
        }

        // 判断昵称是否重复, 重复就加前缀
        const duplicatedNickname = await this.app.mysql.get('users', { nickname });

        if (duplicatedNickname !== null) {
          nickname = 'github_' + nickname;
        }

        const avatar = await this.service.user.uploadAvatarFromUrl(avatarUrl);

        // 更新昵称
        await this.app.mysql.update('users',
          { nickname, avatar },
          { where: { username, platform } }
        );
      }
      const currentUser = await this.app.mysql.get('users', { username, platform });

      const expires = moment().add(7, 'days').valueOf();

      const jwttoken = jwt.encode({
        iss: currentUser.username,
        exp: expires,
        platform,
        id: currentUser.id,
      }, this.app.config.jwtTokenSecret);

      return jwttoken;

    } catch (err) {
      this.logger.error('AuthService:: getUserinfo failed: %j', err);
      return null;
    }
  }

  async verifyUser(username) {
    const user = await this.app.mysql.query(
      'SELECT id FROM users WHERE username = :username;',
      { username }
    );
    return user.length;
  }

  // async regStatus(email) {

  // }

  async sendCaptchaMail(email) {

    const mailhash = md5(email).toString();
    const timestamp = Date.now();
    // 是否在1分钟之内获取过验证码， 无论是否消耗
    const lastSentQuery = await this.app.redis.get(mailhash);
    if (lastSentQuery) {
      const lastSentInfo = JSON.parse(lastSentQuery);
      // 上个验证码的生成时间不到60000ms
      if (timestamp - lastSentInfo.timestamp < 60000) {
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
    await this.app.redis.set(mailhash, storeString, 'EX', 1800);
    // await this.app.redis.hmset(mailhash, storeItems);

    // const captchaStatus = await this.app.redis.get(mailhash);
    // console.log(captchaStatus);

    const sendResult = await this.service.mail.sendCaptcha(email, captcha);
    if (sendResult) {
      return 0;
    }
    return 1;
  }

  async doReg(email, captcha, password, ipaddress) {
    const mailhash = md5(email).toString();
    const captchaQuery = await this.app.redis.get(mailhash);
    // 从未获取过验证码
    if (!captchaQuery) {
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
      // 已经错误3次， 验证码失效
      if (captchaInfo.status === 0) {
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

    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    const passwordHash = sha256(password).toString();
    const createAccount = await this.app.mysql.query(
      'INSERT INTO users (username, email, create_time, last_login_time, platform, source, reg_ip, password_hash) '
      + 'VALUES (:username, :email, :now, :now, \'email\', \'ss\', :ipaddress, :password);',
      { username: email, email, ipaddress, password: passwordHash, now }
    );

    if (createAccount.affectedRows === 1) {
      return 0;
    }
    return 5;
  }

  async verifyLogin(username, password, ipaddress) {
    const userPw = await this.app.mysql.query(
      'SELECT id, username, password_hash FROM users WHERE username = :username AND platform = \'email\';',
      { username }
    );
    if (userPw.length === 0) {
      return null;
    }
    const passwordHash = sha256(password).toString();
    if (userPw[0].password_hash !== passwordHash) {
      return null;
    }

    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    const addLoginLog = await this.app.mysql.query(
      'INSERT INTO users_login_log (uid, ip, source, login_time) VALUES '
      + '(:uid, :ipaddress, \'ss\', :now);',
      { uid: userPw[0].id, ipaddress, now }
    );
    if (!addLoginLog.affectedRows) {
      return null;
    }
    const expires = moment().add(7, 'days').valueOf();
    const jwttoken = jwt.encode({
      iss: userPw[0].username,
      exp: expires,
      platform: 'email',
      id: userPw[0].id,
    }, this.app.config.jwtTokenSecret);

    return jwttoken;
  }
}

module.exports = AuthService;
