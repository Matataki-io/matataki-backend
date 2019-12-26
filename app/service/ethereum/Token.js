
'use strict';
const Web3 = require('web3');
const { Transaction } = require('ethereumjs-tx');
const contract20_data = require('./CommonFanPiao.json');
const contract777_data = require('./FanPiao777v2.json');
const configFile = require('../../../config/config.default');

const config = configFile({ name: 'Fake EggAppInfo just for config ' });

class Token {
  constructor(type = 20, address) {
    const { infura, runningNetwork } = config.ethereum;
    const provider = new Web3.providers.HttpProvider(`https://${runningNetwork}.infura.io/v3/${infura.id}`);
    this.web3 = new Web3(provider);
    const ABI = type === 777 ? contract777_data.abi : contract20_data.abi;
    this.contractAddress = address;
    this.contract = new this.web3.eth.Contract(ABI, address);
  }

  /**
    * sendTransactionWithOurKey 使用我们的 Key 发送交易
    * ⚠️ 请谨慎使用
    * 用于部署合约、代操作等需要我们帐户发送交易的场合
    * 实际调用下方的 sendTransactionWithKey
    * @param {object} encodeABI Web3 交易可以输出 encodeABI 用于交易
    * @param {object} txParams 交易的参数
    */
  async sendTransactionWithOurKey(encodeABI, txParams = {
    value: this.web3.utils.toHex(this.web3.utils.toWei('0', 'ether')),
  }) {
    const { privateKey } = config.ethereum;
    return this.sendTransaction(privateKey, encodeABI, txParams);
  }

  /**
    * sendTransaction 发送以太坊的交易（除了部署合约）
    * 因为我们没有钱包环境，我们只能用 Web3 生成交易信息，并使用 ethereum.js-tx 来签名
    * 再使用 sendSignedTransaction 发送交易
    * @param {string} _privateKey 以太坊钱包的私钥
    * @param {object} encodeABI Web3 交易可以输出 encodeABI 用于交易
    * @param {object} txParams 交易的参数
    */
  async sendTransaction(_privateKey, encodeABI, txParams = {
    value: this.web3.utils.toHex(this.web3.utils.toWei('0', 'ether')),
    gasLimit: this.web3.utils.toHex(500000),
    gasPrice: this.web3.utils.toHex(this.web3.utils.toWei('3', 'gwei')),
  }) {
    // 处理0x开头的私钥
    console.info('sendTransaction to: ', this.contractAddress);
    let privateKey = _privateKey.slice(0, 2) === '0x' ? _privateKey.slice(2) : _privateKey;
    // privateKey 转化为 Buffer 用于签署 tx
    privateKey = Buffer.from(privateKey, 'hex');
    const { runningNetwork } = config.ethereum;
    const { web3 } = this;
    // 发送交易的钱包公钥
    const { address } = web3.eth.accounts.privateKeyToAccount(_privateKey);
    // txCount 决定了交易顺序
    const txCount = await web3.eth.getTransactionCount(address);
    const txObject = {
      ...txParams,
      nonce: web3.utils.toHex(txCount),
      to: this.contractAddress,
      data: encodeABI,
    };
    console.info('sendTx txObject:', txObject);
    const tx = new Transaction(txObject, { chain: runningNetwork });
    tx.sign(privateKey);
    return web3.eth.sendSignedTransaction(`0x${tx.serialize().toString('hex')}`);
  }

  /**
    * ⚠️ 这个 _operatorSend 函数没有设置权限控制，请在 controller 调用时小心设置好权限控制
    * _operatorSend, 代替 sender 发送 token 给 recipient 的函数，需要我们是777合约的默认operator才能执行
    * @param {string} sender token 发送者，发送的token余额从 sender 扣除
    * @param {string} recipient 收token的地址，如果是一个合约地址，则必须实现 IERC777Recipient 接口
    * @param {string} amount 发送的 token 数量，单位是wei（最小单位）
    * @param {string} data bytes extra information provided by the token holder (if any)
    * @param {string} operatorData bytes extra information provided by the operator (if any)
    */
  _operatorSend(sender, recipient, amount, data = '', operatorData = '') {
    // 开发ing，先硬编码
    const toBytes32 = string => this.web3.utils.stringToHex(string);
    const encodedAbi = this.contract.methods.operatorSend(
      sender, recipient, amount, toBytes32(data), toBytes32(operatorData)
    ).encodeABI();
    return this.sendTransactionWithOurKey(encodedAbi);
  }

  /**
    *   ⚠️ 这个 _mint 函数没有设置权限控制，请在 controller 调用时小心设置好权限控制
    *  _mint, 我们作为合约 Minter 给 to 印钱
    *  @param {string} to 收新铸币的地址，如果是一个合约地址，则必须实现 IERC777Recipient 接口
    *  @param {string} amount 铸币数量，单位是wei（最小单位）
    */
  _mint(to, amount) {
    // 开发ing，先硬编码
    console.info('_mint', to, amount);
    console.info(this.address);
    const encodeABI = this.contract.methods.mint(to, amount).encodeABI();
    return this.sendTransactionWithOurKey(encodeABI);
  }

  /**
    * ERC20 的 transferFrom，需要 sender 提前在合约 approve 了我们的动用资金的权限
    * @param {string} sender 发送者的公钥
    * @param {string} recipient 接收者的公钥
    * @param {string} amount 数额
    */
  _transferFrom(sender, recipient, amount) {
    const encodeABI = this.contract.methods.transferFrom(sender, recipient, amount).encodeABI();
    return this.sendTransactionWithOurKey(encodeABI);
  }

  /**
    * ERC20 的 transfer
    * @param {string} from 发送者的私钥
    * @param {string} recipient 接收者的公钥
    * @param {string} amount 数额
    */
  transfer(from, recipient, amount) {
    const encodeABI = this.contract.methods.transfer(recipient, amount).encodeABI();
    return this.sendTransaction(from, encodeABI, {
      gasLimit: this.web3.utils.toHex(150000),
      gasPrice: this.web3.utils.toHex(this.web3.utils.toWei('2', 'gwei')),
    });
  }

  /**
    * burn , burner 销毁饭票的入口
    * @param {*} burner 销毁饭票的主人私钥
    * @param {*} amount 销毁的数额
    */
  burn(burner, amount) {
    const encodeABI = this.contract.methods.transfer(amount).encodeABI();
    return this.sendTransaction(burner, encodeABI);
  }
}

module.exports = Token;
