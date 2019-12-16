'use strict';
const Service = require('egg').Service;
const moment = require('moment');
const md5 = require('crypto-js/md5');
const sha256 = require('crypto-js/sha256');
const consts = require('../consts');

class AccountBindingService extends Service {

  /**
   * 添加账号绑定
   * @param {*} { uid, account, platform, password_hash = null }
   * @param {*} tran - 事务
   * @return {Boolean} 是否创建成功
   * @memberof AccountBindingService
   */
  async create({ uid, account, platform, password_hash = null, is_main = 0 }, tran) {
    this.logger.info('Service: AccountBinding:: create start: %j', { uid, account, platform, password_hash });
    // is Account Existence
    const isAccountExistence = await this.get(uid, platform);
    const isPlatformExistence = await this.getSyncFieldWithUser(account, platform);
    if (isAccountExistence || isPlatformExistence) {
      this.logger.info('Service: AccountBinding:: Account Existence');
      return false;
    }
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    let result = null;
    if (tran) {
      result = await tran.insert('user_accounts', {
        uid,
        account,
        password_hash,
        platform,
        is_main,
        created_at: now,
        status: 1,
      });
    } else {
      result = await this.app.mysql.insert('user_accounts', {
        uid,
        account,
        password_hash,
        platform,
        is_main,
        created_at: now,
        status: 1,
      });
    }
    this.logger.info('Service: AccountBinding:: create success: %j', result);
    return true;
  }

  /**
   * 根据uid、platform获取账号数据
   * @param {*} uid 用户id
   * @param {*} platform 绑定平台
   * @return {*} 用户数据
   * @memberof AccountBindingService
   */
  async get(uid, platform) {
    const accounts = await this.app.mysql.select('user_accounts', {
      where: { uid, platform, status: 1 },
      columns: [ 'id', 'uid', 'account', 'platform', 'is_main', 'created_at', 'status', 'password_hash' ],
    });
    if (accounts && accounts.length > 0) {
      return accounts[0];
    }
    return null;
  }


  /**
   * 根据uid获取绑定的账号
   * @param {*} uid 用户id
   * @return {Array} account list
   * @memberof AccountBindingService
   */
  async getListByUid(uid) {
    const accounts = await this.app.mysql.select('user_accounts', {
      where: { uid, status: 1 },
      columns: [ 'account', 'platform', 'is_main', 'created_at', 'status' ],
    });
    return accounts;
  }

  /**
   * 删除绑定
   * @param {*} { uid, account, platform }
   * @return {boolean} 删除是否成功
   * @memberof AccountBindingService
   */
  async del({ uid, platform }) {
    const userAccount = await this.get(uid, platform);
    if (!userAccount) {
      return false;
    }
    // 主账号不能删除
    if (userAccount.is_main === 1) {
      return false;
    }
    const result = await this.app.mysql.delete('user_accounts', {
      id: userAccount.id,
    });
    this.logger.info('Service: AccountBinding:: del success: %j', result);
    return true;
  }

  /**
   * 更新主账号
   * @param {*} { uid, platform }
   * @return {Boolean} 是否绑定成功
   * @memberof AccountBindingService
   */
  async updateMain({ uid, platform }) {
    const tran = await this.app.mysql.beginTransaction();
    try {
      // for update 锁定table row
      const oldMainAccount = await tran.query('SELECT * FROM user_accounts WHERE uid=? AND is_main=1 limit 1 FOR UPDATE;', [ uid ]);
      const newMainAccount = await tran.query('SELECT * FROM user_accounts WHERE uid=? AND platform=? limit 1 FOR UPDATE;', [ uid, platform ]);
      if (oldMainAccount.length <= 0 || newMainAccount.length <= 0) {
        await tran.rollback();
        return false;
      }
      this.logger.error('Service.Account.binding.updateMain oldMainAccount. %j', oldMainAccount);
      // 解绑
      await tran.update('user_accounts', {
        id: oldMainAccount[0].id,
        is_main: 0,
      });
      // 绑定
      await tran.query('UPDATE user_accounts SET is_main=1 WHERE uid=:uid AND platform=:platform;', {
        uid,
        platform,
      });
      // 修改users表中数据
      await tran.query('UPDATE users SET username=:username, platform=:platform WHERE id=:uid;', {
        username: newMainAccount[0].account,
        platform,
        uid,
      });
      await tran.commit();
      return true;
    } catch (err) {
      await tran.rollback();
      this.logger.error('Service.Account.binding.updateMain exception. %j', err);
      return false;
    }
  }
  async createEmailAccount({ uid, email, captcha, password }) {
    this.logger.info('bindingService:: createEmailAccount: start ', { uid, email, captcha, password });
    const mailhash = `captcha:${consts.mailTemplate.registered}:${md5(email).toString()}`;
    const captchaQuery = await this.app.redis.get(mailhash);
    // 从未获取过验证码
    if (!captchaQuery) {
      this.logger.info('bindingService:: createEmailAccount: Captcha haven\'t been generated for email ', email);
      return 1;
    }
    const captchaInfo = JSON.parse(captchaQuery);
    // 验证码不对， 减少有效次数
    if (captchaInfo.captcha !== captcha) {
      captchaInfo.status -= 1;
      this.logger.info('bindingService:: createEmailAccount: Captcha is wrong for email ', email);
      // 已经错误3次， 验证码失效
      if (captchaInfo.status === 0) {
        this.logger.info('bindingService:: createEmailAccount: Captcha expired');
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
    const createAccount = await this.create({ uid, account: email, platform: 'email', password_hash: passwordHash });
    this.logger.info('bindingService:: createAccount result', createAccount);
    if (!createAccount) {
      return 5;
    }

    this.logger.info('bindingService:: createEmailAccount: New user Added for email ', email);
    return 0;
  }

  /**
   * 根据account, platform获取用户数据，字段名和users表同步
   * @param {*} account -
   * @param {*} platform -
   * @return {*} 返回对应用户或者null
   * @memberof AccountBindingService
   */
  async getSyncFieldWithUser(account, platform) {
    const sql = `
      SELECT uid as id, account as username, password_hash, platform, is_main, created_at
      FROM user_accounts
      WHERE account=:account AND platform=:platform;`;
    const accounts = await this.app.mysql.query(sql, {
      account, platform,
    });
    if (accounts && accounts.length > 0) {
      return accounts[0];
    }
    return null;
  }


  /**
   * 获取用户信息，连表查询users and user_accounts
   * @param {*} {
   *     username = null,
   *     platform = null,
   *     nickname = null,
   *     id = null,
   *   }
   * @return {Object} user
   * @memberof AccountBindingService
   */
  async get2({
    username = null,
    platform = null,
    nickname = null,
    id = null,
  }) {
    const whereArr = [];
    const searchObj = {
      username,
      platform,
      nickname,
      id,
    };
    if (username !== null) whereArr.push('ua.account=:username');
    if (platform !== null) whereArr.push('ua.platform=:platform');
    if (nickname !== null) whereArr.push('u.nickname=:nickname');
    if (id !== null) {
      whereArr.push('u.id=:id');
      whereArr.push('ua.is_main = 1');
    }

    this.logger.info('service::binding:get2: whereArr, ', whereArr.join(' AND '));
    const users = await this.app.mysql.query(`
      SELECT ua.uid as id, ua.account as username, ua.platform, ua.password_hash,
      u.email, u.nickname, u.avatar, u.create_time, u.introduction, u.accept, u.source,
      u.reg_ip, u.last_login_time, u.is_recommend, u.referral_uid, u.last_login_ip, u.level, u.status, u.banner
      FROM users as u
      LEFT JOIN user_accounts as ua
      ON ua.uid = u.id
      WHERE ${whereArr.join(' AND ')};`, searchObj);
    this.logger.info('service::binding:get2: ', users);
    if (users && users.length > 0) {
      if (platform !== null) users[0].platform = platform;
      return users[0];
    }
    return null;
  }
}

module.exports = AccountBindingService;
