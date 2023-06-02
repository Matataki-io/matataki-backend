'use strict';

require('core-js/es/aggregate-error');
require('core-js/proposals/promise-any');
const axios = require('axios').default;
const Service = require('egg').Service;
const { v4 } = require('uuid');
const fleekStorage = require('@fleekhq/fleek-storage-js');

class ipfs extends Service {

  /**
   * Cat IPFS content
   * @param {string} hash IPFS CID hash
   * @return {Promise<string>} IPFS object data in JSON string.
   */
  async cat(hash) {
    const urls = this.config.ipfs.gatewayUrls;
    const requests = urls.map(url => this.catFromGateway(url, hash));
    const data = await Promise.any(requests);
    return JSON.stringify(data);
  }

  /**
   * Cat IPFS content from IPFS gateway
   * @param {string} url IPFS gateway url
   * @param {string} hash IPFS CID hash
   * @return {any} IPFS object data.
   */
  async catFromGateway(url, hash) {
    this.logger.debug(`Cat IPFS content from ${url}`);
    const path = new URL(`/ipfs/${hash}`, url);
    const { data } = await axios.get(path.toString());
    return data;
  }

  /**
   * Add IPFS content
   * @param {any} data IPFS object data
   * @return {Promise<string>} IPFS CID hash
   */
  async add(data) {
    return await this.uploadToFleek(data);
  }

  /**
   * 上传到 Fleek 的 IPFS 节点
   * @param {any} file 文件
   * @param {string} key 文件名，可选，为空时用 uuid 作为标识符
   */
  async uploadToFleek(file, key = v4()) {
    const fleekConfig = this.config.ipfs.fleek;

    try {
      const uploadedFile = await fleekStorage.upload({
        apiKey: fleekConfig.apiKey,
        apiSecret: fleekConfig.apiSecret,
        key: 'mttk_post_' + key,
        data: file,
      });

      return uploadedFile.hash;
    } catch (error) {
      this.logger.error('Upload to fleek have error: ', error.message);
      // await this.service.system.notification.pushTextToDingTalk(
      //   'ipfs',
      //   '(👷IPFS系统警告) 监测到 Fleek.Co 的 IPFS 存储上传接口无法访问，请工程师登录 app.fleek.co 检查状态。现在用 Infura 公共节点顶替。'
      // );
      // TODO Upload to Infura
      // const hashWithInfura = await this.uploadToInfura(file);
      // return hashWithInfura;
    }
  }
}

module.exports = ipfs;
