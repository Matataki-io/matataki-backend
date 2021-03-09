const { Subscription } = require('egg');
const { EnumForPeggedAssetDeposit } = require('../constant/Enums');

class HandleBscDeposit extends Subscription {
  static get schedule() {
    return {
      interval: '1m',
      type: 'worker',
      immediate: true,
    };
  }

  async subscribe() {
    const theNewConfirmedButNotDeposited = await this.app.mysql.get(
      'pegged_assets_deposit',
      { status: EnumForPeggedAssetDeposit.BURN_EVENT_CONFIRMED, fromChain: 'bsc' }
    );
    if (!theNewConfirmedButNotDeposited) return; // Not existed, skip
    this.logger.info('handling the the New Confirmed But Not Deposited, id:', theNewConfirmedButNotDeposited.id);
    await this.service.token.crosschain.handleConfirmed();
    return;
  }
}

module.exports = HandleBscDeposit;