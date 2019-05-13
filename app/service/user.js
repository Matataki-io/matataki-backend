'use strict';

const Service = require('egg').Service;
const introductionLengthInvalid = 4;
const emailDuplicated = 5;
const nicknameDuplicated = 6;

class UserService extends Service {

  async getUserDetails(current_user) {

    const basicInfo = await this.app.mysql.get(
      'users',
      { username: current_user }
    );

    if (basicInfo === null) {
      return null;
    }

    const accountAttached = 1;
    basicInfo.accounts = accountAttached;

    // 筛选状态为1，即有效的follow
    const followersCount = await this.app.mysql.query(
      'SELECT COUNT(*) AS followings FROM follows WHERE username = ? AND status = 1',
      [ current_user ]
    );
    basicInfo.follow = followersCount[0].followings;

    const followingsCount = await this.app.mysql.query(
      'SELECT COUNT(*) AS followers FROM follows WHERE followed = ? AND status = 1',
      [ current_user ]
    );
    basicInfo.fan = followingsCount[0].followers;

    // 筛选状态为0，即有效的文章
    const articlesCount = await this.app.mysql.query(
      'SELECT COUNT(*) AS articles FROM posts WHERE author = ? AND status = 0',
      [ current_user ]
    );
    basicInfo.posts = articlesCount[0].articles;

    // 筛选状态为0，即有效的草稿
    const draftCount = await this.app.mysql.query(
      'SELECT COUNT(*) AS drafts FROM drafts WHERE uid = ? AND status = 0',
      [ basicInfo.id ]
    );
    basicInfo.drafts = draftCount[0].drafts;

    const supportCount = await this.app.mysql.query(
      'SELECT COUNT (*) AS supports FROM actions WHERE author = ? AND type = \'share\'',
      [ current_user ]
    );
    basicInfo.supports = supportCount[0].supports;

    return basicInfo;
  }

  async setIntroduction(introduction, current_user) {

    if (introduction.length > 20 || introduction.length < 5) {
      return introductionLengthInvalid;
    }

    try {
      const row = {
        introduction,
      };

      const options = {
        where: {
          username: current_user,
        },
      };

      const result = await this.app.mysql.update('users', row, options);
      return result.affectedRows === 1;
    } catch (err) {
      this.logger.error('UserService:: error: %j', err);
    }
    return false;
  }

  async setEmail(email, current_user) {

    const sameEmail = await this.app.mysql.query(
      'SELECT COUNT(*) AS same_count FROM users WHERE email = ?',
      [ email ]
    );

    if (sameEmail[0].same_count) {
      return emailDuplicated;
    }

    try {
      const row = {
        email,
      };

      const options = {
        where: {
          username: current_user,
        },
      };

      const result = await this.app.mysql.update('users', row, options);
      return result.affectedRows === 1;
    } catch (err) {
      this.logger.error('UserService update Email error: %j', err);
    }
    return false;
  }

  async setNickname(nickname, current_user) {

    const sameNickname = await this.app.mysql.query(
      'SELECT COUNT(*) AS same_count FROM users WHERE nickname = ?',
      [ nickname ]
    );

    if (sameNickname[0].same_count) {
      return nicknameDuplicated;
    }
    try {
      const row = {
        nickname,
      };

      const options = {
        where: {
          username: current_user,
        },
      };

      const result = await this.app.mysql.update('users', row, options);
      return result.affectedRows === 1;
    } catch (err) {
      this.logger.error('UserService updateNickname error: %j', err);
    }
    return false;
  }
}

module.exports = UserService;
