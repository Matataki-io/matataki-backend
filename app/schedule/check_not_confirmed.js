const { Subscription } = require('egg');

class CheckNotConfirmBscDeposit extends Subscription {
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
    // await this.service.token.crosschain.checkNotConfirmedDeposit();
  }
}

module.exports = CheckNotConfirmBscDeposit;
