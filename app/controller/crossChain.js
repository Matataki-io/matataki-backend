'use strict';

const Controller = require('../core/base_controller');
const Web3 = require('web3');
const { convertArray } = require('../utils/index');

class CrossChainController extends Controller {
  // async createPeggedTokenForAdminById() {
  //   // 无任何检测，仅限工程师，请设置好接口的权限！！！
  //   const { ctx } = this;
  //   const { id, chain } = ctx.params;
  //   if (chain !== 'bsc' && chain !== 'matic') {
  //     ctx.body = ctx.msg.failure;
  //     ctx.status = 400;
  //     ctx.body.message = `Not supported chain '${chain}'`;
  //     return;
  //   }
  //   const token = await this.service.token.mineToken.get(id);
  //   if (!token) {
  //     ctx.body = ctx.msg.failure;
  //     ctx.status = 400;
  //     ctx.body.message = 'Token not exist';
  //     return;
  //   }
  //   const { name, symbol, decimals } = token;
  //   const result = await this.service.token.crosschain._createPeggedToken(name, symbol, Number(decimals), chain);
  //   if (result.statusCode !== 201) {
  //     ctx.body = ctx.msg.failure;
  //     ctx.body.data = { error: 'Something bad happened, please contact Matataki Team ASAP.' };
  //   }
  //
  //   ctx.body = ctx.msg.success;
  //   ctx.body.data = result.data.hash;
  // }


  async withdrawToOtherChain() {
    const { ctx } = this;
    const { id: tokenId } = ctx.params;
    const { target, amount, chain = 'bsc' } = ctx.request.body;
    if (chain !== 'bsc' && chain !== 'matic') {
      ctx.body = ctx.msg.failure;
      ctx.status = 400;
      ctx.body.message = `Not supported chain '${chain}'`;
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      ctx.body = ctx.msg.failure;
      ctx.status = 400;
      ctx.body.message = 'Use legit amount';
      return;
    }
    if (target.slice(0, 2) !== '0x' || target.length !== 42) {
      ctx.body = ctx.msg.failure;
      ctx.status = 400;
      ctx.body.message = 'Use legit ethereum address';
      return;
    }
    const currentBalance = Number(await ctx.service.token.mineToken.balanceOf(ctx.user.id, tokenId));
    if (currentBalance < amount) {
      ctx.body = ctx.msg.failure;
      ctx.status = 400;
      ctx.body.message = "You don't have so much token to do that, please check and try again.";
      return;
    }

    const token = await this.service.token.mineToken.get(tokenId);
    if (!token) {
      ctx.body = ctx.msg.failure;
      ctx.status = 400;
      ctx.body.message = 'Token not exist';
      return;
    }
    const { data } = await this.service.token.crosschain.getAddressFromNameAndSymbol(token.name, token.symbol, chain);
    if (!data.isTokenDeployed) {
      ctx.body = ctx.msg.failure;
      ctx.status = 400;
      ctx.body.message = 'Pegged Token was not deployed.';
      return;
    }
    try {
      const permit = await this.service.token.mineToken.withdrawToOtherChain(tokenId, ctx.user.id, target, amount, data.addressLookUpBySymbol, chain);
      ctx.body = {
        ...ctx.msg.success,
        data: { permit },
      };
    } catch (error) {
      ctx.body = ctx.msg.failure;
      ctx.status = 400;
      ctx.body.data = { error };
    }
  }

  async listMyDepositRequest() {
    const { ctx } = this;
    if (!ctx.user.id) {
      ctx.body = ctx.msg.failure;
      ctx.status = 400;
      ctx.error.message = 'You need to login';
    }
    const deposits = await this.service.token.crosschain.listMyDepositRequest(ctx.user.id);
    ctx.body = {
      ...ctx.msg.success,
      data: { deposits },
    };
  }

  async appendCrosschainTokenByTxHash() {
    const { ctx } = this;
    const { chain, txHash } = ctx.query;
    try {
      const { data } = await this.service.token.crosschain.getNewTokenByTxHash(txHash, chain);
      const isCrossInDB = await this.app.mysql.get('pegged_assets', { contractAddress: data.token });
      if (isCrossInDB) {
        throw new Error('Crosschain Token already in the DB');
      }

      const token = await this.app.mysql.get('minetokens', { symbol: data.symbol });
      if (!token) {
        throw new Error('No such token');
      }
      await this.app.mysql.insert('pegged_assets',
        { chain, tokenId: token.id, contractAddress: data.token }
      );

      ctx.body = {
        ...ctx.msg.success,
        data,
      };
    } catch (error) {
      ctx.status = 400;
      ctx.body = ctx.msg.failure;
      return;
    }
  }

  async requestCreationPermit() {
    const { ctx } = this;
    const tokenId = parseInt(ctx.params.id);
    const { chain = 'bsc' } = ctx.query;
    const token = await this.service.token.mineToken.get(tokenId);
    if (!token) {
      ctx.status = 400;
      ctx.body = ctx.msg.failure;
      ctx.body.message = 'Token not exist';
      return;
    }
    // emmm, 好像创建跨链Fan票的许可公开给任何人也没问题，反正谁来 deploy 都一样 -- Frank
    // 如果签名损毁（篡改数据），会影响算出来的公钥，合约已经限制了只允许指定钱包签署的签名
    // 而一创建，签名就会被公开于区块链中，所以反正都是被公开的，只是时间问题（除非你不创建）
    // 创建跨链Fan票本身不影响安全性，因为创建者是 Factory 而不是用户（用户只上传了我们的签名）

    // if (token.uid !== ctx.user.id) {
    //   ctx.body = ctx.msg.failure;
    //   ctx.body.message = 'You are not the owner';
    //   return;
    // }

    try {
      const permitOfCreation = await this.service.token.crosschain._createPeggedToken(token.name, token.symbol, 4, token.id, chain);
      ctx.body = {
        ...ctx.msg.success,
        data: {
          ...permitOfCreation,
        },
      };
    } catch (error) {
      ctx.status = 400;
      ctx.body = ctx.msg.failure;
      if (error.response && error.response.data.message) {
        ctx.body.message = error.response.data.message;
      } else {
        ctx.body.message = 'Unknown error';
      }
    }

  }

  async depositFromOtherChain() {
    const { ctx } = this;
    const tokenId = ctx.params.id;
    const { txHash, chain } = ctx.request.body;
    const isSupportedChain = chain === 'bsc' || chain === 'matic';
    if (!isSupportedChain) throw new Error('Unsupported Chain. Please contact Matataki Support.');
    try {
      // 检查是不是合法 Token
      const token = await this.service.token.mineToken.get(tokenId);
      if (!token) throw new Error('No Such token found in the database. Please contact Matataki Support.');

      // 拿到 receipt
      const [ receipt ] = await this.service.token.crosschain.getTransactionsReceipt([ txHash ], chain);
      // 检查这个交易是不是失败交易，以防万一
      if (!receipt) {
        throw new Error(`Didn't found this transaction on ${chain} network. please check your hash.`);
      }

      if (receipt.status !== 1) {
        throw new Error('This is a reverted transaction, not a successful deposit.');
      }

      // 检查这个交易是不是已经在数据库入账了
      const isDepositExistInDB = await this.service.token.crosschain.isDepositExistInDB(txHash);
      if (isDepositExistInDB) {
        throw new Error('This transaction is already in the database, please check your txHash and try again.');
      }
      const result = await this.service.token.crosschain.requestToDeposit(token.id, ctx.user.id, txHash, chain);
      ctx.body = {
        ...ctx.msg.success,
        message: `Deposit from ${chain} OK`,
        data: {
          tokenId: token.id,
          amount: result.value,
          transactionHash: txHash,
        },
      };
    } catch (error) {
      ctx.body = ctx.msg.failure;
      ctx.status = 400;
      ctx.body.data = error;
      ctx.body.message = error.message;
    }
  }


  async getMyIssuedPermit() {
    const { ctx } = this;
    const { chain = 'bsc' } = ctx.query;
    const permits = await this.service.token.crosschain.getMyIssuedPermits(ctx.user.id, chain);
    ctx.body = {
      ...ctx.msg.success,
      data: { permits },
    };
  }

  async signMintPermit() {
    // 无任何检测，仅限工程师，请设置好接口的权限！！！
    const { ctx } = this;
    const { token, to, value } = ctx.request.body;
    const latestNonce = await this.service.token.crosschain.getNonceOf(token, to);
    const result = await this.service.token.crosschain.issueMintPermit(token, to, value, latestNonce);
    ctx.body = ctx.msg.success;
    ctx.body.data = result;
  }

  async getMintPermitNonceOf() {
    const { ctx } = this;
    const { tokenOnBsc, walletOnBsc } = ctx.params;
    const result = await this.service.token.crosschain.getNonceOf(tokenOnBsc, walletOnBsc);

    ctx.body = ctx.msg.success;
    ctx.body.data = { nonce: result, token: tokenOnBsc, forWho: walletOnBsc };
  }

  async getBscAddress() {
    const { ctx } = this;
    const tokenId = ctx.params.id;
    const token = await this.service.token.mineToken.get(tokenId);
    if (!token) {
      ctx.body = ctx.msg.failure;
      ctx.status = 400;
      ctx.body.message = 'Token not exist';
      return;
    }
    const tokenAddress = await this.service.token.crosschain.getAddressFromNameAndSymbol(token.name, token.symbol);
    ctx.body = {
      ...ctx.msg.success,
      data: tokenAddress.data,
    };
  }

  async isPermitUsed() {
    const { ctx } = this;
    const { tokenOnBsc, walletOnBsc, nonce } = ctx.params;
    const result = await this.service.token.crosschain.isPermitUsed(tokenOnBsc, walletOnBsc, nonce);

    ctx.body = ctx.msg.success;
    ctx.body.data = { isPermitUsed: result, nonce, token: tokenOnBsc, forWho: walletOnBsc };
  }

  async getCrosschainTokenList() {
    const { ctx } = this;
    const { chain = 'bsc' } = ctx.query;

    try {
      const _crossedTokens = await this.service.token.crosschain.listCrosschainToken(chain);
      const tokenIds = _crossedTokens.map(token => token.tokenId);

      this.logger.info('tokenIds', tokenIds);


      // const tokens = await this.app.mysql.select('minetokens', { where: { id: tokenIds } });
      let sql = '';
      tokenIds.forEach(i => {
        sql += `SELECT m.id, m.uid, m.\`name\`, m.symbol, m.decimals, m.total_supply, m.create_time, m.\`status\`, m.logo, m.brief, m.introduction, m.contract_address,
                u.username, u.nickname, u.avatar
                FROM minetokens m LEFT JOIN users u ON m.uid = u.id
                WHERE m.id = ${i};`;
      });
      const tokensResult = await this.app.mysql.query(sql);
      const tokens = convertArray(tokensResult);

      this.logger.info('tokens', tokens);

      const result = tokens.map((tokenInfo, idx) => {
        const { contractAddress } = _crossedTokens[idx];
        return { ...tokenInfo, crossTokenAddress: contractAddress };
      });

      ctx.body = {
        ...ctx.msg.success,
        data: {
          chain,
          count: result.length,
          list: result,
        },
      };
    } catch (e) {
      this.logger.error('e', e);
      ctx.body = ctx.msg.failure;
      ctx.body.message = e.message;
    }
  }

  async getMyCrosschainTokenList() {
    const { ctx } = this;
    const { pagesize = 10, page = 1, order = 0, search = '', chain = 'bsc' } = ctx.query;
    // 用户id
    const user_id = ctx.user.id;
    // token list
    const original_result = await this.service.exchange.getTokenListByUser(user_id, parseInt(page), parseInt(pagesize), parseInt(order), search);

    const tokens = await this.service.token.crosschain.listCrosschainToken(chain);
    const tokenIds = tokens.map(token => token.tokenId);
    const filteredTokens = original_result.list.filter(token => tokenIds.indexOf(token.token_id) > -1);

    ctx.body = {
      ...ctx.msg.success,
      data: {
        count: filteredTokens.length,
        list: filteredTokens,
      },
      tokenIds,
    };
  }

  async renewMyWithdrawPermit() {
    const { ctx } = this;
    const { id } = ctx.params;

    try {
      const newPermit = await this.service.token.crosschain.renewUnusedMintPermit(id, ctx.user.id);
      ctx.body = ctx.msg.success;
      ctx.body.data = { newPermit };
    } catch (error) {
      ctx.body = ctx.msg.failure;
      ctx.body.message = error.message;
      ctx.status = 400;
    }
  }

  async isCrosschainToken() {
    const { ctx } = this;
    const { tokenAddress } = ctx.params;
    try {
      const checksumedAddress = Web3.utils.toChecksumAddress(tokenAddress);
      const isCrossChainToken = await this.service.token.crosschain.isCrosschainToken(checksumedAddress);
      ctx.body = ctx.msg.success;
      ctx.body.data = { token: isCrossChainToken };
    } catch (error) {
      ctx.body = ctx.msg.failure;
      ctx.status = 404;
    }
  }
}

module.exports = CrossChainController;
