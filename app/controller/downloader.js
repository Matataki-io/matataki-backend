'use strict';

const { Controller } = require('egg');
const fs = require('fs');

class DownloaderController extends Controller {
  async down() {
    // const uid = this.ctx.user.id;
    const { uid } = this.ctx.params;
    const filePath = await this.service.downloader.promiseZip(uid);
    // const uploadStatus = await this.service.oss.uploadImage(fs.createReadStream(filePath), '');
    // const filePath = path.resolve(this.app.config.static.dir, 'hello.txt');
    this.ctx.attachment(filePath);
    this.ctx.set('Content-Type', 'application/octet-stream');
    this.ctx.body = fs.createReadStream(filePath);
    // fs.unlink(filePath);
  }
}
module.exports = DownloaderController;
