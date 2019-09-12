'use strict';
const IPFS = require('ipfs-mini');
const Service = require('egg').Service;

class ipfs extends Service {
  constructor(ctx, app) {
    super(ctx, app);
    this.ipfs = new IPFS({
      host: '47.52.2.146',
      port: 5001,
      protocol: 'http',
    });
  }
  cat(hash) {
    return new Promise((resolve, reject) => {
      this.ipfs.cat(hash, (err, result) => {
        if (err) {
          this.logger.error('ipfs.cat error: %j', err);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }
  add(data) {
    return new Promise((resolve, reject) => {
      this.ipfs.add(data, (err, result) => {
        if (err) {
          this.logger.error('ipfs.add error: %j', err);
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }
}

module.exports = ipfs;
