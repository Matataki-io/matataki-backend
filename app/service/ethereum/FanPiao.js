
'use strict';
const Web3Service = require('./web3');
const contract20_data = require('./CommonFanPiao.json');

class FanPiaoService extends Web3Service {
  /**
   * initContract 生成合约地址为 address 的对象
   * @param {number} type 合约类型 默认为`20`
   * @param {string} address 饭票合约地址，部署时可为 `null`
   */
  initContract(type = 20, address = null) {
    const ABI = contract20_data.abi;
    return new this.web3.eth.Contract(ABI, address);
  }

  /**
   * issue ERC-20 FanPiao
   * @param {string} name ERC20 Token Name
   * @param {string} symbol ERC20 Token Symbol
   * @param {number} decimals ERC20 Token Decimals
   * @param {number} initialSupply ERC20 Token 首次发行额度, 单位是 wei
   * 如发行 1145141919810 个饭票 需要填入 1145141919810000000000000000000
   * @param {address} issuer 发币者钱包地址
   * @return {Promise<PromiEvent>} send 合约到区块链的交易结果
   */
  async issue(name, symbol, decimals, initialSupply, issuer) {
    this.logger.info('FanPiao-20 issuing now:', name, symbol, decimals, initialSupply, issuer);
    const gasPrice = await this.web3.eth.getGasPrice();
    // 我也很无奈，await promise 要等待部署成功或者部署失败（反正都要等到天荒地老）
    // 要单纯拿 transactionHash 还得用这样的形式
    return new Promise((resolve, reject) => {
      this.initContract().deploy({
        data: contract20_data.bytecode,
        arguments: [ name, symbol, decimals, initialSupply, issuer ],
      }).send({ // 发送交易
        from: this.publicKey,
        gas: 5000000,
        gasPrice,
      })
        .on('error', error => { reject(error); })
        .on('transactionHash', txHash => { resolve(txHash); });
    });
  }

}

module.exports = FanPiaoService;
