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
    const { nextApi: bscCrosschainApi, maticCrosschainApi } = this.config;
    this.api = {
      bsc: axios.create({
        baseURL: bscCrosschainApi.endpoint,
        headers: {
          Authorization: `Bearer ${bscCrosschainApi.accessToken}`,
        },
      }),
      matic: axios.create({
        baseURL: maticCrosschainApi.endpoint,
        headers: {
          Authorization: `Bearer ${maticCrosschainApi.accessToken}`,
        },
      }),
    };
  }

  async _createPeggedToken(tokenName, tokenSymbol, decimals, tokenId, chain = 'bsc') {
    const { data } = await this.api[chain].post('/token/', {
      name: tokenName,
      symbol: tokenSymbol,
      decimals: parseInt(decimals),
      tokenId: parseInt(tokenId),
    });
    return data;
  }

  async getAddressFromNameAndSymbol(name, symbol, chain = 'bsc') {
    const { data } = await this.api[chain].get('/token/compute/', { data: {
      name, symbol,
    } });
    return data;
  }

  async getNewTokenByTxHash(txHash, chain = 'bsc') {
    const { data } = await this.api[chain].get('/token/getNewTokenByTxHash', { params: { txHash } });
    return data;
  }

  async getNewTokensIn(fromBlock, toBlock, chain = 'bsc') {
    const { data } = await this.api[chain].get('/token/getNewTokensIn', { params: { fromBlock, toBlock } });
    return data;
  }

  async getRecentNewTokens(chain = 'bsc') {
    const { data } = await this.api[chain].get('/token/getRecentNewTokens');
    return data;
  }

  /**
   * getNonceOf, 从Mint合约获得 Nonce
   * 只返回合约里最新一个可用的 nonce
   * @param {string} token 其他区块链的代币地址
   * @param {string} to 其他区块链的钱包地址
   * @param {string} chain 区块链，默认为 bsc
   */
  async getNonceOf(token, to, chain = 'bsc') {
    const { data } = await this.api[chain].get(`/token/${token}/noncesOf/${to}`);
    return data.data.nonce;
  }

  /**
   * getNonceOfFromDB, 从数据库获得 Nonce
   * 可以在没上传之前继续发行，但使用时需要先上传 Nonce 低的 Permit
   * @param {string} token 其他区块链的代币地址
   * @param {string} to 其他区块链的钱包地址
   * @param {string} chain 区块链，默认为 bsc
   */
  async getNonceOfFromDB(token, to, chain = 'bsc') {
    const result = await this.app.mysql.select('pegged_assets_permit', { where: { token, to, chain }, orders: [[ 'id', 'desc' ]] });
    if (result.length === 0) return 0;
    return result[0].nonce + 1;
  }

  /**
   * 获取我发行的 Permit
   * @param {number} uid 用户 UID
   */
  async getMyIssuedPermits(uid, chain = 'bsc') {
    const result = await this.app.mysql.select('pegged_assets_permit', { where: { forUid: uid, chain }, orders: [[ 'token', 'asc' ], [ 'to', 'desc' ], [ 'nonce', 'desc' ]] });
    return result.map(({
      id, token, to, value, nonce, deadline, r, s, v,
    }) => ({ id, token, to, value, nonce, deadline: Number(deadline), sig: { r, s, v } }));
  }

  async isPermitUsed(token, to, nonce, chain = 'bsc') {
    const { data } = await this.api[chain].get(`/token/${token}/isPermitUsed/${to}/${nonce}`);
    return data.data.isPermitUsed;
  }

  async issueMintPermit(token, to, value, nonce, chain = 'bsc') {
    const { data } = await this.api[chain].post(`/token/${token}/mint`, {
      to,
      value,
      nonce,
    });
    return data;
  }

  async updateUnusedMintPermit(token, to, value, nonce, chain = 'bsc') {
    if (isNaN(nonce)) throw new Error('Bad nonce parameter');
    // Check is this Permit was used or not
    const currentNonce = await this.getNonceOf(token, to, chain);
    if (currentNonce > Number(nonce)) {
      throw new Error('This deposit nonce was used. Please try another one.');
    }
    // Issue new permit
    return this.issueMintPermit(token, to, value, nonce, chain);
  }

  async renewUnusedMintPermit(permitId, forUid, chain = 'bsc') {
    const permit = await this.app.mysql.get('pegged_assets_permit', { id: permitId, forUid, chain });
    if (!permit) throw new Error(`Having problem to update Permit #${permitId}, please contact Matataki Support ASAP.`);
    // Blockchain related Check will be in `updateUnusedMintPermit`
    const newPermit = await this.updateUnusedMintPermit(
      permit.token,
      permit.to,
      permit.value,
      permit.nonce,
      chain
    );
    await this.app.mysql.update('pegged_assets_permit', {
      id: permit.id,
      deadline: newPermit.deadline,
      v: newPermit.sig.v,
      r: newPermit.sig.r,
      s: newPermit.sig.s,
    });
    return newPermit;
  }

  async burn(tokenAddress, to, amount, chain = 'bsc') {
    const { data } = await this.api[chain].post(`/token/${tokenAddress}/burn`, {
      to,
      value: amount,
    });
    return data;
  }

  async fetchDepositEventBy(contractAddress, uid, txHash, chain = 'bsc') {
    const { data } = await this.api[chain].get(`/token/${contractAddress}/event/burn/${uid}/${txHash}`);
    return data.data.event;
  }

  async listCrosschainToken(chain = 'bsc') {
    const tokens = await this.app.mysql.select('pegged_assets', { where: { chain }, orders: [[ 'id', 'desc' ]] });
    return tokens;
  }

  async listCrosschainTokenIds(chain = 'bsc') {
    const tokens = await this.listCrosschainToken(chain);
    const tokenIds = tokens.map(token => token.tokenId);
    return tokenIds;
  }

  async isCrosschainToken(tokenAddress) {
    const token = await this.app.mysql.get('pegged_assets', { contractAddress: tokenAddress });
    return token;
  }

  async findTokenById(tokenId) {
    const tokenOnBsc = await this.app.mysql.get('pegged_assets', { tokenId, chain: 'bsc' });
    const tokenOnMatic = await this.app.mysql.get('pegged_assets', { tokenId, chain: 'matic' });
    return { tokenOnBsc, tokenOnMatic };
  }

  async listMyDepositRequest(uid) {
    const depositsOf = await this.app.mysql.select(
      'pegged_assets_deposit',
      { where: { uid } }
    );
    return depositsOf;
  }

  async requestToDeposit(tokenId, uid, txHash, fromChain = 'bsc') {
    // 寻找跨链Fan票
    this.logger.info('requestToDeposit::tokenId', tokenId);
    const token = await this.app.mysql.get('pegged_assets', { tokenId, chain: fromChain });
    this.logger.info('requestToDeposit::token', token);
    if (!token) throw new Error('No such crosschain token.');

    // 查询这个存入有没有在数据库入账
    const isSameTxHashExist = await this.isDepositExistInDB(txHash);
    if (isSameTxHashExist) throw new Error('Tx existed already');

    this.logger.info('isSameTxHashExist', isSameTxHashExist);

    const data = await this.fetchDepositEventBy(token.contractAddress, uid, txHash, fromChain);
    this.logger.info('fetchDepositEventBy', data);

    // 防止冒用
    if (data.uid !== uid) throw new Error("You're not the one who to use deposit request");
    const { atBlock, confirmation, amount } = data;
    // 确认区块大于6就认可为正常
    const status = confirmation >= 6 ? EnumForPeggedAssetDeposit.BURN_EVENT_CONFIRMED : EnumForPeggedAssetDeposit.BURN_EVENT_CREATED;
    const obj = { uid: data.uid, fromChain, burnTx: txHash, value: amount, atBlock, status, tokenId, rinkebyHash: null };
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
    const data = await this.getTransactionsReceipt(theirTxHash, notConfirmedDeposit.fromChain);
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
    const depositFrom = confirmedDeposit.fromChain;
    let type;
    switch (depositFrom) {
      case 'bsc': {
        type = consts.mineTokenTransferTypes.crosschainBscTransferIn;
        break;
      }
      case 'matic': {
        type = consts.mineTokenTransferTypes.crosschainMaticTransferIn;
        break;
      }
    }
    const { txHash } = await this.service.token.mineToken.transferFrom(
      confirmedDeposit.tokenId, uidOfInAndOut, confirmedDeposit.uid, confirmedDeposit.value, this.clientIP,
      type, dbConnection, `Deposit from ${depositFrom}, ${depositFrom} tx hash is ${confirmedDeposit.burnTx}`);
    await dbConnection.commit();
    const transferedDeposit = { ...confirmedDeposit, status: EnumForPeggedAssetDeposit.RINKEBY_DEPOSIT_CREATED, rinkebyHash: txHash };
    await this.app.mysql.update('pegged_assets_deposit', transferedDeposit);
  }

  async getTransactionsReceipt(txHashes, chain = 'bsc') {
    const { data } = await this.api[chain].post('/blockchain/getTransactions', {
      txHashes,
    });
    return data.data;
  }
}

module.exports = CrossChainService;
