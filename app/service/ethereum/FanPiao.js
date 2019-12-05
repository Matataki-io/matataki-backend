
'use strict';
const Web3Service = require('./web3');
// const contract_data = require('./CommonFanPiao.json');
const contract777_data = require('./FanPiao777v2.json');

class FanPiaoService extends Web3Service {
  /**
   * initContract 生成合约地址为 address 的对象
   * @param {string} address 饭票合约地址，部署时可为 `null`
   */
  initContract(address = null) {
    return new this.web3.eth.Contract(contract777_data.abi, address);
  }

  /**
   * issue ERC-777 FanPiao
   * @param {string} name ERC20 Token Name
   * @param {string} symbol ERC20 Token Symbol
   * @param {number} initialSupply ERC20 Token 首次发行额度, 单位是 wei
   * 如发行 1145141919810 个饭票 需要填入 1145141919810000000000000000000
   * @param {Array<string>} defaultOperators Token 合约默认操作员
   * 默认操作员有权代替用户进行资金操作（如转账、销毁）
   * @return {Promise<PromiEvent>} send 合约到区块链的交易结果
   */
  issue(name, symbol, initialSupply, defaultOperators = []) {
    this.logger.info('FanPiao issuing now:', name, symbol, initialSupply, defaultOperators);
    return new Promise((resolve, reject) => {
      this.initContract().deploy({
        data: contract777_data.bytecode,
        arguments: [ name, symbol, initialSupply, [ this.publicKey, ...defaultOperators ]],
      }).send({ // 发送交易
        from: this.publicKey,
        gas: 10000000,
        gasPrice: '3400000000',
      })
        // 我也很无奈，await promise 要等待部署成功或者部署失败（反正都要等到天荒地老）
        // 要拿 transactionHash 还得用这样的形式
        .on('error', error => { reject(error); })
        .on('transactionHash', txHash => { resolve(txHash); });
    });
  }

  /**
   * estimateGas 计算目前部署合约需要的 gas
   */
  estimateGas() {
    const name = 'ABC';
    const symbol = 'AB Coin';
    const initialSupply = '1145141919810000000000000000000';
    const defaultOperators = [];
    return this.initContract().deploy({
      data: contract777_data.bytecode,
      arguments: [ name, symbol, initialSupply, [ this.publicKey, ...defaultOperators ]],
    }).estimateGas({
      from: this.publicKey,
      gas: 10000000,
    });
  }

  /**
   * operatorSend, 代替 sender 发送 token 给 recipient 的函数，需要我们是777合约的默认operator才能执行
   * @param {string} contractAddress token 合约地址
   * @param {string} sender token 发送者，发送的token余额从 sender 扣除
   * @param {string} recipient 收token的地址，如果是一个合约地址，则必须实现 IERC777Recipient 接口
   * @param {string} amount 发送的 token 数量，单位是wei（最小单位）
   * @param {string} data bytes extra information provided by the token holder (if any)
   * @param {string} operatorData bytes extra information provided by the operator (if any)
   */
  operatorSend(contractAddress, sender, recipient, amount, data = '', operatorData = '') {
    // 开发ing，先硬编码
    const contract = this.initContract(contractAddress);
    const toBytes32 = string => this.web3.utils.stringToHex(string);
    return new Promise((resolve, reject) => {
      contract.methods
        .operatorSend(sender, recipient, amount, toBytes32(data), toBytes32(operatorData)).send({
          from: this.publicKey,
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
