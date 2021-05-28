'use strict';

const Controller = require('../../core/base_controller');

class HostingController extends Controller {
  async getNonceFromWeb3(address) {
    const nonce = await this.service.ethereum.web3.web3.eth.getTransactionCount(address);
    return nonce;
  }

  async sync() {
    const { ctx } = this;
    const dbConnection = await this.app.mysql.beginTransaction();
    const accounts = await dbConnection.select('account_hosting', { where: { blockchain: 'ETH', nonce: 99999 } });
    const publicKeys = accounts.map(a => a.public_key);
    const nonces = await Promise.all(publicKeys.map(addr => this.getNonceFromWeb3(addr).catch(() => null)));
    for (let i = 0; i < accounts.length; i++) {
        const acc = accounts[i];
        const nonce = nonces[i];
        if (nonce === null) continue;
        this.logger.info(`updating for ${acc.id}: nonce is ${nonces[i]}`);
        await dbConnection.update('account_hosting', { nonce: nonces[i] }, { where: { id: acc.id } });
    }
    await dbConnection.commit();
    ctx.body = accounts;
  }
}

module.exports = HostingController;
