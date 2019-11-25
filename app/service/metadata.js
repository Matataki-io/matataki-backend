'use strict';

const Service = require('egg').Service;
const axios = require('axios');
const { getMetadata } = require('page-metadata-parser');
const domino = require('domino');

class GetPostMetadataService extends Service {

  /**
   * 利用 OpenGraph 规范获取 url 的元数据
   * @param {string} url target url
   * @return {object} metadata
   */
  async Get(url) {
    // 获取内容
    let rawPage;
    try {
      rawPage = await axios({
        url,
        method: 'get',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_0_1 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Mobile/14A403 MicroMessenger/6.5.18 NetType/WIFI Language/zh_CN',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        },
      });
    } catch (err) {
      this.logger.error('GetPostMetadataService::Get: error:', err);
      return null;
    }

    // Init meta reader
    const doc = domino.createWindow(rawPage.data).document;
    const metadata = getMetadata(doc, url);
    this.logger.info(`metadata for ${url} :`, metadata);
    return metadata;
  }

}

module.exports = GetPostMetadataService;
