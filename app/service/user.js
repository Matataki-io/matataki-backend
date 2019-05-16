'use strict';

const Service = require('egg').Service;
const introductionLengthInvalid = 4;
const emailDuplicated = 5;
const nicknameDuplicated = 6;

class UserService extends Service {

  async getUserDetails(current_user) {

    this.app.mysql.queryFromat = function(query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function(txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    };

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
    const counts = await this.app.mysql.query(
      'SELECT COUNT(*) AS follows FROM follows WHERE username = :user AND status = 1;'
      + 'SELECT COUNT(*) AS fans FROM follows WHERE followed = :user AND status = 1;'
      + 'SELECT COUNT(*) AS articles FROM posts WHERE author = :user AND status = 0;'
      + 'SELECT COUNT(*) AS drafts FROM drafts WHERE uid = :uid AND status = 0;'
      + 'SELECT COUNT(*) AS supports, signid FROM supports s INNER JOIN posts p ON s.signid = p.id WHERE s.uid = :uid AND p.status = 0',
      { user: current_user, uid: basicInfo.id }
    );
    basicInfo.follows = counts[0][0].follows;
    basicInfo.fans = counts[1][0].fans;
    basicInfo.articles = counts[2][0].articles;
    basicInfo.drafts = counts[3][0].drafts;
    basicInfo.supports = counts[4][0].supports;

    return basicInfo;
  }

  async setProfile(current_user, email, nickname, introduction) {

    if (current_user === null) {
      return false;
    }

    const row = {};
    if (email) {
      row.email = email;
    }

    if (nickname) {
      row.nickname = nickname;
    }

    if (introduction) {
      if (introduction.length > 20 || introduction.length < 5) {
        return introductionLengthInvalid;
      }
      row.introduction = introduction;
    }

    const options = {
      where: {
        username: current_user,
      },
    };

    try {
      const result = await this.app.mysql.update('users', row, options);
      return result.affectedRows === 1;
    } catch (err) {
      this.logger.error('UserService::setProfile error: %j', err);
      return false;
    }
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
      this.logger.error('UserService::setIntroduction error: %j', err);
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
      this.logger.error('UserService:: setEmail error: %j', err);
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
      this.logger.error('UserService:: setNickname error: %j', err);
    }
    return false;
  }
}

module.exports = UserService;
