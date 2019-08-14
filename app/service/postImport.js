'use strict';

const Service = require('egg').Service;
const downloader = require('image-downloader');
// const FromData = require('form-data');
const moment = require('moment');
const md5 = require('crypto-js/md5');
const axios = require('axios');
const htmlparser = require('node-html-parser');
const pretty = require('pretty');
const turndown = require('turndown');

class PostImportService extends Service {
  async uploadArticleImage(url, cacheFile = './uploads/today.jpg') {
    let imageFile;
    // let imageUpload = null;
    const filetype = cacheFile.split('.');
    try {
      imageFile = await downloader.image({
        url,
        dest: cacheFile,
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_0_1 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Mobile/14A403 MicroMessenger/6.5.18 NetType/WIFI Language/zh_CN',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        },
      });
    } catch (e) {
      this.logger.error('PostImportService:: uploadArticleImage: Download Image failed..', e);
      return null;
    }
    // 上传的文件的名字
    const filename = '/image/'
      + moment().format('YYYY/MM/DD/')
      + md5(imageFile.filename).toString()
      + '.' + filetype[filetype.length - 1];
    const uploadImageResult = await this.service.post.uploadImage(filename, imageFile.filename);
    if (uploadImageResult !== 0) {
      this.logger.info('PostImportService:: uploadArticleImage: Upload Image Failed...');
      return null;
    }
    return filename;
  }

  async handleWechat(url) {
    // 获取文章内容
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
      this.logger.error('PostImportService:: handleWechat: error:', err);
      return null;
    }
    const parsedPage = htmlparser.parse(rawPage.data);

    // 把图片上传至本站， 并替换链接
    // TBD: 仍然有出现图片未被替换的问题
    let imgRawUrl, imgUpUrl, imgFileName;
    const imgElement = parsedPage.querySelector('div.rich_media_content').querySelectorAll('img');
    for (let index = 0; index < imgElement.length; index += 1) {
      imgRawUrl = imgElement[index].rawAttributes['data-src'];
      imgFileName = './uploads/today_' + Date.now() + '.' + imgElement[0].rawAttributes['data-type'];
      imgUpUrl = await this.uploadArticleImage(imgRawUrl, imgFileName);
      if (imgUpUrl) {
        imgElement[index].rawAttrs = imgElement[index].rawAttrs.replace(
          /http[s]?:\/\/mmbiz\.q[a-z]{2,4}\.cn\/mmbiz_[a-z]{1,4}\/[a-zA-Z0-9]{50,100}\/[0-9]{1,4}\??[a-z0-9_=&]{0,100}/g, 'https://ssimg.frontenduse.top' + imgUpUrl);
        imgElement[index].rawAttrs = imgElement[index].rawAttrs.replace(
          /style=\"[a-zA-Z0-9-:;%,() ]{0,100}\"/g, 'style="vertical-align: middle;width: 90%;height: 90%;"');
      } else {
        this.logger.info('PostImportService:: handleWechat: upload Image failed, ignored');
        imgElement[index].rawAttrs = imgElement[index].rawAttrs.replace(
          /http[s]?:\/\/mmbiz\.q[a-z]{2,4}\.cn\/mmbiz_[a-z]{1,4}\/[a-zA-Z0-9]{50,100}\/[0-9]{1,4}\??[a-z0-9_=&]{0,100}/g, '');
      }
      imgElement[index].rawAttrs = imgElement[index].rawAttrs.replace('data-src', 'src');
    }
    let parsedContent = '';
    // 处理文本
    const parsedContentNodes = parsedPage.querySelector('div.rich_media_content').childNodes;
    for (let index = 0; index < parsedContentNodes.length; index += 1) {
      parsedContent += parsedContentNodes[index].toString();
    }
    parsedContent = pretty(parsedContent);

    // 处理标题和封面
    const parsedTitleRaw = parsedPage.querySelector('h2.rich_media_title').childNodes[0].rawText;
    const parsedTitle = parsedTitleRaw.replace(/\s{2,}/g, '');
    const parsedCoverRaw = rawPage.data.match(/msg_cdn_url = "http:\/\/mmbiz\.qpic\.cn\/mmbiz_jpg\/[0-9a-zA-Z]{10,100}\/0\?wx_fmt=jpeg"/)[0];
    const parsedCover = parsedCoverRaw.substring(15, parsedCoverRaw.length - 1);
    const coverLocation = await this.uploadArticleImage(parsedCover);
    // console.log(parsedTitle);
    // console.log(parsedCover);
    // console.log(parsedContent);

    const articleObj = {
      title: parsedTitle,
      cover: coverLocation,
      content: parsedContent,
    };

    return articleObj;
  }

  async handleOrange(url) {
    // 拉取文章内容
    let articleContent = '';
    let rawPage = null;
    try {
      rawPage = await axios.get(url, {
        method: 'get',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.117 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        },
      });
    } catch (err) {
      this.logger.error('PostImportService:: handleOrange: error:', err);
      return null;
    }
    // console.log(rawPage);
    // Parser 处理， 转化为markdown， 因平台而异
    const parsedPage = htmlparser.parse(rawPage.data);
    const parsedTitleNode = parsedPage.querySelector('div.article-title');
    const parsedTitleRaw = parsedTitleNode.childNodes[0].rawText;
    const parsedTitle = parsedTitleRaw.replace(/\s+/g, '');
    const parsedContent = parsedPage.querySelector('div.article-content');
    const parsedCover = parsedPage.querySelector('div.img-center-cropped.float-img').rawAttributes.style;
    const coverRe = new RegExp(/url\(\'.*\'\)/);
    const coverUrl = coverRe.exec(parsedCover)[0];
    // for (let index = 0; index < parsedContent.childNodes.length; index += 1) {
    //     articleContent += parsedContent.childNodes[index].toString();
    // }
    // 转化为md
    const turndownService = new turndown();
    articleContent = turndownService.turndown(parsedContent.toString());

    const coverLocation = await this.uploadArticleImage(coverUrl.substring(5, coverUrl.length - 2));

    const articleObj = {
      title: parsedTitle,
      cover: coverLocation,
      content: articleContent,
    };

    return articleObj;
  }

  async handleChainnews(url) {
    // 拉取文章内容
    let rawPage;
    try {
      rawPage = await axios({
        url,
        method: 'get',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.117 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        },
      });
    } catch (err) {
      this.logger.error('PostImportService:: handleChainnews: error:', err);
      return null;
    }
    // Parser 处理， 转化为markdown， 因平台而异
    const parsedPage = htmlparser.parse(rawPage.data);
    const parsedContent = parsedPage.querySelector('div.post-content.markdown');
    const parsedTitle = parsedPage.querySelector('h1.post-title');
    const parsedCover = parsedPage.querySelector('head').childNodes[11].rawAttributes.content;
    // const coverRe = new RegExp(//);
    const turndownService = new turndown();
    const articleContent = turndownService.turndown(parsedContent.toString());

    const coverLocation = await this.uploadArticleImage(parsedCover.substring(0, parsedCover.length - 6));

    const articleObj = {
      title: parsedTitle.childNodes[0].rawText,
      cover: coverLocation,
      content: articleContent,
    };

    return articleObj;
  }
}

module.exports = PostImportService;
