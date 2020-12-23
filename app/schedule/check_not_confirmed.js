const { Subscription } = require('egg');

class CheckNotConfirmBscDeposit extends Subscription {
  static get schedule() {
    return {
      interval: '1m',
      type: 'worker',
      immediate: true,
    };
  }

  async subscribe() {
    await this.service.token.crosschain.checkNotConfirmedDeposit();
  }
}

module.exports = CheckNotConfirmBscDeposit;
