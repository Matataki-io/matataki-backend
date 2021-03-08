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
const cheerio = require('cheerio'); // 如果是客户端渲染之类的 可以考虑用 puppeteer

class PostImportService extends Service {

  // 搬运时候上传图片
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

  // 搬运微信文章
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

    // remove tag attr
    const removeTagAttr = (content, tag, attr) => {
      const _$ = cheerio.load(content);
      const _content = _$('#img-content');
      const _html = _content.find(tag).toArray();
      _html.forEach(node => {
        if (node.attribs[attr]) {
          node.attribs[attr] = 'remove';
        }
      });
      return _content.html();
    };

    // 因为 cheerio decode 导致 某些attar属性里面的字符转换渲染出来的html不对 所以删除有问题的自定义属性
    const source = removeTagAttr(rawPage.data, 'span', 'data-shimo-docs');
    const $ = cheerio.load(source, { decodeEntities: false });
    const mediaContent = $('div.rich_media_content');

    // 把图片上传至本站， 并替换链接
    // TBD: 仍然有出现图片未被替换的问题
    let imgRawUrl, imgUpUrl, imgFileName;
    const imgElements = mediaContent.find('img').toArray();
    for (const imgElement of imgElements) {
      imgRawUrl = imgElement.attribs['data-src'];
      imgFileName = './uploads/today_' + Date.now() + '.' + imgElement.attribs['data-type'];
      imgUpUrl = await this.uploadArticleImage(imgRawUrl, imgFileName);
      // 匹配图片URL， 并进行替换
      if (imgUpUrl) {
        imgElement.attribs['data-src'] = imgElement.attribs['data-src'].replace(
          /http[s]?:\/\/mmbiz\.q[a-z]{2,4}\.cn\/mmbiz_[a-z]{1,4}\/[a-zA-Z0-9]{50,100}\/[0-9]{1,4}\??[a-z0-9_=&]{0,100}/g, 'https://ssimg.frontenduse.top' + imgUpUrl);
        imgElement.attribs.style = 'vertical-align: middle;width: 90%;height: 90%;';
      } else {
        this.logger.info('PostImportService:: handleWechat: upload Image failed, ignored');
        imgElement.attribs['data-src'] = '';
      }
      imgElement.attribs.src = imgElement.attribs['data-src'];
    }

    // 处理视频
    const videos = $('iframe', mediaContent);
    for (const video of videos.toArray()) {
      try {
        const vid = $(video).attr('data-mpvid');
        const url = `https://mp.weixin.qq.com/mp/videoplayer?action=get_mp_video_play_url&preview=0&__biz=&mid=&idx=&vid=${vid}&uin=&key=&pass_ticket=&wxtoken=&appmsg_token=&x5=0&f=json`;
        const { data } = await axios({
          url, method: 'GET',
        });
        const originSrc = data.url_info[0].url;
        $(video).after(`<video controls width="100%" name="media">
      <source src="${originSrc}" type="video/mp4"></video>`);
        $(video).remove();
      } catch (err) {
        this.logger.error('PostImportService:: handleWechat: error while processing video:', err);
      }
    }
    const parsedContent = pretty(mediaContent.html());

    // 处理元数据 —— 标题、封面
    const metadata = await this.service.metadata.GetFromRawPage(rawPage, url);
    const { title } = metadata;

    let parsedCoverRaw;
    // 试图从 OpenGraph 读取 封面信息
    if (metadata.image) {
      // Yay! 再也不用regex匹配了
      parsedCoverRaw = metadata.image;
    } else if (rawPage.data.match(/msg_cdn_url = "http:\/\/mmbiz\.qpic\.cn\/mmbiz_jpg\/[0-9a-zA-Z]{10,100}\/0\?wx_fmt=jpeg"/)) {
      parsedCoverRaw = rawPage.data.match(/msg_cdn_url = "http:\/\/mmbiz\.qpic\.cn\/mmbiz_jpg\/[0-9a-zA-Z]{10,100}\/0\?wx_fmt=jpeg"/)[0];
    } else {
      // 文章可能较老，试图匹配 mmbiz 看看能不能找到图片
      parsedCoverRaw = rawPage.data.match(/msg_cdn_url = "http:\/\/mmbiz\.qpic\.cn\/mmbiz\/[0-9a-zA-Z]{10,100}\/0\?wx_fmt=jpeg"/);
      if (parsedCoverRaw) parsedCoverRaw = parsedCoverRaw[0];
    }
    const parsedCover = parsedCoverRaw;
    const parsedCoverUpload = './uploads/today_wx_' + Date.now() + '.jpg';
    const coverLocation = await this.uploadArticleImage(parsedCover, parsedCoverUpload);

    return {
      title,
      cover: coverLocation,
      content: parsedContent,
    };
  }

  // 处理橙皮书文章
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
    const { title } = await this.service.metadata.GetFromRawPage(rawPage, url);

    // console.log(rawPage);
    // Parser 处理， 转化为markdown， 因平台而异
    const parsedPage = htmlparser.parse(rawPage.data);
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

    // 上传封面
    const parsedCoverUpload = './uploads/today_orange_' + Date.now() + '.jpg';
    const coverLocation = await this.uploadArticleImage(coverUrl.substring(5, coverUrl.length - 2), parsedCoverUpload);

    const articleObj = {
      title,
      cover: coverLocation,
      content: articleContent,
    };

    return articleObj;
  }

  // 处理链闻文章
  async handleChainnews({ url, type }) {
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

    // 获取Tags
    const getTags = dom => {
      let tags = '';
      try {
        const parsedTags = dom.querySelectorAll('.post-body div.post-tags a');
        const parsedTagsList = [ ...parsedTags ].map(i => i.innerText);
        tags = parsedTagsList.join();
      } catch (e) {
        this.logger.error('e', e.toString());
      }
      return tags;
    };

    if (type === 'articles') {
      // 处理元数据 —— 标题、封面
      const metadata = await this.service.metadata.GetFromRawPage(rawPage, url);
      const { title, image } = metadata;
      // Parser 处理， 转化为markdown， 因平台而异
      const parsedPage = htmlparser.parse(rawPage.data);
      const parsedContent = parsedPage.querySelector('div.post-content.markdown');

      // 替换img
      const imgList = parsedContent.querySelectorAll('p img');
      for (let i = 0; i < imgList.length; i++) {
        const ele = imgList[i];
        const src = ele.getAttribute('src');

        // TODO: 后缀可能需要处理
        const parsedImgName = './uploads/today_chainnews_' + Date.now() + '.jpg';
        const imgUpUrl = await this.uploadArticleImage(src, parsedImgName);

        if (imgUpUrl) {
          ele.setAttribute('src', `${this.config.ssimg}${imgUpUrl}`);
        } else {
          ele.setAttribute('src', src);
        }
      }

      // const coverRe = new RegExp(//);
      const turndownService = new turndown();
      const articleContent = turndownService.turndown(parsedContent.toString());

      const parsedCoverUpload = './uploads/today_chainnews_' + Date.now() + '.jpg';
      const coverLocation = await this.uploadArticleImage(image.substring(0, image.length - 6), parsedCoverUpload);

      const articleObj = {
        title,
        cover: coverLocation,
        content: articleContent,
        tags: getTags(parsedPage),
      };

      return articleObj;
    } else if (type === 'news') {
      // Parser 处理， 转化为markdown， 因平台而异
      const parsedPage = htmlparser.parse(rawPage.data);

      // 标题
      const parsedTitle = parsedPage.querySelector('h1.post-title').innerText || '';

      // 内容
      const parsedContent = parsedPage.querySelector('h2.post-content.markdown');
      const turndownService = new turndown();
      const articleContent = turndownService.turndown(parsedContent.toString());

      // head meta 里面的image是默认链闻的图片 所有没有返回封面 保持空

      return {
        title: parsedTitle,
        cover: '',
        content: articleContent,
        tags: getTags(parsedPage),
      };
    }
    this.logger.error('PostImportService:: handleChainnews: error: other type url is', url);
    return null;

  }

  // 处理简书文章
  async handleJianShu(url) {
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
      this.logger.error('PostImportService:: handleJianShu: error:', err);
      return null;
    }
    const { title } = await this.service.metadata.GetFromRawPage(rawPage, url);
    // Parser 处理， 转化为markdown， 因平台而异
    const $ = cheerio.load(rawPage.data);
    // 不删掉 fill 图片会走样
    $('div.image-container-fill').each(function() {
      $(this).remove();
    });
    const mediaContent = $('article');
    const _imgElement = mediaContent.find('img').toArray();
    let coverLocation = null;
    for (let i = 0; i < _imgElement.length; i++) {
      _imgElement[i].attribs.src = _imgElement[i].attribs['data-original-src'];
      let originalSrc = _imgElement[i].attribs.src;
      if (originalSrc.indexOf('http') === -1) originalSrc = 'https:' + originalSrc;
      const parsedCoverUpload = './uploads/today_jianshu_' + Date.now() + '.jpg';
      const imgUpUrl = await this.uploadArticleImage(originalSrc, parsedCoverUpload);
      if (i === 0) coverLocation = imgUpUrl;
      if (imgUpUrl) {
        _imgElement[i].attribs.src = _imgElement[i].attribs
          .src.replace(/[https:]?\/\/upload-images\.jianshu\.io\/upload_images\/[a-z0-9_=&\.\-]{0,100}/g, 'https://ssimg.frontenduse.top' + imgUpUrl);
        _imgElement[i].attribs['data-original-src'] = _imgElement[i]
          .attribs['data-original-src'].replace(/[https:]?\/\/upload-images\.jianshu\.io\/upload_images\/[a-z0-9_=&\.\-]{0,100}/g, 'https://ssimg.frontenduse.top' + imgUpUrl);
      }
    }

    const articleObj = {
      title,
      cover: coverLocation,
      content: mediaContent.html(),
    };

    return articleObj;
  }

  // 处理Gaojin Blog
  async handleGaojin(url) {
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
      this.logger.error('PostImportService:: handleJianShu: error:', err);
      return {
        title: '',
        cover: '',
        content: '导入失败,请联系管理员!',
      };
    }

    try {
      const { title } = await this.service.metadata.GetFromRawPage(rawPage, url);
      const $ = cheerio.load(rawPage.data);
      const parsedContent = $('#main .article-inner');
      $('#main .article-footer').remove();
      const turndownService = new turndown();
      // 简单的规则 后期考虑复用等
      const rule = [
        {
          key: 'h1',
          replace: '# ',
        },
        {
          key: 'h2',
          replace: '## ',
        },
        {
          key: 'h3',
          replace: '### ',
        },
        {
          key: 'h4',
          replace: '#### ',
        },
        {
          key: 'h5',
          replace: '##### ',
        },
        {
          key: 'h6',
          replace: '###### ',
        },
      ];
      for (const key of rule) {
        turndownService.addRule('title', {
          filter: key.key,
          replacement: content => key.replace + content,
        });
      }
      turndownService.keep([ 'figure' ]);
      const parsedCoverList = $('#main .article-inner img');
      let coverLocation = null;
      for (let i = 0; i < parsedCoverList.length; i++) {
        let originalSrc = $(parsedCoverList[i]).attr('src');

        if (!(originalSrc.includes('http'))) originalSrc = 'https://igaojin.me/' + originalSrc;
        let filename = originalSrc.split('.');
        if (typeof filename !== 'string') {
          filename = filename[filename.length - 1];
        } else filename = 'png';

        const parsedCoverUpload = './uploads/today_gaojin_' + Date.now() + `.${filename}`;
        const imgUpUrl = await this.uploadArticleImage(encodeURI(originalSrc), parsedCoverUpload);
        if (i === 0) coverLocation = imgUpUrl;
        if (imgUpUrl) {
          $(parsedCoverList[i]).attr('src', 'https://ssimg.frontenduse.top' + imgUpUrl);
        }
      }
      const articleContent = turndownService.turndown(parsedContent.toString());

      const articleObj = {
        title,
        cover: coverLocation,
        content: articleContent,
      };

      return articleObj;
    } catch (error) {
      this.logger.error('handleGaojin::error', error);
      this.logger.error(error);
      return {
        title: '',
        cover: '',
        content: '导入失败,请联系管理员!',
      };
    }
  }
  generateFileName(platform, origin) {
    let suffix = origin.split('.');
    suffix = suffix[suffix.length - 1];
    return `./uploads/today_${platform}_${new Date().valueOf()}.${suffix}`;
  }
  async defaultRequest(url) {
    const rawPage = await axios({
      url,
      method: 'get',
      headers: {
        Accept: 'text / html, application/ xhtml + xml, application/ xml; q = 0.9, image / webp, image / apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.130 Safari/537.36',
      },
    });
    return rawPage;
  }
  async handleMatters(url) {
    try {
      const rawPage = await this.defaultRequest(url);
      let { title } = await this.service.metadata.GetFromRawPage(rawPage, url);
      title = title.replace(/\s*- Matters/, '');
      const $ = cheerio.load(rawPage.data);
      const parsedContent = $('div.u-content');
      const turndownService = new turndown();
      const parsedImages = $('img');
      let coverLocation = null;
      for (const image of parsedImages.toArray()) {
        const originSrc = $(image).attr('src');
        const uploadUrl = await this.uploadArticleImage(originSrc,
          this.generateFileName('matters', originSrc));
        if (!coverLocation) { coverLocation = uploadUrl; }
        $(image).attr('src', uploadUrl ? 'https://ssimg.frontenduse.top' + uploadUrl : '');
      }
      const articleContent = turndownService.turndown(parsedContent.html());
      return {
        title,
        cover: coverLocation,
        content: articleContent,
      };

    } catch (err) {
      this.logger.error('PostImportService:: handleMatters: error:', err);
      return null;
    }
  }

  async handleZhihu(url) {
    try {
      const rawPage = await this.defaultRequest(url);
      const { title } = await this.service.metadata.GetFromRawPage(rawPage, url);
      const $ = cheerio.load(rawPage.data);
      const parsedContent = $('div.RichText.ztext.Post-RichText');
      const turndownService = new turndown();
      const parsedTitleImage = $('img.TitleImage');
      const parsedImages = $('img', parsedContent);
      const parsedLinkCards = $('a.LinkCard');
      let uploadedImgs = [];
      for (const image of parsedImages.toArray()) {
        const originSrc = $(image).attr('data-original');
        const uploadUrl = originSrc ? 'https://ssimg.frontenduse.top' + await this.uploadArticleImage(originSrc,
          this.generateFileName('zhihu', originSrc)) : null;
        $(image).attr('src', uploadUrl ? uploadUrl : '');
        uploadedImgs.push(uploadUrl);
      }
      // 防止 null 混进了里面
      uploadedImgs = uploadedImgs.filter(it => it !== null);
      let coverLocation = null;
      if (parsedTitleImage && parsedTitleImage.attr('src')) {
        const originSrc = parsedTitleImage.attr('src');
        coverLocation = await this.uploadArticleImage(originSrc,
          this.generateFileName('zhihu', originSrc));
      } else if (uploadedImgs.length !== 0) {
        coverLocation = uploadedImgs[0].replace('https://ssimg.frontenduse.top', '');
      } else {
        // Blank Cover if no pic in the post
        coverLocation = '/article/2020/03/04/7f6be16b0253c196b986e3baaaf2287a.png';
      }
      for (const linkCard of parsedLinkCards.toArray()) {
        $(linkCard).attr('target', 'linebreak'); // hack
      }
      turndownService.addRule('linkCard', {
        filter: 'a',
        replacement: (content, node) =>
          `[${content}](${node.href}) ${node.target === 'linebreak' ? '\n\n' : ''}`,
      });
      turndownService.remove('noscript');
      const articleContent = turndownService.turndown(parsedContent.html());
      return {
        title,
        cover: coverLocation,
        content: articleContent,
      };

    } catch (err) {
      this.logger.error('PostImportService:: handleZhihu: error:', err);
      return null;
    }
  }
  // @deprecated: 这个 Headless 微博文章爬虫已经失效了，暂时屏蔽这个功能 - Frank Feb.19 2021
  // async handleWeibo(url) {
  //   try {
  //     const { data } = await axios({
  //       url: 'http://headl3ss-par53r.mttk.net:7333/get-weibo',
  //       method: 'post',
  //       data: { url },
  //     });
  //     const $ = cheerio.load(data);
  //     const title = $('div.title').text();
  //     const parsedTitleImage = $('img');
  //     const parsedContent = $('div.WB_editor_iframe_new');
  //     const parsedImages = $('img', parsedContent);
  //     let coverLocation = null;
  //     if (parsedTitleImage) {
  //       const originSrc = parsedTitleImage.attr('src');
  //       coverLocation = await this.uploadArticleImage(originSrc,
  //         this.generateFileName('weibo', originSrc));
  //     }
  //     for (const image of parsedImages.toArray()) {
  //       const originSrc = $(image).attr('src');
  //       if (originSrc) {
  //         const uploadUrl = 'https://ssimg.frontenduse.top' + await this.uploadArticleImage(originSrc,
  //           this.generateFileName('weibo', originSrc));
  //         $(image).attr('src', uploadUrl);
  //       }
  //     }
  //     const turndownService = new turndown();
  //     const articleContent = turndownService.turndown(parsedContent.html());
  //     return {
  //       title,
  //       cover: coverLocation,
  //       content: articleContent,
  //     };
  //   } catch (err) {
  //     this.logger.error('PostImportService:: handleWeibo: error:', err);
  //     return null;
  //   }
  // }
  // handle Archive 获取archive.is的微信文章
  async handleArchive(url) {
    try {
      const rawPage = await this.defaultRequest(url);
      const $ = cheerio.load(rawPage.data);
      const title = $('h2#activity-name').text().trim();
      const coverLocation = null;
      const article = $('div#js_content');
      for (const image of $('img', article).toArray()) {
        const originSrc = $(image).attr('src');
        if (originSrc) {
          const uploadUrl = 'https://ssimg.frontenduse.top' + await this.uploadArticleImage(originSrc,
            this.generateFileName('archive', originSrc));
          $(image).attr('src', uploadUrl);
        }
      }
      const articleContent = pretty(article.html());
      return {
        title,
        cover: coverLocation,
        content: articleContent,
      };
    } catch (err) {
      this.logger.error('PostImportService:: handleArchive: error:', err);
      return null;
    }
  }
  async handleBihu(url) {
    this.logger.info('bihu url is: ', url);

    const BIHUAPI = 'https://be02.bihu.com/bihube-pc/api/content/show/getArticle2';
    const BIHUOSS = 'https://oss-cdn2.bihu-static.com';
    const SSIMG = 'https://ssimg.frontenduse.top';
    const BIHUSHORTCONTENT = 'https://be02.bihu.com/bihube-pc/bihu/shortContent';

    let KEY = '';
    const KEYArticle = '/article/';
    const KEYShort = '/shortContent/';

    // 处理文章
    const handleArticle = async ID => {
      // 获取文章信息
      const result = await axios({
        method: 'POST',
        url: BIHUAPI,
        headers: {
          uuid: '0ec70f2bdaa5665a7ff802ad5162205b',
        },
        data: {
          artId: ID,
        },
      });

      this.logger.info('article result', url, ID, result.data.data);

      let title = '';
      // 文章信息
      if (result.status === 200 && result.data.data) {
        title = result.data.data.title;
      } else {
        throw new Error('result error', result);
      }

      const { data } = result.data;
      // 按照链接文章处理 比如： https://bihu.com/article/1064119248
      if (data.articleType === 0) {
        return {
          title,
          cover: '',
          content: data.content,
        };
      }
      // 其他全部按照文章来处理 目前有 1 2
      // articleType === 1 https://bihu.com/article/1071410180
      // articleType === 2 https://bihu.com/article/1761774697
      const resultContent = await axios({
        method: 'GET',
        url: `${BIHUOSS}/${data.content}`,
      });

      // 获取内容
      let content = '';
      if (resultContent.status === 200 && resultContent.data) {
        content = resultContent.data;
      }

      // 封面处理
      const coverUrl = data.imgList[0].name ? `${BIHUOSS}/${data.imgList[0].name}` : '';
      let cover = '';
      if (coverUrl) {
        const parsedCoverUpload = './uploads/today_bihu_' + Date.now() + '.png';
        const coverResult = await this.uploadArticleImage(coverUrl, parsedCoverUpload);
        if (coverResult) {
          cover = coverResult;
        }
      }

      // 处理图片
      if (content) {
        const $ = cheerio.load(content);
        const _imgElement = $('img').toArray();
        for (let i = 0; i < _imgElement.length; i++) {
          const _src = _imgElement[i].attribs.src;
          const parsedCoverUpload = './uploads/today_bihu_' + Date.now() + '.png';
          const imgUpUrl = await this.uploadArticleImage(_src, parsedCoverUpload);
          if (i === 0 && !cover && imgUpUrl) {
            cover = imgUpUrl;
          }
          if (imgUpUrl) {
            _imgElement[i].attribs.src = `${SSIMG}${imgUpUrl}`;
          }
        }
        content = $('body').html();
      }

      return {
        title,
        cover,
        content,
      };
    };

    // 处理微文
    const handleShortContent = async ID => {
      // 获取内容
      const result = await axios({
        method: 'GET',
        url: `${BIHUSHORTCONTENT}/${ID}`,
      });

      let content = '';
      if (result.status === 200 && result.data.data) {
        content = result.data.data.content;
      } else {
        throw new Error('result error', result);
      }

      const { data } = result.data;
      let cover = '';
      if (data.snapimage) {
        // 微文的图片
        const snapimageResult = data.snapimage.split(',');
        let imgMd = '';
        for (let i = 0; i < snapimageResult.length; i++) {
          // 处理图片
          const url = snapimageResult[i];
          const coverUrl = url ? `${BIHUOSS}/${url}` : '';
          if (coverUrl) {
            const parsedCoverUpload = './uploads/today_bihu_' + Date.now() + '.png';
            const imgUrl = await this.uploadArticleImage(coverUrl, parsedCoverUpload);
            if (imgUrl) {
              imgMd += `![imgUrl](${SSIMG}/${imgUrl})`;
            }

            // 第一张当封面
            if (i === 0 && imgUrl) {
              cover = imgUrl;
            }
          }
        }
        // 添加到尾部
        content += imgMd;
      }
      return {
        title: '',
        cover,
        content,
      };
    };

    // 判断是文章还是微文
    if (url.indexOf(KEYArticle) !== -1) {
      KEY = KEYArticle;
    } else if (url.indexOf(KEYShort) !== -1) {
      KEY = KEYShort;
    } else {
      throw new Error('other url', url);
    }

    // 获取 ID
    const IDX = url.indexOf(KEY);
    const ID = parseInt(url.slice(IDX + KEY.length));
    if (!ID) {
      throw new Error('not article id error', url);
    }

    try {
      if (KEY === KEYArticle) {
        return await handleArticle(ID);
      } else if (KEY === KEYShort) {
        return await handleShortContent(ID);
      }
      throw new Error('not match key', KEY);
    } catch (e) {
      this.logger.error('PostImportService:: handleBihu error:', e);
      return null;
    }

  }
}

module.exports = PostImportService;
