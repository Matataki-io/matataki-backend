'use strict';
const IPFS = require('ipfs-mini');
const axios = require('axios');
const FormData = require('form-data');
const Service = require('egg').Service;

class ipfs extends Service {
  constructor(ctx, app) {
    super(ctx, app);
    const { host, port, protocol } = this.config.ipfs_service;
    this.ipfs = new IPFS({
      host,
      port,
      protocol,
    });
  }
  async cat(hash) {
    const { username, password } = this.config.awsIpfs;
    const { data } = await axios.post(`https://ipfs.smartsignature.io/api/v0/cat/${hash}`, '', {
      auth: { username, password },
      timeout: 1000 * 10
          reject(err);
        } else {
          resolve(result);
        }
    });
    return JSON.stringify(data);
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
  /**
   * 上传的 AWS 的 IPFS 节点
   * @param {object} file 文件
   */
  async uploadToAws(file) {
    const { username, password } = this.config.awsIpfs;
    const fd = new FormData();
    fd.append('', file);
    try {
      const { data } = await axios.post('https://ipfs.smartsignature.io/api/v0/add', fd, {
        auth: { username, password },
        headers: fd.getHeaders(),
        timeout: 1000 * 10
      });
      return data.Hash;
    } catch (error) {
      if (error.message.indexOf('timeout') > -1) {
        this.logger.error('uploadToAws failed', 'server down, retry with public node');
        return this.uploadToPublic(file);
      } else {
        this.logger.error('uploadToAws failed', error);
        throw error
      }
    }
  }

  /**
   * uploadToPublic, 上传到公共节点
   * @param {object} file 文件对象
   */
  async uploadToPublic(file) {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await axios.post('https://ipfs.infura.io:5001/api/v0/add', fd, {
        headers: fd.getHeaders(),
        timeout: 1000 * 15
      });
    return data.Hash;
  }
}

module.exports = ipfs;
