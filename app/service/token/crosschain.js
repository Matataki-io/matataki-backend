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

  async isPeggedTokenExistOnBsc(name, symbol) {
    const { data } = await this.api.post(`/token/compute/${name}/${symbol}`);
    return data;
  }

  async issueMintPermit(token, to, value) {
    const { data } = await this.api.post(`/token/${token}/issue`, {
      to,
      value,
    });
    return data;
  }

  // async burn(tokenAddress, to, amount) {
  //   const token = PeggedToken.attach(tokenAddress).connect(this.nonceManager);
  //   const receipt = await token.burn(to, amount);
  //   this.logger.info('receipt: ', receipt);
  // }
}

module.exports = CrossChainService;
