'use strict';
const Controller = require('../core/base_controller');

class TimeMachineController extends Controller {

  async getLatestIpfsHash() {
    const { ctx } = this;
    const { id } = ctx.params;
    const result = await this.service.ethereum.timeMachine.getLatestIpfsHash(id);
    ctx.body = {
      ...ctx.msg.success,
      data: result,
    };
  }

  async getArticleRivisionHistory() {
    const { ctx } = this;
    const { id, size } = ctx.params;
    let result = await this.service.ethereum.timeMachine.getArticleRivisionHistory(id, size);
    result = result.filter(val => val !== '');
    ctx.body = {
      ...ctx.msg.success,
      data: {
        length: result.length,
        revisions: result,
      },
    };
  }

  async getCurrentRevisionCount() {
    const { ctx } = this;
    const { id } = ctx.params;
    const result = await this.service.ethereum.timeMachine.getCurrentRevisionId(id);
    ctx.body = {
      ...ctx.msg.success,
      data: Number(result),
    };
  }

}

module.exports = TimeMachineController;
