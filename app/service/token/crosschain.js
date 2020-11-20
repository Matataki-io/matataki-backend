'use strict';
const Service = require('egg').Service;
const axios = require('axios').default;
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
}

module.exports = CrossChainService;
