
'use strict';
const Web3Service = require('./web3');
const contract_data = require('./CommonFanPiao.json');
const contract777_data = require('./FanPiao777v1.json');

class FanPiaoService extends Web3Service {
  /**
   * getFanPiaoContract, 通过生成web3的合约对象来进行各种操作（部署、测算gas费等...）
   * @param {string} name ERC20 Token Name
   * @param {string} symbol ERC20 Token Symbol
   * @param {number} decimals the decimal precision of your token. If you don't know what to insert, use 18.
   * @param {number} cap The maximum number of tokens available
   * @param {number} initialSupply ERC20 Token 首次发行额度, 只要initSupply不超过cap应该可以继续 mint
   */
  getFanPiaoContract(name, symbol, decimals = 18, cap, initialSupply = cap) {
    const contract = new this.web3.eth.Contract(contract_data.abi);
    return contract.deploy({
      data: contract_data.bytecode,
      arguments: [ name, symbol, decimals, cap, initialSupply ],
    });
  }
  /**
   * getFanPiao777Contract, 通过生成Fanpiao 777合约对象来进行各种操作（部署、测算gas费等...）
   * @param {string} name ERC20 Token Name
   * @param {string} symbol ERC20 Token Symbol
   * @param {number} initialSupply ERC20 Token 首次发行额度，不够后续可以继续mint
   * @param {Array<string>} defaultOperators 777Token 默认操作员
   * An operator is an address which is allowed to
   * send and burn tokens on behalf of some holder.
   */
  getFanPiao777Contract(name, symbol, initialSupply, defaultOperators = []) {
    const contract = new this.web3.eth.Contract(contract777_data.abi);
    return contract.deploy({
      data: contract777_data.bytecode,
      arguments: [ name, symbol, initialSupply, defaultOperators ],
    });
  }

  /**
   * issue ERC20 FanPiao
   * @param {string} name ERC20 Token Name
   * @param {string} symbol ERC20 Token Symbol
   * @param {number} decimals the decimal precision of your token. If you don't know what to insert, use 18.
   * @param {number} cap The maximum number of tokens available
   * @param {number} initialSupply ERC20 Token 首次发行额度, 只要initSupply不超过cap应该可以继续 mint
   * @return {Promise<PromiEvent>} send 合约到区块链的交易结果
   */
  issueFanPiao(name, symbol, decimals, cap, initialSupply) {
    this.logger.info('FanPiao issuing now:', name, symbol, decimals, cap, initialSupply);
    return new Promise((resolve, reject) => {
      this
        // .getFanPiaoContract(name, symbol, decimals, cap, initialSupply)
        .getFanPiao777Contract(name, symbol, initialSupply, [ '0x2F129a52aAbDcb9Fa025BFfF3D4C731c2D914932' ])
        // 发送交易
        .send({
          from: '0x2F129a52aAbDcb9Fa025BFfF3D4C731c2D914932',
          gas: 10000000,
          gasPrice: '3400000000',
        })
        // 我也很无奈，promise 要等待部署成功或者部署失败（反正都要等到天荒地老）
        // 要拿 transactionHash 还得用这样的形式
        .on('error', error => { reject(error); })
        .on('transactionHash', txHash => { resolve(txHash); });
    });
  }

  estimateGas(name, symbol, decimals, cap) {
    return this.getFanPiaoContract(name, symbol, decimals, cap).estimateGas({
      from: '0x2F129a52aAbDcb9Fa025BFfF3D4C731c2D914932',
      gas: 10000000,
    });
  }

  /**
   * operatorSend, 代替 send 发送 token 给 recipient 的函数
   * @param {string} sender 发送者
   * @param {string} recipient 接受者
   * @param {string} amount 发送的 token 数量，单位是wei（最小单位）
   * @param {string} data bytes extra information provided by the token holder (if any)
   * @param {string} operatorData bytes extra information provided by the operator (if any)
   */
  operatorSend(sender, recipient, amount, data = '', operatorData = '') {
    // 开发ing，先硬编码
    const contract = new this.web3.eth.Contract(contract777_data.abi, '0xf4F6f5878662dcB4ac404D69da0eEaEe5092bC8E');
    const toBytes32 = string => this.web3.utils.stringToHex(string);
    return new Promise((resolve, reject) => {
      contract.methods
        .operatorSend(sender, recipient, amount, toBytes32(data), toBytes32(operatorData)).send({
          from: '0x2F129a52aAbDcb9Fa025BFfF3D4C731c2D914932',
          gas: 10000000,
          gasPrice: '3400000000',
        })
        .on('transactionHash', hash => {
          resolve(hash);
        })
        .on('error', (error, receipt) => {
          if (receipt) reject(receipt);
          else reject(error);
        });
    });
  }
}

module.exports = FanPiaoService;
