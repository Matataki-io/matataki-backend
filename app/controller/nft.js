'use strict';

const Controller = require('../core/base_controller');

class NftController extends Controller {
  async searchByAskToken() {
    const { ctx } = this;
    const { tokenAddress } = ctx.params;

    try {
      const result = await ctx.curl(`${this.config.nftApi}/search/byAskToken/${tokenAddress}`, {
        dataType: 'json',
        method: 'GET',
        contentType: 'json',
        timeout: 60 * 1000,
      });

      ctx.body = result.data;
    } catch (e) {
      this.logger.error('e', e);
      ctx.body = {
        code: -1,
        message: e.toString(),
      };
    }
  }
}

module.exports = NftController;
