'use strict';
const Controller = require('../../core/base_controller');

class TestWeb3Controller extends Controller {
  create() {
    const ctx = this.ctx;
    const wallet = this.service.ethereum.web3.create();
    ctx.body = ctx.msg.success;
    ctx.body.data = wallet;
  }
}

module.exports = TestWeb3Controller;
