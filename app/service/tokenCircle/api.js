'use strict';

const Service = require('egg').Service;
/**
 * In order to gain the TypeScript typings
 * (for intellisense / autocomplete) while
 * using CommonJS imports with require()
 * use the following approach:
 */
const axios = require('axios').default;

class TokenCircleApiService extends Service {
  constructor(ctx, app) {
    super(ctx, app);
    const { baseURL, bearerToken } = this.config.tokenCircleBackend;
    this.client = axios.create({
      baseURL,
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    });
  }

  /**
   * 添加 tokenId 到 token 合约地址的映射（在机器人饭票circle的后端里）
   * 未来如果要API扩充数据，可能改为 addTokenProfile
   * @param {number|string} tokenId Matataki Hosting Token(FanPiao) ID
   * @param {string} name 代币名
   * @param {string} symbol 代币符号
   * @param {number} issuer 发行者UID
   * @param {number} contractAddress 合约地址
   */
  addTokenProfile(tokenId, name, symbol, issuer, contractAddress) {
    return this.client.put(`/token/${tokenId}`, {
      name, symbol, issuer, contractAddress,
    });
  }

  /**
   * 添加 userId 到 托管钱包地址的映射（在机器人饭票circle的后端里）
   * 未来如果要API扩充数据，可能改为 addUserProfile
   * @param {number|string} uid Matataki User / Wallet Hosting ID
   * @param {string} name Matataki 用户名
   * @param {string} address ethereum address of the user wallet
   */
  addUserProfile(uid, name, address) {
    return this.client.put(`/user/${uid}`, {
      name,
      walletAddress: address,
    });
  }

  /**
   * 更新部分数据
   * 未来如果要API扩充数据，可能改为 addUserProfile
   * @param {number|string} uid Matataki User / Wallet Hosting ID
   * @param {object} partialPayload object 对象，需要包含更新的字段
   */
  updateUser(uid, partialPayload) {
    return this.client.patch(`/user/${uid}`, partialPayload);
  }

  addTelegramUid(uid, telegramUid) {
    return this.client.put(`/user/${uid}/telegramUid`, { telegramUid });
  }

  deleteTelegramUid(uid) {
    return this.client.delete(`/user/${uid}/telegramUid`);
  }

  /**
   * setTokenContract
   * @param {number} tokenId ID of Matataki Token
   * @param {string} contractAddress Ethereum Contract address of the token
   */
  setTokenContract(tokenId, contractAddress) {
    return this.client.put(`/token/${tokenId}/contractAddress`, { contractAddress });
  }

  getTelegramUsername(uid) {
    return this.client.get(`/mapping/userToTelegramUsername/${uid}`);
  }
}

module.exports = TokenCircleApiService;
