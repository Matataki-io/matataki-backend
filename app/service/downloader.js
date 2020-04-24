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
      where: { uid },
    });
    for (const item of posts) {
      if (item.hash) {
        const data = await this.getIpfsData(uid, item.hash);
        zip.file(`${data.title}.md`, data.content);
      }
    }
    return new Promise((resolve, reject) => {
      // zip.folder("nested").file("hello.txt", "Hello World\n");

      zip
        .generateNodeStream({ type: 'nodebuffer', streamFiles: true })
        .pipe(fs.createWriteStream(`posts-zip/${uid}.zip`))
        .on('finish', () => {
          // JSZip generates a readable stream with a "end" event,
          // but is piped here in a writable stream which emits a "finish" event.
          console.log('out.zip written.');
          resolve(`zip/${uid}.zip`);
        })
        .on('error', error => {
          reject(error);
        });
    });
  }
}

module.exports = DownloaderService;
