'use strict';

const Controller = require('../core/base_controller');

class TokenController extends Controller {

  // 持仓详情
  async balances() {
    const ctx = this.ctx;
    const { pagesize = 10, page = 1, sort = 'amount-desc' } = this.ctx.query;
    const tokenId = parseInt(ctx.params.id);
    // token list
    const result = await ctx.service.exchange.getUserListByToken(tokenId, parseInt(page), parseInt(pagesize), sort);
    if (result === false) {
      ctx.status = 400;
      ctx.body = ctx.msg.paramsError;
      return;
    }

    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }

  // 流水明细
  async transactions() {
    const { ctx } = this;
    const { pagesize = 10, page = 1 } = ctx.query;
    const tokenId = parseInt(ctx.params.id);
    const result = await ctx.service.token.mineToken.getTokenLogs(tokenId, parseInt(page), parseInt(pagesize));
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }

  // 查询当前用户持仓token list
  async tokenList() {
    const ctx = this.ctx;
    const { pagesize = 10, page = 1, order = 0, search = '' } = this.ctx.query;
    // 用户id
    const user_id = ctx.user.id;
    // token list
    const result = await ctx.service.exchange.getTokenListByUser(user_id, parseInt(page), parseInt(pagesize), parseInt(order), search);
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }

  // 查询当前用户发行的token持仓用户list
  async userList() {
    const ctx = this.ctx;
    const { pagesize = 10, page = 1 } = this.ctx.query;
    // user id
    const user_id = ctx.user.id;
    // 根据user_id查找用户发行的token
    const token = await ctx.service.token.mineToken.getByUserId(user_id);
    const token_id = token.id;
    // token list
    const result = await ctx.service.exchange.getUserListByToken(token_id, parseInt(page), parseInt(pagesize));
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }

  // 查询某用户发行的token
  async getByUserId() {
    const { ctx } = this;
    const id = ctx.params.id;
    const tokenDetail = await ctx.service.token.mineToken.getByUserId(id);
    ctx.body = {
      ...ctx.msg.success,
      data: tokenDetail,
    };
  }

  // 查询该symbol对应的token
  async getBySymbol() {
    const { ctx } = this;
    const { symbol } = ctx.params;
    const tokenDetail = await ctx.service.token.mineToken.getBySymbol(symbol);
    if (!tokenDetail) {
      ctx.status = 400;
      ctx.body = {
        ...ctx.msg.failure,
      };
      return;
    }
    ctx.body = {
      ...ctx.msg.success,
      data: tokenDetail,
    };
  }

  // 查询当前用户发行的token详情
  async minetokenDetail() {
    const ctx = this.ctx;
    // user id
    const user_id = ctx.user.id;
    // 根据user_id查找用户发行的token
    const token = await ctx.service.token.mineToken.getByUserId(user_id);
    let exchange = null;
    let tags = [];
    if (token) {
      const balance = await ctx.service.token.mineToken.balanceOf(user_id, token.id);
      token.balance = balance;
      exchange = await ctx.service.token.exchange.detail(token.id);
      tags = await ctx.service.token.mineToken.getTokenTags(token.id);
    }
    ctx.body = {
      ...ctx.msg.success,
      data:
      {
        token,
        exchange,
        tags,
      },
    };
  }

  // 粉丝币分页列表
  async allToken() {
    const ctx = this.ctx;
    const { pagesize = 10, page = 1, search = '', sort = 'general' } = this.ctx.query;
    const result = await ctx.service.exchange.getAllToken(parseInt(page), parseInt(pagesize), search, sort);
    if (result === false) {
      ctx.status = 400;
      ctx.body = ctx.msg.paramsError;
    }

    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }
  async getTokenBySymbol() {
    const { ctx } = this;
    const { symbol } = ctx.query;
    const result = await ctx.service.exchange.getTokenBySymbol(symbol);
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }
  // 我发行的粉丝币-流水详情
  async userTokenFlow() {
    const { ctx } = this;
    const { pagesize = 10, page = 1 } = ctx.query;
    // user id
    const user_id = ctx.user.id;
    // 根据user_id查找用户发行的token
    const token = await ctx.service.token.mineToken.getByUserId(user_id);
    if (token === null) {
      ctx.body = {
        ...ctx.msg.success,
        data: {},
      };
      return;
    }
    const token_id = token.id;
    const result = await ctx.service.exchange.getFlowDetail(token_id, parseInt(page), parseInt(pagesize));
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }
  // 我持有的粉丝币-流水明细
  async tokenFlow() {
    const { ctx } = this;
    const { tokenId, pagesize = 10, page = 1 } = ctx.query;
    // user id
    const user_id = ctx.user.id;
    const result = await ctx.service.exchange.getUserFlowDetail(user_id, tokenId, parseInt(page), parseInt(pagesize));
    const tokenDetail = await ctx.service.token.mineToken.get(tokenId);
    const userDetail = await ctx.service.user.get(tokenDetail.uid);
    ctx.body = {
      ...ctx.msg.success,
      data: {
        ...result,
        tokenDetail,
        userDetail,
      },
    };
  }

  // 查看当前用户发行的token的日志
  async getTokenLogs() {
    const { ctx } = this;
    const { pagesize = 10, page = 1 } = ctx.query;

    // 根据user_id查找用户发行的token
    const token = await ctx.service.token.mineToken.getByUserId(ctx.user.id);
    if (!token) {
      ctx.body = ctx.msg.tokenNotExist;
      return;
    }

    const result = await ctx.service.token.mineToken.getTokenLogs(token.id, parseInt(page), parseInt(pagesize));
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }

  // 查看当前用户的token日志
  async getUserLogs() {
    const { ctx } = this;
    const { tokenId, pagesize = 10, page = 1 } = ctx.query;
    const tokenDetail = await ctx.service.token.mineToken.get(tokenId);
    const userDetail = await ctx.service.user.get(tokenDetail.uid);
    const result = await ctx.service.token.mineToken.getUserLogs(tokenId, ctx.user.id, parseInt(page), parseInt(pagesize));
    ctx.body = {
      ...ctx.msg.success,
      data: {
        ...result,
        tokenDetail,
        userDetail,
      },
    };
  }
  // 根据用户查看所有的token转账日志
  async getAllTokenLogsByUser() {
    const { ctx } = this;
    const { pagesize = 10, page = 1, type = null } = ctx.query;
    const result = await ctx.service.token.mineToken.getAllTokenLogsByUser(ctx.user.id, parseInt(page), parseInt(pagesize), type || null);
    ctx.body = {
      ...ctx.msg.success,
      data: {
        ...result,
      },
    };
  }

  // 持有的流动金list
  async getHoldLiquidity() {
    const { ctx } = this;
    const { pagesize = 10, page = 1, order = 0 } = ctx.query;
    const userId = ctx.user.id;
    const result = await ctx.service.token.mineToken.getHoldLiquidity(userId, parseInt(page), parseInt(pagesize), parseInt(order));
    ctx.body = {
      ...ctx.msg.success,
      data: {
        ...result,
      },
    };
  }

  // 持有的流动金详情
  async getMyLiquidityLogs() {
    const { ctx } = this;
    const { tokenId, pagesize = 10, page = 1 } = ctx.query;
    const userId = ctx.user.id;
    const tokenDetail = await ctx.service.token.mineToken.get(tokenId);
    const userDetail = await ctx.service.user.get(tokenDetail.uid);
    const result = await ctx.service.token.mineToken.getLiquidityLogs(tokenId, userId, parseInt(page), parseInt(pagesize));
    ctx.body = {
      ...ctx.msg.success,
      data: {
        ...result,
        tokenDetail,
        userDetail,
      },
    };
  }
  // 流动金日志
  async getLiquidityLogs() {
    const { ctx } = this;
    const { tokenId, pagesize = 100, page = 1 } = ctx.query;
    const result = await ctx.service.token.mineToken.getLiquidityLogs(tokenId, null, parseInt(page), parseInt(pagesize));
    ctx.body = {
      ...ctx.msg.success,
      data: {
        ...result,
      },
    };
  }
  // 根据用户获取他所有的流动金日志
  async getLiquidityLogsByUser() {
    const { ctx } = this;
    const { pagesize = 100, page = 1, type = null } = ctx.query;
    const userId = ctx.user.id;
    const result = await ctx.service.token.mineToken.getLiquidityLogsByUser(userId, type, parseInt(page), parseInt(pagesize));
    if (result === -1) {
      ctx.body = ctx.msg.paramsError;
      return;
    }
    ctx.body = {
      ...ctx.msg.success,
      data: {
        ...result,
      },
    };
  }
  // 全部
  async getPurchaseLog() {
    const { ctx } = this;
    const { tokenId, pagesize = 100, page = 1 } = ctx.query;
    const result = await ctx.service.token.mineToken.getPurchaseLog(tokenId, null, parseInt(page), parseInt(pagesize));
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }
  // 我的
  async getMyPurchaseLog() {
    const { ctx } = this;
    const { tokenId, pagesize = 100, page = 1 } = ctx.query;
    const userId = ctx.user.id;
    const result = await ctx.service.token.mineToken.getPurchaseLog(tokenId, userId, parseInt(page), parseInt(pagesize));
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }

  // 流动金持仓用户列表
  async getLiquidityBalances() {
    const { ctx } = this;
    const { pagesize = 10, page = 1, sort = 'amount-desc' } = ctx.query;
    const tokenId = parseInt(ctx.params.id);
    const result = await ctx.service.token.mineToken.getLiquidityBalances(tokenId, parseInt(page), parseInt(pagesize), sort);
    if (result === false) {
      ctx.status = 400;
      ctx.body = ctx.msg.paramsError;
      return;
    }

    ctx.body = {
      ...ctx.msg.success,
      data: {
        ...result,
      },
    };
  }

  // 流动金流水列表
  async getLiquidityTransactions() {
    const { ctx } = this;
    const { pagesize = 10, page = 1 } = ctx.query;
    const tokenId = parseInt(ctx.params.id);
    const result = await ctx.service.token.mineToken.getLiquidityTransactions(tokenId, parseInt(page), parseInt(pagesize));
    ctx.body = {
      ...ctx.msg.success,
      data: {
        ...result,
      },
    };
  }

  /** 添加协作者 */
  async setCollaborator() {
    const { ctx } = this;
    const userId = parseInt(ctx.params.id);
    const token = await ctx.service.token.mineToken.getByUserId(ctx.user.id);
    // Fan票不存在
    if (!token) {
      ctx.body = ctx.msg.tokenNotExist;
      return;
    }
    if (token.uid === userId) {
      ctx.body = ctx.msg.cannotAddFounder;
      return;
    }
    const collaborators = await this.service.token.mineToken.getCollaborators(token.id);
    // 协作者人数已满
    if (collaborators.length >= 20) {
      ctx.body = ctx.msg.notEnoughPlaces;
      return;
    }
    // 该协作者已被添加
    if (collaborators.find(col => col.user_id === userId)) {
      ctx.body = ctx.msg.accountBinded;
      return;
    }
    const result = await this.service.token.mineToken.setCollaborator(token.id, userId);
    // 发送消息，告知用户自己被添加为协作者
    if (result.affectedRows === 1) this.service.notify.event.sendEvent(ctx.user.id, [ userId ], 'annouce', userId, 'collaborator', token.id);

    ctx.body = result.affectedRows === 1 ? ctx.msg.success : ctx.msg.failure;
  }

  /** 删除协作者 */
  async deleteCollaborator() {
    const { ctx } = this;
    const userId = parseInt(ctx.params.id);
    const token = await ctx.service.token.mineToken.getByUserId(ctx.user.id);
    // Fan票不存在
    if (!token) {
      ctx.body = ctx.msg.tokenNotExist;
      return;
    }
    const result = await this.service.token.mineToken.deleteCollaborator(token.id, userId);
    ctx.body = result !== false ? ctx.msg.success : ctx.msg.failure;
  }

  /** 获取协作者列表 */
  async getCollaborators() {
    const { ctx } = this;
    const token = await ctx.service.token.mineToken.getByUserId(ctx.user.id);
    // Fan票不存在
    if (!token) {
      ctx.body = ctx.msg.tokenNotExist;
      return;
    }
    const result = await this.service.token.mineToken.getCollaborators(token.id);
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }

  /**
   * 通过 Token 地址获取 token 信息
   */
  async getInfoByAddress() {
    const { ctx } = this;
    const { address } = ctx.params;
    const { chain } = ctx.query;
    const res = await this.service.token.mineToken.getInfoByAddress({ address, chain });
    ctx.body = {
      ...ctx.msg.success,
      data: res,
    };
  }
}

module.exports = TokenController;
