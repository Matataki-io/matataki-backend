const { Subscription } = require('egg');
const axios = require('axios');

class SyncTokenIssue extends Subscription {
  static get schedule() {
    return {
      interval: '3s',
      type: 'all',
      immediate: true,
    };
  }

  async subscribe() {
    const { mysql } = this.app;
    const failIssueTxs = await mysql.query(`
    select mt.name, mt.symbol, mt.decimals, mt.total_supply, mt.uid, log.id, ht.public_key
    from assets_minetokens_log as log 
    join minetokens as mt ON mt.id = log.token_id
    join account_hosting as ht ON ht.uid = mt.uid
    where log.tx_hash is null and log.type = "issue" 
    and log.on_chain_tx_status = 0 and mt.contract_address is null`);
    this.logger.info(failIssueTxs);
    const mappingAsRequests = failIssueTxs.map(token =>
      this.issue(token.name, token.symbol, token.decimals, token.total_supply, token.public_key)
    );
    this.logger.info('mappingAsRequests', mappingAsRequests);
    const txHashes = await this.sendMultiIssues(mappingAsRequests);
    const mappingResult = failIssueTxs.map((tx, idx) => ({ id: tx.id, type: 'issued', tx_hash: txHashes[idx] }));
    this.logger.info('sync failed tokens', mappingResult);
    Promise.all(mappingResult.map(res => mysql.update('assets_minetokens_log', res)));

  }


  issue(name, symbol, decimals, initialSupply, issuer) {
    const issuePayload = { name, symbol, decimals, initialSupply, issuer };
    this.logger.info('issue', issuePayload);
    return issuePayload;
  }

  async sendMultiIssues(requests) {
    const { data } = await axios.post(
      'https://us-central1-ether-air-dropper.cloudfunctions.net/multiIssueTokens',
      { requests });
    return data.txHashes;
  }
}

module.exports = SyncTokenIssue;
