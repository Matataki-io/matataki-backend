'use strict';

const Service = require('egg').Service;
const crypto = require('crypto');
const axios = require('axios');
const moment = require('moment');
const jwt = require('jwt-simple');

class AuthService extends Service {

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
      console.log(err);
      this.logger.error('AuthService:: getUserinfo failed: %j', err);
      return null;
    }
  }
}

module.exports = AuthService;
