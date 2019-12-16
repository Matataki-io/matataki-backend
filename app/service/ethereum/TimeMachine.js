'use strict';
const Web3Service = require('./web3');
const ABI = require('./timemachine.json');

const contractAddress = '0xeD91Fa66bFBAe41C352E812447b3477B9CdC3cee';

class TimeMachineService extends Web3Service {
  initContract() {
    return new this.web3.eth.Contract(ABI, contractAddress);
  }

  async publish(articleId, author, ipfsHash) {
    const contract = this.initContract();
    const encodeABI = contract.methods.publish(articleId, author, ipfsHash).encodeABI();
    return this.sendTransaction(encodeABI, {
      to: contractAddress,
      value: this.web3.utils.toHex(this.web3.utils.toWei('0', 'ether')),
      gasLimit: this.web3.utils.toHex(200000),
      gasPrice: this.web3.utils.toHex(this.web3.utils.toWei('1', 'gwei')),
    });
  }

  updateIpfsHash(articleId, ipfsHash) {
    const contract = this.initContract();
    const encodeABI = contract.methods.updateIpfsHash(articleId, ipfsHash).encodeABI();
    return this.sendTransaction(encodeABI, {
      to: contractAddress,
      value: this.web3.utils.toHex(this.web3.utils.toWei('0', 'ether')),
      gasLimit: this.web3.utils.toHex(200000),
      gasPrice: this.web3.utils.toHex(this.web3.utils.toWei('1', 'gwei')),
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

  setAdmin(_address) {
    const contract = this.initContract();
    const encodeABI = contract.methods.setAdmin(_address).encodeABI();
    return this.sendTransaction(encodeABI, {
      to: contractAddress,
      value: this.web3.utils.toHex(this.web3.utils.toWei('0', 'ether')),
      gasLimit: this.web3.utils.toHex(200000),
      gasPrice: this.web3.utils.toHex(this.web3.utils.toWei('1', 'gwei')),
    });
  }

  revokeAdmin(_address) {
    const contract = this.initContract();
    const encodeABI = contract.methods.revokeAdmin(_address).encodeABI();
    return this.sendTransaction(encodeABI, {
      to: contractAddress,
      value: this.web3.utils.toHex(this.web3.utils.toWei('0', 'ether')),
      gasLimit: this.web3.utils.toHex(200000),
      gasPrice: this.web3.utils.toHex(this.web3.utils.toWei('1', 'gwei')),
    });
  }

  getArticleOwner(articleId) {
    return this.initContract().methods.getArticleOwner(articleId).call();
  }

  updateArticleOwner(articleId, _newOwner) {
    const contract = this.initContract();
    const encodeABI = contract.methods.updateArticleOwner(articleId, _newOwner).encodeABI();
    return this.sendTransaction(encodeABI, {
      to: contractAddress,
      value: this.web3.utils.toHex(this.web3.utils.toWei('0', 'ether')),
      gasLimit: this.web3.utils.toHex(200000),
      gasPrice: this.web3.utils.toHex(this.web3.utils.toWei('1', 'gwei')),
    });
  }
}

module.exports = TimeMachineService;
