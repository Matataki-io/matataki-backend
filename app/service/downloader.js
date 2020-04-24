'use strict';

const Service = require('egg').Service;
const fs = require('fs');
const JSZip = require('jszip');

class DownloaderService extends Service {
  async getArticles(uid) {
    const posts = await this.app.mysql.get('posts', { uid });
    return posts;
  }
  async getIpfsData(uid, hash) {
    const catchRequest = await this.service.post.ipfsCatch(hash);
    if (catchRequest) {
      let data = JSON.parse(catchRequest.toString());
      if (data.iv) {
        // 是加密的数据，开始解密
        data = JSON.parse(this.service.cryptography.decrypt(data));
      }
      data.content = await this.service.extmarkdown.transform(data.content,
        { userId: uid });
      return data;
    }
    return null;
  }
  async promiseZip(uid) {
    const zip = new JSZip();
    const posts = await this.app.mysql.select('posts', {
      where: { uid, channel_id: 1, status: 0 },
    });
    for (const item of posts) {
      if (item.hash !== null && item !== '') {
        const data = await this.getIpfsData(uid, item.hash);
        if (data) {
          zip.file(`${item.title}-${item.id}.md`, data.content);
        }
      }
    }
    console.log('service downloader promiseZip start');
    return new Promise((resolve, reject) => {
      // zip.folder("nested").file("hello.txt", "Hello World\n");

      zip
        .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
        .pipe(fs.createWriteStream(`posts-zip/${uid}.zip`))
        .on('finish', () => {
          // JSZip generates a readable stream with a "end" event,
          // but is piped here in a writable stream which emits a "finish" event.
          this.logger.info('service downloader promiseZip out.zip written.');
          resolve(`posts-zip/${uid}.zip`);
        })
        .on('error', error => {
          reject(error);
        });
    });
  }
}

module.exports = DownloaderService;
