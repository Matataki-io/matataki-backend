'use strict';
const Web3Service = require('./web3');
const ABI = require('./timemachine.json');

class TimeMachineService extends Web3Service {
  get contractAddress() {
    const { env, timemachine } = this.config;
    return timemachine.contracts[env];
  }

  initContract() {
    const { contractAddress } = this;
    return new this.web3.eth.Contract(ABI, contractAddress);
  }

  updateIpfsHash(articleId, ipfsHash) {
    const { contractAddress } = this;
    const contract = this.initContract();
    const encodeABI = contract.methods.updateIpfsHash(articleId, ipfsHash).encodeABI();
    return this.sendTransactionWithOurKey(encodeABI, {
      to: contractAddress,
      value: this.web3.utils.toHex(this.web3.utils.toWei('0', 'ether')),
      gasLimit: this.web3.utils.toHex(200000),
      gasPrice: this.web3.utils.toHex(this.web3.utils.toWei('3', 'gwei')),
    });
  }

  getLatestIpfsHash(articleId) {
    return this.initContract().methods.getLatestIpfsHash(articleId).call();
  }

  getArticleRivisionHistory(articleId, size) {
    return this.initContract().methods.getArticleRivisionHistory(articleId, size).call();
  }

  getCurrentRevisionId(articleId) {
    return this.initContract().methods.getCurrentRevisionId(articleId).call();
  }

  // 一般没事不要调用这两个admin相关的函数
  _setAdmin(_address) {
    const { contractAddress } = this;
    const contract = this.initContract();
    const encodeABI = contract.methods.setAdmin(_address).encodeABI();
    return this.sendTransactionWithOurKey(encodeABI, {
      to: contractAddress,
      value: this.web3.utils.toHex(this.web3.utils.toWei('0', 'ether')),
      gasLimit: this.web3.utils.toHex(200000),
      gasPrice: this.web3.utils.toHex(this.web3.utils.toWei('3', 'gwei')),
    });
  }

  _revokeAdmin(_address) {
    const { contractAddress } = this;
    const contract = this.initContract();
    const encodeABI = contract.methods.revokeAdmin(_address).encodeABI();
    return this.sendTransactionWithOurKey(encodeABI, {
      to: contractAddress,
      value: this.web3.utils.toHex(this.web3.utils.toWei('0', 'ether')),
      gasLimit: this.web3.utils.toHex(200000),
      gasPrice: this.web3.utils.toHex(this.web3.utils.toWei('3', 'gwei')),
    });
  }

  getArticleOwner(articleId) {
    return this.initContract().methods.getArticleOwner(articleId).call();
  }

  updateArticleOwner(articleId, _newOwner) {
    const { contractAddress } = this;
    const contract = this.initContract();
    const encodeABI = contract.methods.updateArticleOwner(articleId, _newOwner).encodeABI();
    return this.sendTransactionWithOurKey(encodeABI, {
      to: contractAddress,
      value: this.web3.utils.toHex(this.web3.utils.toWei('0', 'ether')),
      gasLimit: this.web3.utils.toHex(200000),
      gasPrice: this.web3.utils.toHex(this.web3.utils.toWei('3', 'gwei')),
    });
  }
}

module.exports = TimeMachineService;
