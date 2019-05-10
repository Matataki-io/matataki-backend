'use strict';

const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index() {
    this.ctx.body = 'hi, egg, version=1.0';
  }

  async home() {
    const ctx = this.ctx;

    console.log(ctx.cookies.get('remember'));


    if (ctx.cookies.get('remember')) {
      ctx.body = '<p>Remembered :). Click to <a href="/forget">forget</a>!.</p>';
      return;
    }

    ctx.body = `<form method="post" action="/remember"><p>Check to <label>
      <input type="checkbox" name="remember"/> remember me</label>
      <input type="submit" value="Submit"/>.</p></form>`;
  }

  async login() {
    // 1. 传一个签名过来，

    // 2. 验证签名

    // 3. 生成 accessToken

    // accessToken =  username + date + salt， (JWT format)
    console.log('');
  }

  async forget() {
    const ctx = this.ctx;

    ctx.cookies.set('remember', null);
    ctx.redirect('/');
  }

  async remember() {
    const ctx = this.ctx;

    const minute = 60000;
    if (ctx.request.body.remember) {
      ctx.cookies.set('remember', 'xxxxxxxxx', { maxAge: minute });
    }
    ctx.redirect('/');
  }

}

module.exports = HomeController;
