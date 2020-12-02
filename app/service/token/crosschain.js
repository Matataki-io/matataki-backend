'use strict';

const { EnumForPeggedAssetDeposit } = require('../../constant/Enums');

const Service = require('egg').Service;
const axios = require('axios').default;
const consts = require('../consts');

// const { IPeggedToken, IPeggedTokenFactory, IPeggedTokenMinter } = require('../ethers/interfaces');


// this equals to keccak256('Transfer(address,address,uint256)')
// which is the hash signature of ERC20 Transfer Event
// const TransferEventTopicHash = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
// const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';


class CrossChainService extends Service {
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
    const { endpoint, accessToken } = this.config.nextApi;
    this.api = axios.create({
      baseURL: endpoint,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  async _createPeggedTokenOnBsc(tokenName, tokenSymbol, decimals) {
    const { data } = await this.api.post('/token/', {
      name: tokenName,
      symbol: tokenSymbol,
      decimals: Number(decimals),
    });
    return data;
  }

  async getAddressFromNameAndSymbol(name, symbol) {
    const { data } = await this.api.get('/token/compute/', { data: {
      name, symbol,
    } });
    return data;
  }

  /**
   * getNonceOfFromDB, 从Mint合约获得 Nonce
   * 只返回最新一个可用的 nonce
   * @param {string} token 其他区块链的代币地址
   * @param {string} to 其他区块链的钱包地址
   */
  async getNonceOf(token, to) {
    const { data } = await this.api.get(`/token/${token}/noncesOf/${to}`);
    return data.data.nonce;
  }

  /**
   * getNonceOfFromDB, 从数据库获得 Nonce
   * 可以在没上传之前继续发行，但使用时需要先上传 Nonce 低的 Permit
   * @param {string} token 其他区块链的代币地址
   * @param {string} to 其他区块链的钱包地址
   */
  async getNonceOfFromDB(token, to) {
    const result = await this.app.mysql.select('pegged_assets_permit', { where: { token, to }, orders: [[ 'id', 'desc' ]] });
    if (result.length === 0) return 0;
    return result[0].nonce + 1;
  }

  /**
   * 获取我发行的 Permit
   * @param {number} uid 用户 UID
   */
  async getMyIssuedPermits(uid) {
    const result = await this.app.mysql.select('pegged_assets_permit', { where: { forUid: uid }, orders: [[ 'token', 'asc' ], [ 'to', 'desc' ], [ 'nonce', 'desc' ]] });
    return result.map(({
      token, to, value, nonce, deadline, r, s, v,
    }) => ({ token, to, value, nonce, deadline: Number(deadline), sig: { r, s, v } }));
  }

  async isPermitUsed(token, to, nonce) {
    const { data } = await this.api.get(`/token/${token}/isPermitUsed/${to}/${nonce}`);
    return data.data.isPermitUsed;
  }

  async issueMintPermit(token, to, value, nonce) {
    const { data } = await this.api.post(`/token/${token}/mint`, {
      to,
      value,
      nonce,
    });
    return data;
  }

  async burn(tokenAddress, to, amount) {
    const { data } = await this.api.post(`/token/${tokenAddress}/burn`, {
      to,
      value: amount,
    });
    return data;
  }

  async fetchDepositEventBy(contractAddress, uid, txHash) {
    const { data } = await this.api.get(`/token/${contractAddress}/event/burn/${uid}/${txHash}`);
    return data.data.event;
  }

  async listCrosschainTokens() {
    // 暂时只有 BSC
    const tokens = await this.app.mysql.select('pegged_assets', { where: { chain: 'bsc', orders: [[ 'id', 'desc' ]] } });
    return tokens;
  }

  async isCrosschainToken(tokenAddress) {
    const token = await this.app.mysql.get('pegged_assets', { contractAddress: tokenAddress });
    return token;
  }

  async listMyDepositRequest(uid) {
    const depositsOf = await this.app.mysql.select(
      'pegged_assets_deposit',
      { where: { uid } }
    );
    return depositsOf;
  }

  async requestToDeposit(tokenId, uid, txHash) {
    // 寻找跨链Fan票
    this.logger.info('requestToDeposit::tokenId', tokenId);
    const token = await this.app.mysql.get('pegged_assets', { tokenId });
    this.logger.info('requestToDeposit::token', token);
    if (!token) throw new Error('No such crosschain token.');

    // 查询这个存入有没有在数据库入账
    const isSameTxHashExist = await this.isDepositExistInDB(txHash);
    if (isSameTxHashExist) throw new Error('Tx existed already');

    this.logger.info('isSameTxHashExist', isSameTxHashExist);

    const data = await this.fetchDepositEventBy(token.contractAddress, uid, txHash);
    this.logger.info('fetchDepositEventBy', data);

    // 防止冒用
    if (data.uid !== uid) throw new Error("You're the one who spend deposit request");
    const { atBlock, confirmation, amount } = data;
    // 确认区块大于6就认可为正常
    const status = confirmation >= 6 ? EnumForPeggedAssetDeposit.BURN_EVENT_CONFIRMED : EnumForPeggedAssetDeposit.BURN_EVENT_CREATED;
    const obj = { uid: data.uid, fromChain: 'bsc', burnTx: txHash, value: amount, atBlock, status, tokenId, rinkebyHash: null }
    await this.app.mysql.insert(
      'pegged_assets_deposit',
      // 以防万一
      obj
    );
    return obj;
  }

  async checkNotConfirmedDeposit() {
    const notConfirmedDeposit = await this.app.mysql.select(
      'pegged_assets_deposit',
      { where: { status: EnumForPeggedAssetDeposit.BURN_EVENT_CREATED } }
    );
    // Stop if null
    if (!notConfirmedDeposit || notConfirmedDeposit.length === 0) return;

    const theirTxHash = notConfirmedDeposit.map(tx => tx.burnTx);
    const data = await this.getBscTransactionsReceipt(theirTxHash);
    this.logger.info('getBscTransactionsReceipt', data);
    const filteredTxs = data.filter(e => e !== null && e.confirmations >= 6);
    this.logger.info('filteredTxs', filteredTxs);
    const goodTxs = filteredTxs.map(e => e.transactionHash);
    const rowsToUpdate = notConfirmedDeposit.filter(r => goodTxs.indexOf(r.burnTx) > -1);
    const updatedRows = rowsToUpdate.map(r => ({ ...r, status: EnumForPeggedAssetDeposit.BURN_EVENT_CONFIRMED }));

    if (updatedRows.length === 0) return; // stop
    this.logger.info(updatedRows);
    await this.app.mysql.updateRows('pegged_assets_deposit', updatedRows);
  }

  async isDepositExistInDB(txHash) {
    const isSameTxHashExist = await this.app.mysql.get('pegged_assets_deposit', { burnTx: txHash });
    return Boolean(isSameTxHashExist);
  }

  async handleConfirmed() {
    const confirmedDeposit = await this.app.mysql.get(
      'pegged_assets_deposit',
      { status: EnumForPeggedAssetDeposit.BURN_EVENT_CONFIRMED }
    );
    // Do the transfer logic here
    const uidOfInAndOut = this.config.tokenInAndOut.specialAccount.uid;
    const dbConnection = await this.app.mysql.beginTransaction();
    const { txHash } = await this.service.token.mineToken.transferFrom(
      confirmedDeposit.tokenId, uidOfInAndOut, confirmedDeposit.uid, confirmedDeposit.value, this.clientIP,
      consts.mineTokenTransferTypes.crosschainBscTransferIn, dbConnection, `Deposit from BSC, bsc tx hash is ${confirmedDeposit.burnTx}`);
    await dbConnection.commit();
    const transferedDeposit = { ...confirmedDeposit, status: EnumForPeggedAssetDeposit.RINKEBY_DEPOSIT_CREATED, rinkebyHash: txHash };
    await this.app.mysql.update('pegged_assets_deposit', transferedDeposit);
  }

  async getBscTransactionsReceipt(txHashes) {
    const { data } = await this.api.post('/blockchain/getTransactions', {
      txHashes,
    });
    return data.data;
  }
}

module.exports = CrossChainService;
