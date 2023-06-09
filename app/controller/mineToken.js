'use strict';
const consts = require('../service/consts');
const Controller = require('../core/base_controller');
const moment = require('moment');

class MineTokenController extends Controller {
  // 创建
  async create() {
    const ctx = this.ctx;
    const { name, symbol, decimals = 4, logo, brief, introduction, initialSupply, tags = [] } = this.ctx.request.body;
    // 编辑Fan票的时候限制简介字数不超过50字 后端也有字数限制
    if (brief && brief.length > 50) {
      ctx.body = ctx.msg.failure;
    } else if (!initialSupply) {
      ctx.body = ctx.msg.failure;
      ctx.body.message = '请填写初始发行额度';
    } else { // 好耶 字数没有超限
      let txHash;
      try {
        const { public_key } = await this.service.account.hosting.isHosting(ctx.user.id, 'ETH');
        txHash = await this.service.ethereum.fanPiao.issue(name, symbol, decimals, initialSupply, public_key);
      } catch (error) {
        this.logger.error('Create error: ', error);
        ctx.body = ctx.msg.failure;
        ctx.body.data = { error };
      }
      const result = await ctx.service.token.mineToken.create(ctx.user.id, name, symbol, initialSupply, decimals, logo, brief, introduction, txHash, tags); // decimals默认4位
      if (result === -1) {
        ctx.body = ctx.msg.tokenAlreadyCreated;
      } else if (result === -2) {
        ctx.body = ctx.msg.tokenSymbolDuplicated;
      } else if (result === -3) {
        ctx.body = ctx.msg.tokenNoCreatePermission;
      } else if (result === 0) {
        ctx.body = ctx.msg.failure;
      } else {
        ctx.body = {
          ...ctx.msg.success,
          data: result,
        };
      }
    }
  }
  // 管理后台调用方法
  async _create() {
    const { ctx } = this;

    const { uid, name, symbol, decimals = 4, logo, brief = '', introduction = '', initialSupply, tags = [] } = ctx.request.body;
    // 编辑Fan票的时候限制简介字数不超过50字 后端也有字数限制
    if (brief && brief.length > 50) {
      ctx.body = ctx.msg.failure;
    } else if (!initialSupply) {
      ctx.body = ctx.msg.failure;
      ctx.body.message = '请填写初始发行额度';
    } else { // 好耶 字数没有超限
      let txHash;
      try {
        const { public_key } = await this.service.account.hosting.isHosting(uid, 'ETH');
        txHash = await this.service.ethereum.fanPiao.issue(name, symbol, decimals, initialSupply, public_key);
      } catch (error) {
        this.logger.error('Create error: ', error);
        ctx.body = ctx.msg.failure;
        ctx.body.data = { error };
      }
      const result = await ctx.service.token.mineToken.create(uid, name, symbol, initialSupply, decimals, logo, brief, introduction, txHash, tags); // decimals默认4位
      if (result === -1) {
        ctx.body = ctx.msg.tokenAlreadyCreated;
      } else if (result === -2) {
        ctx.body = ctx.msg.tokenSymbolDuplicated;
      } else if (result === -3) {
        ctx.body = ctx.msg.tokenNoCreatePermission;
      } else if (result === 0) {
        ctx.body = ctx.msg.failure;
      } else {
        ctx.body = {
          ...ctx.msg.success,
          data: result,
        };
      }
    }
  }

  async update() {
    const ctx = this.ctx;
    const tokenId = parseInt(ctx.params.id);
    const { name, logo, brief, introduction, tags = [] } = ctx.request.body;

    // 编辑Fan票的时候限制简介字数不超过50字 后端也有字数限制
    if (brief && brief.length > 50) {
      ctx.body = ctx.msg.failure;
    } else { // 好耶 字数没有超限
      const result = await ctx.service.token.mineToken.update(ctx.user.id, tokenId, name, logo, brief, introduction, tags);
      if (result) {
        ctx.body = ctx.msg.success;
      } else {
        ctx.body = ctx.msg.failure;
      }
    }
  }

  async get() {
    const { ctx } = this;
    const id = ctx.params.id;

    const token = await ctx.service.token.mineToken.get(id);
    // Maybe should not do that, leave it 500 error.
    // if (!token || token === null) { return (ctx.body = { ...ctx.msg.tokenNotExist }); }

    let exchange = await ctx.service.token.exchange.detail(id);
    const tags = await ctx.service.token.mineToken.getTokenTags(id);
    const user = await ctx.service.user.get(token.uid);
    // const vol_24h = await ctx.service.token.exchange.volume_24hour(id);
    if (exchange) {
      const trans_24hour = await ctx.service.token.exchange.trans_24hour(id);
      exchange.volume_24h = parseFloat(trans_24hour.volume_24h.toFixed(4));
      exchange.change_24h = trans_24hour.change_24h;
      exchange.price = parseFloat((exchange.cny_reserve / exchange.token_reserve).toFixed(4));
      exchange.amount_24h = trans_24hour.amount_24h;
    }
    // 获取持仓人数数据
    exchange = { ...exchange }; // 这段代码是为了避免访问未赋值变量时报错
    exchange.number_of_holders = await ctx.service.token.exchange.getNumberOfHolders(id);
    exchange.number_of_liquidity_holders = await ctx.service.token.exchange.getNumberOfLiquidityHolders(id);

    ctx.body = {
      ...ctx.msg.success,
      data: {
        user,
        token,
        exchange,
        tags,
      },
    };
  }

  async saveResources() {
    const ctx = this.ctx;
    const tokenId = parseInt(ctx.params.id);
    const { websites, socials } = this.ctx.request.body;
    const result = await ctx.service.token.mineToken.saveResources(ctx.user.id, tokenId, websites, socials);
    if (result === 0) {
      ctx.body = ctx.msg.success;
    } else {
      ctx.body = ctx.msg.failure;
    }
  }

  async getResources() {
    const ctx = this.ctx;
    const tokenId = parseInt(ctx.params.id);
    const result = await ctx.service.token.mineToken.getResources(tokenId);
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }

  // 增发
  async mint() {
    const ctx = this.ctx;
    // amount 客户端*精度，10^decimals
    const { amount } = this.ctx.request.body;
    const result = await ctx.service.token.mineToken.mint(ctx.user.id, ctx.user.id, amount, this.clientIP);
    if (result === -1) {
      ctx.body = ctx.msg.failure;
    } else if (result === -2) {
      ctx.body = ctx.msg.tokenNotExist;
    } else if (result === -3) {
      ctx.body = ctx.msg.tokenCantMint;
    } else {
      ctx.body = ctx.msg.success;
    }
  }

  // 转账
  async transfer() {
    const ctx = this.ctx;
    const { tokenId, to, amount, memo = null } = this.ctx.request.body;
    // 记录转赠fan票常用候选列表
    await this.ctx.service.history.put('token', to);
    if (amount <= 0) {
      ctx.body = { ...ctx.msg.failure };
      ctx.status = 400;
      return;
    }
    // amount 客户端*精度，10^decimals
    const result = await ctx.service.token.mineToken.transferFrom(tokenId, ctx.user.id, to, amount, this.clientIP, consts.mineTokenTransferTypes.transfer, null, memo);
    if (result) {
      // 发送转账消息
      ctx.service.notify.event.sendEvent(ctx.user.id, [ to ], 'transfer', result.logId, 'tokenWallet');

      ctx.body = { ...ctx.msg.success, data: { tx_hash: result.txHash } };
    } else ctx.msg.failure;
  }
  async rewardArticle() {
    const ctx = this.ctx;
    const { tokenId, to, amount, memo = null } = ctx.request.body;
    const pid = ctx.params.id;
    if (amount <= 0) {
      ctx.body = { ...ctx.msg.failure };
      ctx.status = 400;
      return;
    }
    // 记录转赠fan票常用候选列表
    await this.ctx.service.history.put('token', to);
    // amount 客户端*精度，10^decimals
    const transferResult = await ctx.service.token.mineToken.transferFrom(tokenId, ctx.user.id, to, amount, this.clientIP, consts.mineTokenTransferTypes.reward_article, null, memo, pid);

    // start: 添加评论
    const userId = ctx.user.id;
    const username = ctx.user.username;
    const signId = pid;
    const comment = memo;
    const commentType = consts.commentTypes.reward;
    const refId = transferResult.logId;
    const commentResult = await ctx.service.comment.create(userId, username, signId, comment, commentType, refId);
    // end: 添加评论
    if (transferResult) {
      // 发送打赏文章消息
      ctx.service.notify.event.sendEvent(ctx.user.id, [ to ], 'transfer', signId, 'article', transferResult.logId);
      ctx.body = {
        ...ctx.msg.success,
        data: {
          ...transferResult,
          commentId: commentResult.insertId,
        },
      };
    } else ctx.msg.failure;

  }
  async getRewardArticle() {
    const ctx = this.ctx;
    const { page = 1, pagesize = 10 } = ctx.query;
    const pid = ctx.params.id;
    const type = consts.mineTokenTransferTypes.reward_article;

    const result = await ctx.service.token.mineToken.getRewardArticle(type, pid, parseInt(page), parseInt(pagesize));
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }

  // 用户需要针对特定 token 进行授权，我们的代理转账合约针对才能他的token进行批量转账
  async approveTokenToBatch() {
    const { ctx } = this;
    const { tokenId } = ctx.params;
    const [ token, fromWallet ] = await Promise.all([
      this.service.token.mineToken.get(tokenId),
      this.service.account.hosting.isHosting(ctx.user.id, 'ETH'),
    ]);
    const result = await this.service.ethereum.multisender.approveTheMax(
      token.contract_address, fromWallet.private_key,
      fromWallet.nonce
    );
    await this.service.account.hosting.setNonceWithoutConn(fromWallet);

    ctx.body = ctx.msg.success;
    ctx.body.data = { result };
  }

  async getBatchAllowance() {
    const { ctx } = this;
    const { tokenId } = ctx.params;
    const [ token, fromWallet ] = await Promise.all([
      this.service.token.mineToken.get(tokenId),
      this.service.account.hosting.isHosting(ctx.user.id, 'ETH'),
    ]);
    const result = await this.service.ethereum.multisender.getAllowance(
      token.contract_address, fromWallet.public_key
    );
    ctx.body = ctx.msg.success;
    ctx.body.data = { result };
  }

  // 批量转账
  async batchTransfer() {
    const ctx = this.ctx;
    const { tokenId } = ctx.params;
    const { targets, isGoodForTimeout } = ctx.request.body;
    const filteredTargets = targets.filter(i => i.to && i.amount);
    if (filteredTargets.length !== targets.length) {
      ctx.body = ctx.msg.failure;
      ctx.status = 400;
      ctx.body.data = {
        message: '`to` and `amount` field is missing, please check the data.',
      };
      return;
    }
    const limits = isGoodForTimeout ? 200 : 64;
    if (targets.length > limits) {
      ctx.body = ctx.msg.failure;
      ctx.status = 400;
      ctx.body.data = {
        message: 'too large, the length of targets should be below 64 if you are not dev.',
      };
      return;
    }
    try {
      const result = await ctx.service.token.mineToken.batchTransfer(tokenId, ctx.user.id, targets);
      ctx.body = {
        ...ctx.msg.success,
        data: { tx_hash: result },
      };
    } catch (error) {
      this.logger.error('Batch Transfer error: ', error);
      ctx.body = ctx.msg.failure;
      ctx.status = 400;
      ctx.body.data = { error };
    }

  }

  // 查询当前用户token余额
  async getBalance() {
    const { ctx } = this;
    const userId = ctx.user.id;
    const { tokenId } = ctx.query;
    const result = await ctx.service.token.mineToken.balanceOf(userId, tokenId);
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }

  async getRelated() {
    const { ctx } = this;
    const tokenId = parseInt(ctx.params.id);
    const { channel_id = 1, filter, sort, page, pagesize, onlyCreator } = ctx.query;

    let result;

    if (typeof onlyCreator === 'number' || typeof onlyCreator === 'string') {
      result = await ctx.service.token.mineToken.getRelatedWithOnlyCreator(tokenId, filter, sort, page, pagesize, Boolean(Number(onlyCreator)), channel_id);
    } else {
      result = await ctx.service.token.mineToken.getRelated(tokenId, filter, sort, page, pagesize);
    }

    if (result === false) {
      ctx.status = 400;
      ctx.body = ctx.msg.failure;
      return;
    }

    // 这部分是登录之后才会执行的查询
    if (ctx.user && ctx.user.id) {
      const { list: tokens } = await this.service.exchange.getTokenListByUser(ctx.user.id, 1, 65535);
      const purchasedPost = await this.service.shop.order.isBuyBySignIdArray(result.list.map(post => post.id), ctx.user.id);
      result.list.forEach(post => {
        // 是自己的文章？
        post.is_ownpost = post.uid === ctx.user.id;
        // 是否满足持币可见
        if (post.token_amount) {
          const token = tokens.find(token => token.token_id === post.token_id);
          post.token_unlock = !!token && token.amount >= post.token_amount;
        }
        // 是否买过这篇文章
        if (post.pay_price) {
          post.pay_unlock = !!purchasedPost.find(buy => buy.signid === post.id);
        }
      });
    }

    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }
  async getPriceHistory() {
    const { ctx } = this;
    const { tokenId } = ctx.query;
    const result = await ctx.service.token.exchange.getPriceHistory(tokenId);
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }
  async getLiquidityHistory() {
    const { ctx } = this;
    const id = ctx.params.id;
    const res = await ctx.service.token.exchange.getLiquidityHistory(id);
    let oldDate = '';
    const result = [];
    for (let i = res.length - 1; i >= 0; i--) {
      const dateText = moment(res[i].time).format('YYYY-MM-DD');
      if (dateText !== oldDate) {
        result.unshift(res[i]);
        result[0].time = dateText;
        oldDate = dateText;
      }
    }
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }

  async getAddSupplyChart() {
    const { ctx } = this;
    const id = ctx.params.id;
    const result = await ctx.service.token.mineToken.getAddSupplyChart(id);
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }

  async getIssuedHistory() {
    const { ctx } = this;
    const id = ctx.params.id;
    const result = await ctx.service.token.mineToken.getIssuedHistory(id);
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }

  async getAmountHistory() {
    const { ctx } = this;
    const id = ctx.params.id;
    const result = await ctx.service.token.mineToken.getAmountHistory(id);
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }

  async getVolumeHistory() {
    const { ctx } = this;
    const id = ctx.params.id;
    const result = await ctx.service.token.mineToken.getVolumeHistory(id);
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }

  async getIncomeHistory() {
    const { ctx } = this;
    const id = ctx.params.id;
    const result = await ctx.service.token.mineToken.getIncomeHistory(id);
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }

  async deposit() {
    const { ctx } = this;
    const { txHash } = ctx.request.body;

    try {
      // 拿到 receipt
      const receipt = await this.service.ethereum.web3.getTransactionReceipt(txHash);
      // 检查这个交易是不是失败交易，以防万一
      if (!receipt) {
        throw new Error("Didn't found this transaction on Rinkeby network. please check your hash.");
      }

      if (!receipt.status) {
        throw new Error('This is a reverted transaction, not a successful deposit.');
      }

      // 检查该 to 合约是不是我们DB列入的Fan票
      const token = await this.service.token.externalDeposit.getFanPiaoFromAddress(receipt.to);
      if (!token) {
        throw new Error('No such Token was found in our database, please check again is it Matataki FanPiao.');
      }

      // 检查这个交易是不是非 Transfer
      const event = this.service.token.externalDeposit.getTransferEvent(receipt.logs);
      if (!event) {
        throw new Error('This transaction seems not a FanPiao transfer, please check again.');
      }

      const { fromAddr, toAddr, amount } = this.service.token.externalDeposit.getDataFromTransferEvent(event);
      const to = await this.service.account.hosting.searchByPublicKey(toAddr);
      if (!to) {
        throw new Error('No such hosting account was found.');
      }

      if (to.uid !== ctx.user.id) {
        throw new Error('This is not your deposit, please switch to another account.');
      }

      // 检查这个交易是不是已经在数据库入账了
      const isTxNotExistInDB = await this.service.token.externalDeposit.isTxNotExistInDB(txHash);
      if (!isTxNotExistInDB) {
        throw new Error('This transaction is already in the database, please check your txHash and try again.');
      }
      await this.service.token.externalDeposit.handleDeposit(
        token.id,
        fromAddr,
        to.uid,
        amount,
        receipt.transactionHash
      );
      ctx.body = {
        ...ctx.msg.success,
        message: 'Deposit successfully',
        data: {
          tokenId: token.id,
          from: fromAddr,
          to: to.uid,
          amount,
          transactionHash: receipt.transactionHash,
        },
      };
    } catch (error) {
      ctx.body = ctx.msg.failure;
      ctx.status = 400;
      ctx.body.data = error;
      ctx.body.message = error.message;
    }
  }


  async withdraw() {
    const { ctx } = this;
    const tokenId = ctx.params.id;
    const { target, amount } = ctx.request.body;
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
    try {
      const txHash = await this.service.token.mineToken.withdraw(tokenId, ctx.user.id, target, amount);
      ctx.body = {
        ...ctx.msg.success,
        data: { txHash },
      };
    } catch (error) {
      this.logger.error('Error happened: ' + error);
      ctx.body = ctx.msg.failure;
      ctx.status = 400;
      ctx.body.data = { error };
    }
  }

  async getBindableTokenList() {
    const { ctx } = this;
    ctx.body = {
      ...ctx.msg.success,
      data: await this.service.token.mineToken.getBindableTokenList(ctx.user.id),
    };
  }
  async getMintDetail() {
    const { ctx } = this;
    const token = await this.service.token.mineToken.getByUserId(ctx.user.id);
    if (!token) {
      ctx.body = ctx.msg.tokenNotExist;
      return;
    }
    const detail = await this.service.token.mineToken.getMintDetail(token.id);
    if (detail.count === 0) {
      ctx.body = ctx.msg.tokenNotExist;
    } else {
      ctx.body = {
        ...ctx.msg.success,
        data: detail,
      };
    }
  }
}

module.exports = MineTokenController;
