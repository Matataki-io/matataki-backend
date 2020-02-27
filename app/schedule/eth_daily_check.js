const { Subscription } = require('egg');

class KeepWalletBalanceDaily extends Subscription {
  static get schedule() {
    return {
      cron: '0 0 2 * * *',
      type: 'all',
      immediate: true,
    };
  }

  async subscribe() {
    const { web3 } = this.service.ethereum.web3;
    const lowestBalanceLimit = web3.utils.toWei('0.002', 'ether');
    const needAirdropList = await this.service.ethereum
      .etherAirDropperAPI.getUnderBalanceWallet(lowestBalanceLimit);
    this.logger.info('KeepWalletBalanceDaily::needAirdropList', needAirdropList);
    if (needAirdropList.length !== 0) {
      const { data } = await this.service.ethereum.etherAirDropperAPI.requestAirDrop(
        needAirdropList,
        Array(needAirdropList.length).fill(web3.utils.toWei('0.005', 'ether')));
      await this.service.serverchan.sendNotification(
        '每日空投报告', JSON.stringify(data));
    }
  }
}

module.exports = KeepWalletBalanceDaily;
