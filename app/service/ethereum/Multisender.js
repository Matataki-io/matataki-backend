'use strict';
const Web3Service = require('./web3');
// const BigNumber = require('bignumber.js');
const ABI = require('./abi/MultiSend.json');
const MAX_OF_UINT256 = `0x${Array(64).fill('F').join('')}`;
const senderAddress = '0x0C01d1A41F21863c194C8e948054f8e3A433c424';
const Token = require('./Token');


class MultiSendService extends Web3Service {
  /**
      * 批量发送代币
      * @param {string} token 代币合约地址
      * @param {string} sender 发送人私钥
      * @param {Array<string>} recipients 收款人列表
      * @param {Array<string>} amounts 金额列表，单位为 wei，使用字符串代表的数字（BigNumber）
      */
  sendToken(token, sender, recipients, amounts) {
    // const value = amounts.reduce(
    //   (accumulator, currentValue) => accumulator.plus(currentValue),
    //   new BigNumber(0));
    const contract = new this.web3.eth.Contract(ABI, senderAddress);
    const encodeABI = contract.methods.multisendToken(token, recipients, amounts).encodeABI();
    return this.sendTransaction(sender, encodeABI, {
      to: senderAddress,
      gasLimit: 6000000,
    });
  }

  estimate(token, recipients, amounts) {
    const contract = new this.web3.eth.Contract(ABI.abi, senderAddress);
    return contract.methods
      .multisendToken(token, recipients, amounts)
      .estimateGas({
        from: this.publicKey,
        gas: 10000000,
      });
  }

  async approveTheMax(token, from) {
    const tokenContract = new Token(20, token);
    return tokenContract._approve(from, senderAddress, MAX_OF_UINT256);
  }

  async getAllowance(token, owner, spender = senderAddress) {
    const tokenContract = new Token(20, token);
    return tokenContract.getAllowance(owner, spender);
  }
}

module.exports = MultiSendService;
