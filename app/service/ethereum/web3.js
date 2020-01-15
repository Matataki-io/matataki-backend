
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

  /**
   * sendTransactionWithOurKey 使用我们的 Key 发送交易
   * 用于部署合约、代操作等需要我们帐户发送交易的场合
   * 实际调用下方的 sendTransaction
   * @param {object} encodeABI Web3 交易可以输出 encodeABI 用于交易
   * @param {object} txParams 交易的数参
   */
  async sendTransactionWithOurKey(encodeABI, txParams = {
    to: '',
    value: this.web3.utils.toHex(this.web3.utils.toWei('0', 'ether')),
    gasLimit: this.web3.utils.toHex(200000),
    gasPrice: this.web3.utils.toHex(this.web3.utils.toWei('3', 'gwei')),
  }) {
    const { privateKey } = this.config.ethereum;
    return this.sendTransaction(privateKey, encodeABI, txParams);
  }

  /**
   * sendTransaction 发送以太坊的交易（除了部署合约）
   * 因为我们没有钱包环境，我们只能用 Web3 生成交易信息，并使用 ethereum.js-tx 来签名
   * 再使用 sendSignedTransaction 发送交易
   * @param {*} _privateKey 以太坊钱包的私钥
   * @param {object} encodeABI Web3 交易可以输出 encodeABI 用于交易
   * @param {object} txParams 交易的参数
   */
  async sendTransaction(_privateKey, encodeABI, txParams) {
    txParams = {
      to: '',
      value: this.web3.utils.toHex(this.web3.utils.toWei('0', 'ether')),
      gasLimit: this.web3.utils.toHex(200000),
      gasPrice: this.web3.utils.toHex(this.web3.utils.toWei('3', 'gwei')),
      ...txParams,
    };
    // 处理0x开头的私钥
    let privateKey = _privateKey.slice(0, 2) === '0x' ? _privateKey.slice(2) : _privateKey;
    const { runningNetwork } = this.config.ethereum;
    const { web3 } = this;
    // 发送交易的钱包公钥
    const { address } = web3.eth.accounts.privateKeyToAccount(`0x${privateKey}`);
    // txCount 决定了交易顺序
    const txCount = await web3.eth.getTransactionCount(address);
    console.log('txParams', txParams);
    const txObject = {
      ...txParams,
      nonce: web3.utils.toHex(txCount),
      data: encodeABI,
    };
    // privateKey 转化为 Buffer 用于签署 tx
    privateKey = Buffer.from(`${privateKey}`, 'hex');
    const tx = new Transaction(txObject, { chain: runningNetwork });
    tx.sign(privateKey);
    return web3.eth.sendSignedTransaction(`0x${tx.serialize().toString('hex')}`);
  }
}

module.exports = Web3Service;
