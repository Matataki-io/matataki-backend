const { Subscription } = require('egg');

class KeepWalletBalance extends Subscription {
  static get schedule() {
    return {
      interval: '1m',
      type: 'worker',
    };
  }

  async subscribe() {
    if (this.ctx.app.config.isDebug) return;
    const { web3 } = this.service.ethereum.web3;
    const lowestBalanceLimit = web3.utils.toWei('0.002', 'ether');
    const needAirdropList = await this.service.ethereum
      .etherAirDropperAPI.getActiveUnderBalanceWallet(lowestBalanceLimit);
    this.logger.info('KeepWalletBalance::needAirdropList', needAirdropList);
    if (needAirdropList.length !== 0) {
      const { data } = await this.service.ethereum.etherAirDropperAPI.requestAirDrop(
        needAirdropList,
        Array(needAirdropList.length).fill(web3.utils.toWei('0.005', 'ether')));
      this.logger.info('Multisend Result', data);
    }
  }
}

module.exports = KeepWalletBalance;
