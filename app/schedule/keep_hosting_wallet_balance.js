const { Subscription } = require('egg');
const axios = require('axios');
const BigNumber = require('bignumber.js');

class KeepWalletBalance extends Subscription {
  static get schedule() {
    return {
      interval: '30m',
      type: 'all',
      immediate: true,
    };
  }

  async subscribe() {
    this.logger.info('Running KeepWalletBalance', new Date().toLocaleString());
    const { web3 } = this.service.ethereum.web3;
    const { mysql } = this.app;
    const ethAccounts = await mysql.select('account_hosting', {
      where: { blockchain: 'ETH' },
    });
    const balances = await Promise.all(ethAccounts.map(
      ({ public_key }) => web3.eth.getBalance(public_key)
    ));
    const accountStat = balances.map((_, idx) => ({
      address: ethAccounts[idx].public_key,
      balance: balances[idx],
    }));
    const lowestLimit = web3.utils.toWei('0.0015', 'ether');
    const needAirdropList = accountStat.filter(
      ({ balance }) => new BigNumber(balance).lt(lowestLimit)
    ).map(({ address }) => address);

    const { data } = await this.requestAirDrop(needAirdropList, Array(needAirdropList.length).fill(web3.utils.toWei('0.002', 'ether')));
    this.logger.info('Multisend Result', data);
  }

  async requestAirDrop(targets, amounts) {
    // AirDrop 工具托管在 Google Firebase Cloud function，是一个 Serverless 应用
    const { api, token } = this.config.ethereum.airdrop;
    return axios({
      url: api,
      method: 'POST',
      headers: { 'x-access-token': token },
      data: { targets, amounts },
    });
  }
}

module.exports = KeepWalletBalance;
