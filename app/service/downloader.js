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
    // const catchRequest = await this.service.post.ipfsCatch(hash);
    let catchRequest = null;
    if (hash.substring(0, 2) === 'Gh') {
      catchRequest = await this.service.github.readFromGithub(hash, 'md', 'source');
    } else {
      catchRequest = await this.service.post.ipfsCatch(hash);
    }
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
    const id2Obj = await this.getRefs(posts);

    const website = this.config.env === 'test' ? 'https://test.matataki.io/p' : 'https://www.matataki.io/p';
    for (const item of posts) {
      const _refMdStr = id2Obj[item.id.toString()];
      const refMdStr = _refMdStr ? ` ## 已引用 ${_refMdStr} ` : '';
      if (item.hash !== null && item !== '') {
        const data = await this.getIpfsData(uid, item.hash);
        if (data) {
          zip.file(`${item.title}-${item.id}.md`, `
# 标题： ${item.title}
- 作者： ${item.author}

${data.content}
- 原文地址：${website}/${item.id}
- IPFS： ${item.hash}
${refMdStr}`);
        }
      }
    }
    this.logger.info('service downloader promiseZip start');
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
  async getRefs(posts) {
    // ids数组
    const idsArr = [];
    for (const item of posts) {
      idsArr.push(item.id);
    }
    this.logger.info('service downloader getRefs idsArr: ', idsArr);
    const refs = await this.app.mysql.query('SELECT * FROM post_references WHERE sign_id IN (?) AND status = 0;', [ idsArr ]);
    // ids 对象
    const idsObj = {};
    for (const item of refs) {
      // 不存在就新建数组
      if (!idsObj[item.sign_id]) {
        idsObj[item.sign_id] = '';
      }
      idsObj[item.sign_id] += `
- [${item.title}](${item.url})
      `;
    }
    this.logger.info('service downloader getRefs idsObj: ', idsObj);
    return idsObj;
  }
}

module.exports = DownloaderService;
