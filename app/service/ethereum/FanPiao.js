
'use strict';
const Web3Service = require('./web3');
const contract_data = require('./CommonFanPiao.json');

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
        .getFanPiaoContract(name, symbol, decimals, cap, initialSupply)
        // 发送交易
        .send({
          from: '0x2F129a52aAbDcb9Fa025BFfF3D4C731c2D914932',
          gas: 10000000,
          gasPrice: '10400000000',
        })
        // 我也很无奈，promise 要等待部署成功或者部署失败（反正都要等到天荒地老）
        // 要拿 transactionHash 还得用这样的形式
        .on('error', error => { reject(error); })
        .on('transactionHash', txHash => { resolve(txHash); });
    });
  }

}

module.exports = FanPiaoService;
