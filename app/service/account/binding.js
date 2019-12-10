'use strict';
const Service = require('egg').Service;
const moment = require('moment');

class AccountBindingService extends Service {

  /**
   * 添加账号绑定
   * @param {*} { uid, account, platform, password_hash = null, is_main = 0 }
   * @return {Boolean} 是否创建成功
   * @memberof AccountBindingService
   */
  async create({ uid, account, platform, password_hash = null, is_main = 0 }) {
    // is Account Existence
    const isAccountExistence = await this.get(uid, platform);
    if (isAccountExistence) {
      return false;
    }
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    const result = await this.app.mysql.insert('user_accounts', {
      uid,
      account,
      password_hash,
      platform,
      is_main,
      created_at: now,
      status: 1,
    });
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
      where: { uid, platform },
      columns: [ 'id', 'uid', 'account', 'platform', 'is_main', 'created_at', 'status' ],
    });
    if (accounts && accounts.length > 0 && accounts[0].status === 1) {
      return accounts[0];
    }
    return null;
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
    const userAccount = await this.get(uid, platform);
    if (!userAccount) {
      return false;
    }
    const tran = await this.app.mysql.beginTransaction();
    try {
      // for update 锁定table row
      const mainAccount = await tran.query('SELECT * FROM user_accounts WHERE uid=? AND platform=? AND is_main=1 limit 1 FOR UPDATE;', [ uid, platform ]);
      if (mainAccount) {
        // 解绑
        await tran.update('user_accounts', {
          id: mainAccount.id,
          is_main: 0,
        });
      }
      // 绑定
      await tran.query('UPDATE user_accounts SET is_main=1 WHERE uid=:uid AND platform=:platform;', {
        uid,
        platform,
      });
      await tran.commit();
      return true;
    } catch (err) {
      await tran.rollback();
      this.logger.error('Service.Account.binding.updateMain exception. %j', err);
      return false;
    }
  }
}

module.exports = AccountBindingService;
