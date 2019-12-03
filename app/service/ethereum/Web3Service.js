
'use strict';
const Service = require('egg').Service;
const Web3 = require('web3');


class Web3Service extends Service {
  constructor(ctx) {
    super(ctx);
    const { infura, privateKey, runningNetwork } = this.config.ethereum;
    const ApiEndpoint = `https://${runningNetwork}.infura.io/v3/${infura.id}`;
    const provider = new Web3.providers.HttpProvider(ApiEndpoint);
    this.web3 = new Web3(provider);
    // privateKey 还没决定好怎么用怎么放，我先定义在config用于开发工作
    this.account = this.web3.eth.accounts.privateKeyToAccount(privateKey);
  }

  /**
   * create function
   * @return {object} object The account object with the following structure
   * https://web3js.readthedocs.io/en/v1.2.4/web3-eth-accounts.html#create
   */
  create() {
    return this.web3.eth.accounts.create();
  }
}

module.exports = Web3Service;
