'use strict';
const Service = require('egg').Service;
const moment = require('moment');

/* 账号托管 */
class AccountHostingService extends Service {
  /**
   * @param {*} uid 用户id
   * @return {boolean} 是否创建成功
   * @memberof AccountHostingService
   */
  async create(uid) {
    try {
      const wallet = this.service.ethereum.web3.create();
      this.logger.info('AccountHosting:: create ', wallet);

      const now = moment().format('YYYY-MM-DD HH:mm:ss');

      const result = await this.app.mysql.insert('account_hosting', {
        uid,
        public_key: wallet.address,
        private_key: wallet.privateKey,
        blockchain: 'ETH',
        created_at: now,
      });
      this.logger.info('AccountHosting:: create success: %j', result);
      return true;
    } catch (err) {
      this.logger.error('AccountHosting:: create error: %j', err);
      return false;
    }
  }

  async isHosting(uid, blockchain) {
    try {
      const result = await this.app.mysql.get('account_hosting', { uid, blockchain });
      return result;
    } catch (err) {
      this.logger.error('AccountHosting:: create error: %j', err);
      return false;
    }
  }
}

module.exports = AccountHostingService;