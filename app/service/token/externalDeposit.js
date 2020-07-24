'use strict';
const moment = require('moment');
const Service = require('egg').Service;
const consts = require('../consts');

// this equals to keccak256("Transfer(address,address,uint256)")
// which is the hash signature of ERC20 Transfer Event
const TransferEventTopicHash = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

class ExternalDepositService extends Service {
  constructor(ctx, app) {
    super(ctx, app);
    this.app.mysql.queryFromat = function(query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function(txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    };
  }

  toUint256Hex(addr) {
    const hex = addr.slice(2).toLowerCase();
    const paddedZerosOnTheLeft = Array(24).fill('0').join('')
    return `0x${paddedZerosOnTheLeft}${hex}`;
  }

  isSameAddress(originalAddress, topicTo) {
      return this.toUint256Hex(originalAddress) === topicTo;
  }

  getTransferEvent(logs) {
      if (logs.length < 1) return null;
      const logsThatHaveTopic = logs.filter((log) => log.topics && log.topics.length > 0);
      const target = logsThatHaveTopic.find(log => log.topics[0] === TransferEventTopicHash);
      return target || null;
  }

  getDataFromTransferEvent(event) {
      const [eventSig, fromAddr, toAddr] = event.topics;
      if (eventSig !== TransferEventTopicHash) throw new Error("This is not an ERC20 Transfer Event");
      const amount = Number(event.data);
      return { fromAddr, toAddr, amount, transactionHash: event.transactionHash }
  }

  async isTxNotExistInDB(txHash) {
      const logs = await this.app.mysql.select('assets_minetokens_log', { where: { tx_hash: txHash } })
      return logs.length === 0;
  }

  async getFanPiaoFromAddress(addr) {
      // Fixed since receipt's address is all lowercase, we need checksumed address
      const addressChecksumed = this.service.ethereum.web3.toChecksumAddress(addr)
      const list = await this.app.mysql.select('minetokens', { where: { contract_address: addressChecksumed } });
      return list[0];
  }

  /**
   * handleDeposit 处理实际的存款，写入DB
   * @param {object} tokenId Token对象
   * @param {string} from 付款的外部以太坊钱包地址
   * @param {uid} depositor 存入用户的 UID
   * @param {number} amount 数额
   * @param {string} transactionHash 交易哈希
   */
  async handleDeposit(tokenId, from, depositor, amount, transactionHash) {
    const uidOfInAndOut = this.config.tokenInAndOut.specialAccount.uid;
    // Update DB
    const dbConnection = await this.app.mysql.beginTransaction();
    await this._syncTransfer(
        tokenId, uidOfInAndOut, depositor, amount, this.clientIP,
        consts.mineTokenTransferTypes.transfer, transactionHash, dbConnection,
        `Deposit from external wallet: ${from}`
    );
    await dbConnection.commit();
    return transactionHash;
  }
}

module.exports = ExternalDepositService;
