'use strict';

const Service = require('egg').Service;
const EOS = require('eosjs');
const ONT = require('ontology-ts-sdk');

const introductionLengthInvalid = 4;
const emailDuplicated = 5;
const nicknameDuplicated = 6;
const nicknameInvalid = 7;

class UserService extends Service {

  // constructor(ctx) {
  //   super(ctx);
  //   this.eosClient = EOS({
  //     chainId: ctx.app.config.eos.chainId,
  //     httpEndpoint: ctx.app.config.eos.httpEndpoint,
  //   });
  // }

  async getUserById(id) {
    const ctx = this.ctx;

    // 2.获取某账号关注数
    const follows = await this.app.mysql.query(
      'select count(*) as follows from follows where uid = ? and status=1',
      [id]
    );

    // 3.获取某账号粉丝数
    const fans = await this.app.mysql.query(
      'select count(*) as fans from follows where fuid = ? and status=1',
      [id]
    );

    var is_follow = false;

    const current_user = ctx.user;

    if (current_user) {
      const result = await this.app.mysql.get('follows', { uid: current_user.id, fuid: id, status: 1 });
      if (result) {
        is_follow = true;
      }
    }

    let email = "";
    let nickname = "";
    let avatar = "";
    let introduction = '';
    const user = await this.app.mysql.get('users', { id: id });
    if (user) {
      avatar = user.avatar || "";
      email = user.email || "";
      nickname = user.nickname || "";
      introduction = user.introduction || '';
    }

    const result = {
      username: user.username,
      email,
      nickname,
      avatar,
      introduction,
      follows: follows[0].follows,
      fans: fans[0].fans,
      is_follow: is_follow
    };

    ctx.logger.info('debug info', result);

    return result;
  }

  async getUserDetails(current_user) {

    this.app.mysql.queryFromat = function (query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function (txt, key) {
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
      'SELECT COUNT(*) AS follows FROM follows WHERE uid = :uid AND status = 1;'
      + 'SELECT COUNT(*) AS fans FROM follows WHERE fuid = :uid AND status = 1;'
      + 'SELECT COUNT(*) AS articles FROM posts WHERE uid = :uid AND status = 0;'
      + 'SELECT COUNT(*) AS drafts FROM drafts WHERE uid = :uid AND status = 0;'
      + 'SELECT COUNT(*) AS supports, signid FROM supports s INNER JOIN posts p ON s.signid = p.id WHERE s.uid = :uid AND p.status = 0',
      { uid: basicInfo.id }
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
    if (email !== null) {
      row.email = email;
    }

    if (nickname) {
      const nicknameCheck = /^[\u4e00-\u9fa5a-zA-Z0-9]{1,12}$/;
      if (!nicknameCheck.test(nickname)) {
        return nicknameInvalid;
      }
      row.nickname = nickname;
    }

    if (introduction !== null) {
      if (introduction.length > 20) {
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

    if (introduction.length > 20) {
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
      [email]
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
      [nickname]
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

  // EOS: 从链上取得数据, 判断address的合法性
  async isEosAddress(address) {
    const eosClient = EOS({
      chainId: this.ctx.app.config.eos.chainId,
      httpEndpoint: this.ctx.app.config.eos.httpEndpoint,
    });

    try {
      await eosClient.getAccount(address);
      // console.log(accountInfo);
    } catch (err) {
      // 查询的用户不存在时候, 此API会报错, 所以要handle
      this.logger.info('UserService:: isEosAddress: No, info: %j', err);
      return false;
    }
    return true;
  }

  // 已被放弃 ONT: 是A开头的34位字符串,且不含特殊符号,即通过
  // 已被放弃, 符合该条件, 但是非checksumed address 不会被过滤
  // 后面在process_withdraw的时候, 发起交易的时候会出错, 然后该记录status永远为0而且没有trx交易号码
  // async isOntAddress(address) {
  //   if (/^A[0-9a-zA-Z]{33}$/.test(address)) {
  //     return true;
  //   }
  //   return false;
  // }

  async isOntAddress(address) {
    try {
      const addressVerify = new ONT.Crypto.Address(address);
      await addressVerify.serialize();
    } catch (err) {
      this.logger.info('UserService:: isOntAddress: No, info: %j', err);
      return false;
    }
    return true;
  }
}

module.exports = UserService;
