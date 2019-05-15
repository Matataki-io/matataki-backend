'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index() {
    this.ctx.body = 'hi, egg, version=1.6.4';
  }
}

module.exports = HomeController;
