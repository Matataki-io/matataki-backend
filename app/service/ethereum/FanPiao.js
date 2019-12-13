
'use strict';
const Web3Service = require('./web3');
const contract20_data = require('./CommonFanPiao.json');
const contract777_data = require('./FanPiao777v2.json');

class FanPiaoService extends Web3Service {
  /**
   * initContract 生成合约地址为 address 的对象
   * @param {number} type 合约类型 默认为`777`
   * @param {string} address 饭票合约地址，部署时可为 `null`
   */
  initContract(type = 777, address = null) {
    const ABI = type === 777 ? contract777_data.abi : contract20_data.abi;
    return new this.web3.eth.Contract(ABI, address);
  }

  /**
   * issue ERC-20 FanPiao
   * @param {string} name ERC20 Token Name
   * @param {string} symbol ERC20 Token Symbol
   * @param {number} decimals ERC20 Token Decimals
   * @param {number} initialSupply ERC20 Token 首次发行额度, 单位是 wei
   * 如发行 1145141919810 个饭票 需要填入 1145141919810000000000000000000
   * @return {Promise<PromiEvent>} send 合约到区块链的交易结果
   */
  issue(name, symbol, decimals, initialSupply) {
    this.logger.info('FanPiao-20 issuing now:', name, symbol, decimals, initialSupply);
    return new Promise((resolve, reject) => {
      this.initContract(20).deploy({
        data: contract20_data.bytecode,
        arguments: [ name, symbol, decimals, initialSupply ],
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
   * issue ERC-777 FanPiao
   * @param {string} name ERC20 Token Name
   * @param {string} symbol ERC20 Token Symbol
   * @param {number} initialSupply ERC20 Token 首次发行额度, 单位是 wei
   * 如发行 1145141919810 个饭票 需要填入 1145141919810000000000000000000
   * @param {Array<string>} defaultOperators Token 合约默认操作员
   * 默认操作员有权代替用户进行资金操作（如转账、销毁）
   * @return {Promise<PromiEvent>} send 合约到区块链的交易结果
   */
  issueERC777(name, symbol, initialSupply, defaultOperators = []) {
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
   * ⚠️ 这个 _operatorSend 函数没有设置权限控制，请在 controller 调用时小心设置好权限控制
   * _operatorSend, 代替 sender 发送 token 给 recipient 的函数，需要我们是777合约的默认operator才能执行
   * @param {string} contractAddress token 合约地址
   * @param {string} sender token 发送者，发送的token余额从 sender 扣除
   * @param {string} recipient 收token的地址，如果是一个合约地址，则必须实现 IERC777Recipient 接口
   * @param {string} amount 发送的 token 数量，单位是wei（最小单位）
   * @param {string} data bytes extra information provided by the token holder (if any)
   * @param {string} operatorData bytes extra information provided by the operator (if any)
   */
  _operatorSend(contractAddress, sender, recipient, amount, data = '', operatorData = '') {
    // 开发ing，先硬编码
    const contract = this.initContract(777, contractAddress);
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

  /**
   * ⚠️ 这个 _mint 函数没有设置权限控制，请在 controller 调用时小心设置好权限控制
   * _mint, 我们作为合约 Minter 给 to 印钱
   * @param {number} type 合约类型 默认为`777`
   * @param {string} contractAddress token 合约地址
   * @param {string} to 收新铸币的地址，如果是一个合约地址，则必须实现 IERC777Recipient 接口
   * @param {string} amount 铸币数量，单位是wei（最小单位）
   */
  _mint(type = 777, contractAddress, to, amount) {
    // 开发ing，先硬编码
    const contract = this.initContract(type, contractAddress);
    return new Promise((resolve, reject) => {
      contract.methods.mint(to, amount).send({
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
