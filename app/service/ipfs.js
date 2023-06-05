'use strict';

require('core-js/es/aggregate-error');
require('core-js/proposals/promise-any');
require('core-js/stable/btoa');
const axios = require('axios').default;
const Service = require('egg').Service;
const { v4 } = require('uuid');
const { create } = require('ipfs-http-client')
const fleekStorage = require('@fleekhq/fleek-storage-js');

class ipfs extends Service {

  localClient = create(new URL(this.config.ipfs.local.endpointUrl));

  ipfsUrl = new URL(this.config.ipfs.infura.endpointUrl)
  infuraClient = create({
    host: this.ipfsUrl.hostname,
    port: this.ipfsUrl.port,
    protocol: this.ipfsUrl.protocol.slice(0, -1),
    headers: {
      Authorization: `Basic ${btoa(`${this.config.ipfs.infura.apiKey}:${this.config.ipfs.infura.apiSecret}`)}`
    }
  });

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
   * @param {string} key Filename, optional, use uuid as key when empty
   * @return {Promise<string>} IPFS CID hash
   */
  async add(data, key = v4()) {
    const requests = [
      this.uploadToLocal(data),
      this.uploadToInfura(data),
      this.uploadToFleek(data, key),
    ]
    const hash = await Promise.any(requests);
    return hash;
  }

  /**
   * Upload IPFS content to local Kobo instance
   * @param {any} file IPFS file
   * @returns IPFS CID hash
   */
  async uploadToLocal(file) {
    try {
      const { cid } = await this.localClient.add(file, { cidVersion: 1, pin: true });
      return cid.toString();
    } catch (error) {
      this.logger.error('Upload to local has error: ', error.message);
      throw error;
    }
  }

  /**
   * Upload IPFS content to Infura IPFS
   * @param {any} file IPFS file
   * @returns IPFS CID hash
   */
  async uploadToInfura(file) {
    try {
      const { cid } = await this.infuraClient.add(file, { cidVersion: 1, pin: true });
      return cid.toString();
    } catch (error) {
      this.logger.error('Upload to infura has error: ', error.message);
      throw error;
    }
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
        key,
        data: file,
      });

      return uploadedFile.hash;
    } catch (error) {
      this.logger.error('Upload to fleek has error: ', error.message);
      throw error;
    }
  }
}

module.exports = ipfs;
