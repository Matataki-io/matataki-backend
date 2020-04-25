'use strict';

const { Controller } = require('egg');
const fs = require('fs');
const jwt = require('jwt-simple');

class DownloaderController extends Controller {
  async down() {
    const { ctx } = this;
    // const uid = this.ctx.user.id;
    // const { uid } = ctx.params;
    const { token } = ctx.query;
    console.log('token', token);
    const uid = this.decode(token);
    console.log('uid', uid);
    if (uid === null) {
      ctx.body = ctx.msg.failure;
      return;
    }
    const filePath = await this.service.downloader.promiseZip(uid);
    // const uploadStatus = await this.service.oss.uploadImage(fs.createReadStream(filePath), '');
    // const filePath = path.resolve(this.app.config.static.dir, 'hello.txt');
    ctx.attachment(filePath);
    ctx.set('Content-Type', 'application/octet-stream');
    ctx.body = fs.createReadStream(filePath);
    // fs.unlink(filePath);
  }
  decode(token) {
    const { ctx } = this;
    try {
      const decoded = jwt.decode(token, ctx.app.config.jwtTokenSecret);
      if (decoded.exp <= Date.now()) return null;
      return decoded.id;
    } catch (err) {
      return null;
    }
  }
}
module.exports = DownloaderController;
