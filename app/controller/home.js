'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index() {
    // await this.service.mechanism.payContext.test();
    // return;

    this.ctx.body = 'hi, egg, version=1.6.7, ' + ctx.header['x-real-ip'];
  }
}

module.exports = HomeController;
