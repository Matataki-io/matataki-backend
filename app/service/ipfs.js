'use strict';
// const IPFS = require('ipfs-mini');
const axios = require('axios').default;
const FormData = require('form-data');
const Service = require('egg').Service;
const { v4 } = require('uuid');
const fleekStorage = require('@fleekhq/fleek-storage-js');

// const IpfsUrl = 'https://ipfs-direct.mttk.net';

class ipfs extends Service {
  // constructor(ctx, app) {
  //   super(ctx, app);
  // }

  async cat(hash) {
    // const data = await Promise.race([
    //   this.catWithFleek(hash),
    //   this.catWithOld(hash),
    // ]);
    const data = await this.catWithFleek(hash);
    return JSON.stringify(data);
  }

  async catWithOld(hash) {
    const { site } = this.config.ipfs_service;
    const { data } = await axios.post(`${site}/api/v0/cat/${hash}`);
    return data;
  }

  async catWithFleek(hash) {
    const { data } = await axios.get('https://ipfs.fleek.co/ipfs/' + hash);
    return data;
  }

  async catWithInfura(hash) {
    const { data } = await axios.get('https://ipfs.infura.io/ipfs/' + hash);
    return data;
  }

  add(data) {
    return this.uploadToFleek(data);
  }

  /**
   * 上传到 Fleek 的 IPFS 节点
   * @param {object} file 文件
   * @param {string} key 文件名，可选，为空时用 uuid 作为标识符
   */
  async uploadToFleek(file, key = v4()) {
    const fleekConfig = this.config.fleekIPFS;

    try {
      const uploadedFile = await fleekStorage.upload({
        apiKey: fleekConfig.apiKey,
        apiSecret: fleekConfig.apiSecret,
        key: 'mttk_post_' + key,
        data: file,
      });

      return uploadedFile.hashV0;
    } catch (error) {
      this.logger.error('Upload to fleek have error: ', error);
      await this.service.system.notification.pushTextToDingTalk(
        'ipfs', 
        '(👷IPFS系统警告) 监测到 Fleek.Co 的 IPFS 存储上传接口无法访问，请工程师登录 app.fleek.co 检查状态。现在用 Infura 公共节点顶替。'
      );
      const hashWithInfura = await this.uploadToPublic(file);
      return hashWithInfura;
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
      timeout: 1000 * 15,
      params: { pin: 'true' },
    });
    return data.Hash;
  }
}

module.exports = ipfs;
