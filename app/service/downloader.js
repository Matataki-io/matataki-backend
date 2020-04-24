'use strict';

const Service = require('egg').Service;

class DownloaderService extends Service {
  constructor(ctx, app) {
    super(ctx, app);
    this.key = Buffer.from(this.config.crypto.secretKey, 'hex');
  }

  encrypt() {
  }
  decrypt() {
  }
}

module.exports = DownloaderService;
