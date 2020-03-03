const { Subscription } = require('egg');

class KeepWalletBalance extends Subscription {
  static get schedule() {
    return {
      interval: '1m',
      type: 'all',
      immediate: true,
    };
  }

  async subscribe() {
    if (this.ctx.app.config.isDebug) return;
    this.logger.info('Running KeepWalletBalance', new Date().toLocaleString());
    const { web3 } = this.service.ethereum.web3;
    const needAirdropList = await this.service.ethereum.etherAirDropperAPI.findNoEtherUser(
      web3.utils.toWei('0.002', 'ether')
    );
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
