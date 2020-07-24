'use strict';
const Controller = require('../core/base_controller');

class MineTokenController extends Controller {
  // 创建
  async create() {
    const ctx = this.ctx;
    const { name, symbol, decimals = 4, logo, brief, introduction, initialSupply } = this.ctx.request.body;
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
      const result = await ctx.service.token.mineToken.create(ctx.user.id, name, symbol, initialSupply, decimals, logo, brief, introduction, txHash); // decimals默认4位
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
    const { name, logo, brief, introduction } = ctx.request.body;

    // 编辑Fan票的时候限制简介字数不超过50字 后端也有字数限制
    if (brief && brief.length > 50) {
      ctx.body = ctx.msg.failure;
    } else { // 好耶 字数没有超限
      const result = await ctx.service.token.mineToken.update(ctx.user.id, tokenId, name, logo, brief, introduction);
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
    const exchange = await ctx.service.token.exchange.detail(id);
    const user = await ctx.service.user.get(token.uid);
    // const vol_24h = await ctx.service.token.exchange.volume_24hour(id);
    if (exchange) {
      const trans_24hour = await ctx.service.token.exchange.trans_24hour(id);
      exchange.volume_24h = parseFloat(trans_24hour.volume_24h.toFixed(4));
      exchange.change_24h = trans_24hour.change_24h;
      exchange.price = parseFloat((exchange.cny_reserve / exchange.token_reserve).toFixed(4));
      exchange.amount_24h = trans_24hour.amount_24h;
    }
    ctx.body = {
      ...ctx.msg.success,
      data:
      {
        user,
        token,
        exchange,
      },
    };
  }

  async index() {
    const { ctx } = this;
    /**
     * type
     *  draft 保存内容
     *  submit 提交申请
     *  reset 重新申请 || 取消申请
     */
    const { type, logo = '', name = '', symbol = '', tag = [] } = ctx.request.body;

    const result = await this.ctx.service.mineTokenApplication.index(type, logo, name, symbol, tag);
    if (result.code === 0) {
      ctx.body = ctx.msg.success;
    } else {
      ctx.body = ctx.msg.failure;
      if (result.message) {
        ctx.body.message = result.message;
      }
    }

  }
  async survey() {
    const { ctx } = this;
    // 参数可以参考数据库字段comment
    const {
      introduction = '', age = '', number = '',
      career = '', field = '', platform = '',
      nickname = '', link = '', interview = 1,
      know = '', publish = '', info = '',
      promote = '',
    } = ctx.request.body;

    const result = await this.ctx.service.mineTokenApplication.survey(
      introduction, age, number,
      career, field, platform,
      nickname, link, interview,
      know, publish, info,
      promote
    );
    if (result.code === 0) {
      ctx.body = ctx.msg.success;
    } else {
      ctx.body = ctx.msg.failure;
      if (result.message) {
        ctx.body.message = result.message;
      }
    }

  }
}

module.exports = MineTokenController;
