const { Subscription } = require('egg');

class TokenDeploy extends Subscription {
  static get schedule() {
    return {
      interval: '1m',
      type: 'worker',
      immediate: true,
    };
  }

  async subscribe() {
    if (this.ctx.app.config.isDebug) return;
    this.logger.info('Running TokenDeploy', new Date().toLocaleString());
    const { mysql } = this.app;
    const issuingTokens = await mysql.select('assets_minetokens_log', {
      where: { type: 'issue' },
    });
    if (!issuingTokens || issuingTokens.length === 0) {
      return; // 没有部署中的token 啊，那没事了
    }
    // split tx_Hash is normal tx
    const sentOut = issuingTokens.filter((tx) => Boolean(tx.tx_hash));
    // if a failed tx reported, then status will be -1, we need not reported yet failed tx.
    const failed = issuingTokens.filter((tx) => !Boolean(tx.tx_hash) && tx.on_chain_tx_status !== -1);
    
    if (failed.length > 0) {
      // and report null tx (if any)
      await this.handleBadDeploy(failed);
    }

    if (sentOut.length > 0) {
      // and update, if any
      await this.handleTheDeployed(sentOut);
    }
  }

  async handleBadDeploy(failed) {
    const { mysql } = this.app;
    const generateDetailOfFailedToken = (tx) => `- 交易ID: ${tx.id}，交易时间： ${tx.create_time.toLocaleString()}， 涉及的 Token ID: ${tx.token_id}`;
    const msgs = failed.map(generateDetailOfFailedToken)
    msgs.forEach(msg => this.logger.error('Failed to deploy', msg));
    await this.service.system.notification.pushMarkdownToDingtalk(
      "badTokenMonitor", 
      `监测到失败的发币交易`, 
      `### ⚠️ 监测到失败的发币交易⚠️ 
> ${msgs.join('\n> ')} \n
> 共 ${failed.length} 个失败的发币交易
    `)
    // setting their status to -1 as we pushed the notification
    await Promise.all(
      failed.map(tx => mysql.update('assets_minetokens_log', {
        on_chain_tx_status: -1,
      }, {
        where: { id: tx.id },
      }))
    )
    // more logic to impl, if you want
  }

  async handleTheDeployed(deployed) {
    const { mysql } = this.app;
    const receipts = await Promise.all(deployed.map(async ({ token_id, tx_hash }) => {
      const receipt = await this.service.ethereum.web3.getTransactionReceipt(tx_hash);
      this.logger.info('TokenDeploy scedule::new receipt: ', receipt);
      return { ...receipt, token_id };
    }));

    await Promise.all(receipts.map(({ token_id, ...receipt }) => {
      if (!receipt.contractAddress) { return null; }
      // 出合约地址了，即部署成功，更新数据库信息
      const updateLogResult = mysql.query(`update assets_minetokens_log set type="issued" where token_id=${token_id} AND type = "issue"`);
      const updateMinetokensResult = mysql.update('minetokens', { status: 1, contract_address: receipt.contractAddress }, {
        where: { id: token_id },
      });
      const syncToBotBackend = this.service.tokenCircle.api.setTokenContract(token_id, receipt.contractAddress);
      return Promise.all([ updateLogResult, updateMinetokensResult, syncToBotBackend ]);
    }));
  }
}

module.exports = TokenDeploy;
