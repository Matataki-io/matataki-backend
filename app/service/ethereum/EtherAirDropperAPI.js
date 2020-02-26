'use strict';
const Web3Service = require('./web3');
const BigNumber = require('bignumber.js');
const axios = require('axios');

class EtherAirDropService extends Web3Service {
  async requestAirDrop(targets, amounts) {
    // 没有目标就不发请求了
    if (targets.length === 0) { return null; }
    // AirDrop 工具托管在 Google Firebase Cloud function，是一个 Serverless 应用
    const { api, token } = this.config.ethereum.airdrop;
    return axios({
      url: api,
      method: 'POST',
      headers: { 'x-access-token': token },
      data: { targets, amounts },
    });
  }

  async findNoEtherUser(lowestLimit = this.web3.utils.toWei('0.001', 'ether')) {
    const { mysql } = this.app;
    const ethAccounts = await mysql.query(`
    select * from account_hosting where blockchain = 'eth' and uid in (
    select id from users 
      where last_login_time >= DATE(NOW()) - INTERVAL 7 DAY or platform = 'cny'
    )`);
    const addresses = ethAccounts.map(acc => acc.public_key);
    const { data } = await axios({
      url: 'https://us-central1-ether-air-dropper.cloudfunctions.net/getBalanceOfWallets',
      method: 'POST',
      data: { addresses },
    });
    const needAirdropList = data.wallets.filter(
      ({ balance }) => new BigNumber(balance).lt(lowestLimit)
    ).map(({ address }) => address);
    return needAirdropList;
  }

}

module.exports = EtherAirDropService;
