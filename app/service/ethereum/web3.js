
'use strict';
const Web3 = require('web3');
const { Service } = require('egg');
const { Transaction } = require('ethereumjs-tx');

class Web3Service extends Service {
  constructor(ctx) {
    super(ctx);
    const { infura, privateKey, runningNetwork } = this.config.ethereum;
    const ApiEndpoint = `https://${runningNetwork}.infura.io/v3/${infura.id}`;
    const provider = new Web3.providers.HttpProvider(ApiEndpoint);
    this.web3 = new Web3(provider);
    this.publicKey = this.web3.eth.accounts.privateKeyToAccount(privateKey).address;
    // privateKey 还没决定好怎么用怎么放，我先定义在config用于开发工作
    this.web3.eth.accounts.wallet.add(privateKey);
  }

  /**
   * create function
   * @return {object} object The account object with the following structure
   * https://web3js.readthedocs.io/en/v1.2.4/web3-eth-accounts.html#create
   */
  create() {
    return this.web3.eth.accounts.create();
  }

  getAccounts() {
    return this.web3.eth.getAccounts();
  }

  getTransaction(txHash) {
    return this.web3.eth.getTransaction(txHash);
  }

  getTransactionReceipt(txHash) {
    return this.web3.eth.getTransactionReceipt(txHash);
  }

  async sendTransaction(encodeABI, txParams = {
    to: '',
    value: this.web3.utils.toHex(this.web3.utils.toWei('0', 'ether')),
    gasLimit: this.web3.utils.toHex(200000),
    gasPrice: this.web3.utils.toHex(this.web3.utils.toWei('1', 'gwei')),
  }) {
    const { privateKey, runningNetwork } = this.config.ethereum;
    const { web3 } = this;
    const txCount = await web3.eth.getTransactionCount('0x2F129a52aAbDcb9Fa025BFfF3D4C731c2D914932');
    const txObject = {
      ...txParams,
      nonce: web3.utils.toHex(txCount),
      data: encodeABI,
    };
    const tx = new Transaction(txObject, { chain: runningNetwork });
    tx.sign(privateKey);
    return web3.eth.sendSignedTransaction(`0x${tx.serialize().toString('hex')}`);
  }
}

module.exports = Web3Service;
