const { Subscription } = require('egg');

class TokenDeploy extends Subscription {
  static get schedule() {
    return {
      interval: '1m',
      type: 'all',
      immediate: true,
    };
  }

  async subscribe() {
    const { mysql } = this.app;

    const issuingTokens = await mysql.select('assets_minetokens_log', {
      where: { type: 'issue' },
    });

    if (!issuingTokens || issuingTokens.length === 0) {
      this.logger.info('TokenDeploy scedule::checking issuingTokens list', '没有部署中的token 啊，那没事了');
      return; // 没有部署中的token 啊，那没事了
    }

    const receipts = await Promise.all(issuingTokens.map(async ({ token_id, tx_hash }) => {
      const receipt = await this.service.ethereum.web3.getTransactionReceipt(tx_hash);
      this.logger.info('TokenDeploy scedule::new receipt: ', receipt);
      return { ...receipt, token_id };
    }));

    await Promise.all(receipts.map(({ token_id, ...receipt }) => {
      if (!receipt.contractAddress) {
        return null;
      }
      // 出合约地址了，即部署成功，更新数据库信息
      const updateLogResult = mysql.update('assets_minetokens_log', { type: 'issued' }, {
        where: { token_id },
      });
      const updateMinetokensResult = mysql.update('minetokens', { status: 1, contract_address: receipt.contractAddress }, {
        where: { id: token_id },
      });
      return Promise.all([ updateLogResult, updateMinetokensResult ]);
    }));
  }

}

module.exports = TokenDeploy;
