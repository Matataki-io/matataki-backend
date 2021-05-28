
'use strict';
const Web3 = require('web3');
const { Transaction } = require('ethereumjs-tx');
const contract20_data = require('./CommonFanPiao.json');
const configFile = require('../../../config/config.default');

const config = configFile({ name: 'Fake EggAppInfo just for config ' });


class Token {
  constructor(type = 20, address) {
    const { infura, runningNetwork } = config.ethereum;
    const provider = new Web3.providers.HttpProvider(`https://${runningNetwork}.infura.io/v3/${infura.id}`);
    this.web3 = new Web3(provider);
    const ABI = contract20_data.abi;
    this.contractAddress = address;
    this.contract = new this.web3.eth.Contract(ABI, address);
  }

  /**
    * sendTransaction 发送以太坊的交易（除了部署合约）
    * 因为我们没有钱包环境，我们只能用 Web3 生成交易信息，并使用 ethereum.js-tx 来签名
    * 再使用 sendSignedTransaction 发送交易
    * @param {string} _privateKey 以太坊钱包的私钥
    * @param {object} encodeABI Web3 交易可以输出 encodeABI 用于交易
    * @param {object} txParams 交易的参数
    */
  async sendTransaction(_privateKey, encodeABI, {
    value = 0,
    nonce,
    gasLimit = 500000,
  }) {
    // 处理0x开头的私钥
    let privateKey = _privateKey.slice(0, 2) === '0x' ? _privateKey.slice(2) : _privateKey;
    // privateKey 转化为 Buffer 用于签署 tx
    privateKey = Buffer.from(privateKey, 'hex');
    const { runningNetwork } = config.ethereum;
    const { web3 } = this;
    // 发送交易的钱包公钥
    // txCount 决定了交易顺序
    const gasPrice = await web3.eth.getGasPrice();
    const txObject = {
      value: web3.utils.toHex(value),
      gasLimit: web3.utils.toHex(gasLimit),
      nonce,
      gasPrice: web3.utils.toHex(gasPrice),
      to: this.contractAddress,
      data: encodeABI,
    };
    const tx = new Transaction(txObject, { chain: runningNetwork });
    tx.sign(privateKey);
    return web3.eth.sendSignedTransaction(`0x${tx.serialize().toString('hex')}`);
  }

  /**
    *   ⚠️ 这个 _mint 函数没有设置权限控制，请在 controller 调用时小心设置好权限控制
    *  _mint, 我们作为合约 Minter 给 to 印钱
    *  @param {string} from 发送铸币交易的钱包私钥，需要是MinterRole
    *  @param {string} to 收新铸币的地址
    *  @param {string} amount 铸币数量，单位是wei（最小单位）
    *  @param {number} nonce 顺序号
    */
  _mint(from, to, amount, nonce) {
    // 开发ing，先硬编码
    const encodeABI = this.contract.methods.mint(to, amount).encodeABI();
    return this.sendTransaction(from, encodeABI, { gasLimit: 100000, nonce });
  }

  /**
    * ERC20 的 transfer
    * @param {string} from 发送者的私钥
    * @param {string} recipient 接收者的公钥
    * @param {string} amount 数额
    * @param {number} nonce 顺序号
    */
  transfer(from, recipient, amount, nonce) {
    const encodeABI = this.contract.methods.transfer(recipient, amount).encodeABI();
    return this.sendTransaction(from, encodeABI, {
      gasLimit: 150000,
      nonce,
    });
  }

  /**
    * burn , burner 销毁饭票的入口
    * @param {*} burner 销毁饭票的主人私钥
    * @param {*} amount 销毁的数额
    * @param {number} nonce 顺序号
    */
  burn(burner, amount, nonce) {
    const encodeABI = this.contract.methods.transfer(amount).encodeABI();
    return this.sendTransaction(burner, encodeABI, {
      gasLimit: 150000,
      nonce,
    });
  }

  _approve(from, spender, value, nonce) {
    const encodeABI = this.contract.methods.approve(spender, value).encodeABI();
    return this.sendTransaction(from, encodeABI, {
      gasLimit: 75000,
      nonce,
    });
  }

  async getAllowance(owner, spender) {
    const result = await this.contract.methods.allowance(owner, spender).call();
    return result;
  }
}

module.exports = Token;
