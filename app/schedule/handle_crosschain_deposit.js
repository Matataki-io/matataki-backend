const { Subscription } = require('egg');
const { EnumForPeggedAssetDeposit } = require('../constant/Enums');

class HandleCrosschainDeposit extends Subscription {
  static get schedule() {
    return {
      interval: '1m',
      type: 'worker',
      immediate: true,
    };
  }

  // Disable CrossChain feature
  async subscribe() {
    // if (this.ctx.app.config.isDebug) return;

    // const theNewConfirmedButNotDeposited = await this.app.mysql.get(
    //   'pegged_assets_deposit',
    //   { status: EnumForPeggedAssetDeposit.BURN_EVENT_CONFIRMED }
    // );
    // if (!theNewConfirmedButNotDeposited) return; // Not existed, skip
    // this.logger.info('handling the the New Confirmed But Not Deposited, id:', theNewConfirmedButNotDeposited.id);
    // await this.service.token.crosschain.handleConfirmed();
  }
}

module.exports = HandleCrosschainDeposit;
