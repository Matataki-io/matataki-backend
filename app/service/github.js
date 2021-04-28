'use strict';
// import { axios } from 'axios';
const axios = require('axios').default
// const amqp = require('amqplib');
// const { Controller } = require('egg');
// const fs = require('fs');
// const jwt = require('jwt-simple');
const Service = require('egg').Service;
const moment = require('moment');
const crypto = require('crypto');
const YAML = require('yaml');

const requiredSiteConfigList = {
  'title': '',
  'subtitle': '',
  'description': '',
  'keywords': '',
  'author': '',
  'language': '',
  'timezone': '',
  'theme': ''
}

class github extends Service {
      constructor(ctx, app) {
    super(ctx, app);

  }

  // https://docs.github.com/en/rest/reference/repos#create-or-update-file-contents
  async writeToGithub(uid, rawFile, title = 'title', filetype = 'md', salt = 'salt', branch = 'main') {

    if (uid === null) {
      // ctx.body = ctx.msg.failure;
      this.logger.info('invalid user id');
      return 3;
    }


    const userInfo = await this.app.mysql.query(
        `SELECT github.uid AS uid_g, github.access_token, github.article_repo,
        users.username, users.platform AS platform_u,
        user_accounts.account, user_accounts.uid AS uid_ua, user_accounts.platform AS platform_ua
        FROM github
        LEFT JOIN users ON users.id = github.uid
        LEFT JOIN user_accounts ON user_accounts.uid = users.id AND user_accounts.platform = 'github'
        WHERE github.uid = ?;`, [uid]
    )

    // 用户没有绑定github账号，下同，请重新使用GitHub进行登录
    if (userInfo.length === 0) {
      this.logger.info('githubService:: user info not exist');
      return 1;
    }

    // github部分（且重要的）信息缺失，请重新使用GitHub进行登录
    if (!(userInfo[0].access_token) || !(userInfo[0].article_repo) || !(userInfo[0].account)) {
      this.logger.info('githubService:: key missing');
      return 2;
    }

    const accessToken = userInfo[0].access_token;
    const articleRepo = userInfo[0].article_repo;
    // join了user_accounts表，取其中的account为github id，防止账号切换导致username变更
    const userGithubId = userInfo[0].account;
    const hash = await this.generateHash(title, salt);
    const parsedFile = await this.addPageInfo(rawFile, title);
    let buffer = new Buffer.from(parsedFile);
    const encodedText = buffer.toString('Base64');

    let updateGithubRepo = null;

    // 基本请求，user agent没有作用所以注释掉了
    try {
        updateGithubRepo = await axios({
        method: 'PUT',
        url: `https://api.github.com/repos/${userGithubId}/${articleRepo}/contents/source/_posts/${hash.folder}/${hash.hash}.${filetype}`,
        headers: {
          Authorization: 'token ' + accessToken,
          // 'User-Agent': 'matataki.io',
          accept: 'application/vnd.github.v3+json',
        },
        data: {
          message: 'Publish article',
          content: encodedText,
          branch: branch
        }
      });
    } catch (err) {
      this.logger.error('github upload error', err);
      this.logger.info('github upload error', err);
      return null;
    }

    if (!(updateGithubRepo.status === 201) || !(updateGithubRepo.statusText === 'Created')) {
      this.logger.info('incorrect status code, failed');
      // ctx.body = ctx.msg.failure;
      return null;
    }
    return hash.hash;
  }
  // https://docs.github.com/en/rest/reference/repos#get-repository-content


  async updateGithub(postid, rawFile, filetype = 'md', branch = 'main') {
    const article_info = await this.app.mysql.query(`
    SELECT posts.hash, posts.username AS username_p, posts.id AS pid, posts.uid AS uid_p,
    users.id AS userid, users.username AS username_u, users.platform AS platform_u,
    github.uid, github.access_token, github.article_repo,
    user_accounts.uid AS uid_ua, user_accounts.account, user_accounts.platform AS platform_ua
    FROM posts
    LEFT JOIN users ON users.id = posts.uid
    LEFT JOIN github ON github.uid = users.id
    LEFT JOIN user_accounts ON user_accounts.uid = users.id AND user_accounts.platform = 'github'
    WHERE posts.id = ?
    LIMIT 1;
    `, [ postid ]);

    if (article_info.length === 0) {
      // ctx.body = ctx.msg.failure;
      this.logger.info('githubService: user/article not exist');
      return 1;
    }

    if (article_info[0].hash.substring(0, 2) !== 'Gh') {
      this.logger.info('githubService:: not github hash');
      return 3;
    }

    if (!(article_info[0].access_token) || !(article_info[0].article_repo) || !(article_info[0].account)) {
      this.logger.info('githubService:: key missing');
      return 2;
    }

    const accessToken = article_info[0].access_token;
    const articleRepo = article_info[0].article_repo;
    const userGithubId = article_info[0].account;

    const folder = article_info[0].hash.substring(2, 6) + '/' + article_info[0].hash.substring(6, 8)
    
    // // 依据文件类型判断用哪个hash
    // let keepArticleHash;
    // if (filetype === 'html') {
    //   keepArticleHash = article_info[0].htmlHash;
    // } else {
    //   keepArticleHash = article_info[0].metadataHash;
    // }

    // 目前只需要取meta hash了，故不再需要选择
    const keepArticleHash = article_info[0].hash;

    let getGithubRepo = null;
  
    try {
      getGithubRepo = await axios({
        method: 'GET',
        url: `https://api.github.com/repos/${userGithubId}/${articleRepo}/contents/source/_posts/${folder}/${keepArticleHash}.${filetype}?ref=${branch}`,
        headers: {
          Authorization: 'token ' + accessToken,
          // 'User-Agent':'test.matataki.io' ,
          accept: 'application/vnd.github.v3+json',
        },
      });
    } catch (err) {
      this.logger.error('github upload error', err);
      this.logger.info('github upload error', err);
      return null;
    }
    if (!(getGithubRepo.status === 200) || !(getGithubRepo.statusText === 'OK')) {
      this.logger.info('get origin post incorrect status code, failed');
      // ctx.body = ctx.msg.failure;
      return null;
    }

    const origin_sha = getGithubRepo.data.sha;

    const parsedFile = await this.addPageInfo(rawFile);
    let buffer = new Buffer.from(parsedFile);
    const encodedText = buffer.toString('Base64');

    let updateGithubRepo = null;
    try {
        updateGithubRepo = await axios({
        method: 'PUT',
        url: `https://api.github.com/repos/${userGithubId}/${articleRepo}/contents/source/_posts/${folder}/${keepArticleHash}.${filetype}`,
        headers: {
          Authorization: 'token ' + accessToken,
          // 'User-Agent': 'test.matataki.io',
          accept: 'application/vnd.github.v3+json',
        },
        data: {
          message: 'Update article',
          sha: origin_sha,
          content: encodedText,
          branch: branch
        }
      });
    } catch (err) {
      this.logger.error('github upload error', err);
      this.logger.info('github upload error', err);
      return null;
    }

    if (!(updateGithubRepo.status === 200) || !(updateGithubRepo.statusText === 'OK')) {
      this.logger.info('incorrect status code, failed');

      return null;
    }
    return keepArticleHash;

  }

 // https://docs.github.com/en/rest/reference/repos#get-repository-content
 // 参数必须传入json那个hash
  async readFromGithub(hash, filetype = 'md', branch = 'main') {

    if (hash.substring(0, 2) !== 'Gh') {
      this.logger.info('invalid hash');
      return null;
    }

    const article_info = await this.app.mysql.query(`
    SELECT posts.hash, posts.username AS username_p, posts.uid AS uid_p, posts.title, posts.author,
    users.id, users.username AS username_u,
    github.uid AS uid_g, github.access_token, github.article_repo,
    user_accounts.uid AS uid_u, user_accounts.platform, user_accounts.account
    FROM posts
    LEFT JOIN users ON users.id = posts.uid
    LEFT JOIN github ON github.uid = users.id
    LEFT JOIN user_accounts ON user_accounts.uid = users.id AND user_accounts.platform = 'github'
    WHERE posts.hash = ?
    LIMIT 1;
    `, [ hash ]);

    // 此处不返回详细信息，直接null
    if (article_info.length === 0) {
      // ctx.body = ctx.msg.failure;
      this.logger.info('githubService:: user/article not exist');
      return null;
    }

    if (!(article_info[0].access_token) || !(article_info[0].article_repo) || !(article_info[0].account)) {
      this.logger.info('githubService:: key missing');
      return null;
    }

    const accessToken = article_info[0].access_token;
    const articleRepo = article_info[0].article_repo;
    const userGithubId = article_info[0].account;
    const keepArticleHash = article_info[0].hash;
    const folder = keepArticleHash.substring(2, 6) + '/' + keepArticleHash.substring(6, 8)
    let getGithubRepo = null;
  
    try {
      getGithubRepo = await axios({
        method: 'GET',
        url: `https://api.github.com/repos/${userGithubId}/${articleRepo}/contents/source/_posts/${folder}/${keepArticleHash}.${filetype}?ref=${branch}`,
        headers: {
          Authorization: 'token ' + accessToken,
          // 'User-Agent':'test.matataki.io' ,
          accept: 'application/vnd.github.v3+json',
        },
      });
    } catch (err) {
      this.logger.error('github upload error', err);
      this.logger.info('github upload error', err);
      return null;
    }
    if (!(getGithubRepo.status === 200) || !(getGithubRepo.statusText === 'OK')) {
      this.logger.info('incorrect status code, failed');
      // ctx.body = ctx.msg.failure;
      return null;
    }
    let buffer = new Buffer.from(getGithubRepo.data.content, 'base64')
    const decodedText = await this.deletePageInfo(buffer.toString());

    // const decodedContent = JSON.parse(decodedText);

    const readResponse = {
      title: article_info[0].title,
      author: article_info[0].author,
      github_id: userGithubId,
      content: decodedText
    }

    return JSON.stringify(readResponse);
  }

  // 运用模板创建，再添加workflow文件触发page渲染
  // 测试网模板，主网模板。模板地址应写为参数
  // https://docs.github.com/en/rest/reference/repos#create-a-repository-using-a-template
  async prepareRepo(uid) {

    if (uid === null) {
      // ctx.body = ctx.msg.failure;
      this.logger.info('invalid user id');
      return null;
    }

    const userInfo = await this.app.mysql.query(
      `SELECT github.uid AS uid_g, github.access_token, github.article_repo, github.site_status,
      users.username, users.platform AS platform_u,
      user_accounts.account, user_accounts.uid AS uid_ua, user_accounts.platform AS platform_ua
      FROM github
      LEFT JOIN users ON users.id = github.uid
      LEFT JOIN user_accounts ON user_accounts.uid = users.id AND user_accounts.platform = 'github'
      WHERE github.uid = ?;`, [uid]
    )

    if (userInfo.length === 0) {
      this.logger.info('githubService:: user info not exist');
      return null;
    }

    if (userInfo[0].site_status !== 0) {
      this.logger.info('githubService:: user info site already created');
      return null;
    } 

    const templateRepoInfo = {
      username: 'kumoram',
      repo: 'matataki-save-template'
    }
    const accessToken = userInfo[0].access_token;
    const articleRepo = userInfo[0].article_repo;
    const userGithubId = userInfo[0].account;

    let setSiteRepo = null;

    try {
      setSiteRepo = await axios({
        method: 'POST',
        url: `https://api.github.com/repos/${templateRepoInfo.username}/${templateRepoInfo.repo}/generate`,
        headers: {
          Authorization: 'token ' + accessToken,
          // 'User-Agent':'test.matataki.io' ,
          accept: 'application/vnd.github.baptiste-preview+json',
        },
        data: {
          name: articleRepo,
          description: 'generate my matataki site',
          include_all_branches: true
        }
      })
    } catch (err) {
      this.logger.error('githubService:: set site repo github upload error', err);
      return null;
    }

    if (!(setSiteRepo.status === 201) || !(setSiteRepo.statusText === 'Created')) {
      this.logger.info('githubService:: set site repo incorrect status code, failed');
      // ctx.body = ctx.msg.failure;
      return null;
    }
// // judge http status code!
    let editConfig = null;
    try {
      editConfig = await axios({
        method: 'GET',
        url: `https://api.github.com/repos/${userGithubId}/${articleRepo}/contents/_config.yml?ref=source`,
        headers: {
          Authorization: 'token ' + accessToken,
          // 'User-Agent':'test.matataki.io' ,
          accept: 'application/vnd.github.v3+json',
        },
      })
    } catch (err) {
      this.logger.error('githubService:: edit config github upload error', err);
      return null;
    }
  
    if (!(editConfig.status === 200) || !(editConfig.statusText === 'OK')) {
      this.logger.info('githubService:: edit config incorrect status code, failed');
      // ctx.body = ctx.msg.failure;
      return null;
    }

    let buffer = new Buffer.from(editConfig.data.content, 'base64')
    let configYml = buffer.toString();
    const origin_sha = editConfig.data.sha;

    configYml = configYml.replace(/site_name_to_be_replaced/g, articleRepo);
    configYml = configYml.replace(/username_to_be_replaced/g, userGithubId);

    let buffer2 = new Buffer.from(configYml);
    const encodedConfig = buffer2.toString('Base64');

    let updateConfig = null;
    try {
        updateConfig = await axios({
        method: 'PUT',
        url: `https://api.github.com/repos/${userGithubId}/${articleRepo}/contents/_config.yml`,
        headers: {
          Authorization: 'token ' + accessToken,
          // 'User-Agent': 'test.matataki.io',
          accept: 'application/vnd.github.v3+json',
        },
        data: {
          message: 'set config',
          sha: origin_sha,
          content: encodedConfig,
          branch: 'source'
        }
      });
    } catch (err) {
      this.logger.error('githubService:: update config github upload error', err);
      return null;
    }

    if (!(updateConfig.status === 200) || !(updateConfig.statusText === 'OK')) {
      this.logger.info('githubService:: update config incorrect status code, failed');
      // ctx.body = ctx.msg.failure;
      return null;
    }

    await this.app.mysql.query(
      `UPDATE github SET site_status = 1 WHERE uid = ?;`, [uid]
    )

    return 0;
  }

  // 检查repo名称是否已经存在
  async checkRepo(uid) {
    if (uid === null) {
      // ctx.body = ctx.msg.failure;
      this.logger.info('invalid user id');
      return null;
    }

    const userInfo = await this.app.mysql.query(
      `SELECT github.access_token, github.article_repo,
      user_accounts.account
      FROM github
      LEFT JOIN users ON users.id = github.uid
      LEFT JOIN user_accounts ON user_accounts.uid = users.id AND user_accounts.platform = 'github'
      WHERE github.uid = ?;`, [uid]
    )

    if (userInfo.length === 0) {
      this.logger.info('githubService:: user info not exist');
      return 3;
    }

    const accessToken = userInfo[0].access_token;
    const articleRepo = userInfo[0].article_repo;
    const userGithubId = userInfo[0].account;

    if (!userGithubId || !articleRepo || !accessToken) {
      this.logger.info('githubService:: user info(some keys) not exist');
      return 3;
    }

    let checkRepoExistence = null;
    try {
      checkRepoExistence = await axios({
        method: 'GET',
        url: `https://api.github.com/repos/${userGithubId}/${articleRepo}`,
        headers: {
          Authorization: 'token ' + accessToken,
          // 'User-Agent': 'test.matataki.io',
          accept: 'application/vnd.github.v3+json',
        }
      });

    } catch (err) {
      // not error!
      // 结果得到404，才是留空的，才是可用的
      if ((err.response.status === 404) && (err.response.statusText === 'Not Found')) {
        return 1;
      } else {
        this.logger.err('githubService:: update config github not 200 or 404', err);
        return null;
      }
    }

    // 200的时候会return 0
    return 0;
  }

  // 检查子站创建状态。如果未创建，是不能进行其他操作的
  async checkSite(uid) {
    if (uid === null) {
      // ctx.body = ctx.msg.failure;
      this.logger.info('invalid user id');
      return null;
    }

    const userInfo = await this.app.mysql.query(
      `SELECT github.site_status,
      user_accounts.account
      FROM github
      LEFT JOIN users ON users.id = github.uid
      LEFT JOIN user_accounts ON user_accounts.uid = users.id AND user_accounts.platform = 'github'
      WHERE github.uid = ?;`, [uid]
    )

    if (userInfo.length === 0) {
      this.logger.info('githubService:: user info not exist');
      return 3;
    }

    if (!userInfo[0].account) {
      this.logger.info('githubService:: user info(some keys) not exist');
      return 3;
    }

    return userInfo[0].site_status;
  }

  async readSiteSetting(uid) {
    if (uid === null) {
      // ctx.body = ctx.msg.failure;
      this.logger.info('invalid user id');
      return null;
    }

    const userInfo = await this.app.mysql.query(
      `SELECT github.uid AS uid_g, github.access_token, github.article_repo,
      users.username, users.platform AS platform_u,
      user_accounts.account, user_accounts.uid AS uid_ua, user_accounts.platform AS platform_ua
      FROM github
      LEFT JOIN users ON users.id = github.uid
      LEFT JOIN user_accounts ON user_accounts.uid = users.id AND user_accounts.platform = 'github'
      WHERE github.uid = ?;`, [uid]
    )

    if (userInfo.length === 0) {
      this.logger.info('githubService:: user info not exist');
      return null;
    }

    const accessToken = userInfo[0].access_token;
    const articleRepo = userInfo[0].article_repo;
    const userGithubId = userInfo[0].account;

    if (!userGithubId || !articleRepo || !accessToken) {
      this.logger.info('githubService:: user info(some keys) not exist');
      return null;
    }

   // judge http status code!
   let readConfig = null;
   try {
     readConfig = await axios({
       method: 'GET',
       url: `https://api.github.com/repos/${userGithubId}/${articleRepo}/contents/_config.yml?ref=source`,
       headers: {
         Authorization: 'token ' + accessToken,
         // 'User-Agent':'test.matataki.io' ,
         accept: 'application/vnd.github.v3+json',
       },
     })
   } catch (err) {
     this.logger.error('githubService:: edit config github upload error', err);
     return null;
   }

    const buffer = new Buffer.from(readConfig.data.content, 'base64');
    const configYml = buffer.toString();
    const configObject = YAML.parse(configYml);
    let usefulConfig = {};

    for (let everyConfig in requiredSiteConfigList) {
      usefulConfig[everyConfig] = configObject[everyConfig]
    }

    return usefulConfig;
  }

  async editSiteConfig(uid, requestObj) {
    if (uid === null) {
      // ctx.body = ctx.msg.failure;
      this.logger.info('invalid user id');
      return null;
    }

    const userInfo = await this.app.mysql.query(
      `SELECT github.uid AS uid_g, github.access_token, github.article_repo,
      users.username, users.platform AS platform_u,
      user_accounts.account, user_accounts.uid AS uid_ua, user_accounts.platform AS platform_ua
      FROM github
      LEFT JOIN users ON users.id = github.uid
      LEFT JOIN user_accounts ON user_accounts.uid = users.id AND user_accounts.platform = 'github'
      WHERE github.uid = ?;`, [uid]
    )

    if (userInfo.length === 0) {
      this.logger.info('githubService:: user info not exist');
      return null;
    }

    const accessToken = userInfo[0].access_token;
    const articleRepo = userInfo[0].article_repo;
    const userGithubId = userInfo[0].account;

    if (!userGithubId || !articleRepo || !accessToken) {
      this.logger.info('githubService:: user info(some keys) not exist');
      return null;
    }

   // judge http status code!
   let editConfig = null;
   try {
     editConfig = await axios({
       method: 'GET',
       url: `https://api.github.com/repos/${userGithubId}/${articleRepo}/contents/_config.yml?ref=source`,
       headers: {
         Authorization: 'token ' + accessToken,
         // 'User-Agent':'test.matataki.io' ,
         accept: 'application/vnd.github.v3+json',
       },
     })
   } catch (err) {
     this.logger.error('githubService:: edit config github upload error', err);
     return null;
   }
 
   if (!(editConfig.status === 200) || !(editConfig.statusText === 'OK')) {
     this.logger.info('githubService:: edit config incorrect status code, failed');
     // ctx.body = ctx.msg.failure;
     return null;
   }

   let buffer = new Buffer.from(editConfig.data.content, 'base64')
   let configYml = buffer.toString();
   const origin_sha = editConfig.data.sha;

   let configObject = YAML.parse(configYml);

  for (let everyConfig in requiredSiteConfigList) {
    if (requestObj[everyConfig]) {
      configObject[everyConfig] = requestObj[everyConfig];
    }
  }

   configYml = YAML.stringify(configObject);

   let buffer2 = new Buffer.from(configYml);
   const encodedConfig = buffer2.toString('Base64');

   let updateConfig = null;
   try {
       updateConfig = await axios({
       method: 'PUT',
       url: `https://api.github.com/repos/${userGithubId}/${articleRepo}/contents/_config.yml`,
       headers: {
         Authorization: 'token ' + accessToken,
         // 'User-Agent': 'test.matataki.io',
         accept: 'application/vnd.github.v3+json',
       },
       data: {
         message: 'set config',
         sha: origin_sha,
         content: encodedConfig,
         branch: 'source'
       }
     });
   } catch (err) {
     this.logger.error('githubService:: update config github upload error', err);
     return null;
   }

       if (!(updateConfig.status === 200) || !(updateConfig.statusText === 'OK')) {
     this.logger.info('githubService:: update config incorrect status code, failed');
     // ctx.body = ctx.msg.failure;
     return null;
   }

    return 0;
  }


  // 哈希函数，用于生成GitHub文件名
  async generateHash(title, salt) {
      const prefix = 'Gh';
      const folder = moment().format('YYYY/MM');
      const month = folder.replace('/', '');
      // const now = moment().format('YYYY-MM-DD HH:mm:ss');
      // used for hash
      const now = moment().format('x');
      const shasum = crypto.createHash('sha256');
      shasum.update(title + now + salt);
      let finalHash = prefix + month + shasum.digest('hex');
      finalHash = finalHash.substring(0, 40);
      return { hash:finalHash, folder }
  }

  // 需要生成pages，储存的不是纯md原文，需要加上一些信息。
  // 指定格式。需提示用户：错误地修改格式可能会导致无法在matataki、子站上显示等错误
  // https://hexo.io/docs/front-matter.html
  async addPageInfo(rawPost, title) {
    const timeTag = moment().format('YYYY-MM-DD HH:mm:ss');
    const parsedPost = 
`---
title: ${title}
date: ${timeTag}
---
${rawPost}`;

    return parsedPost;
  }

  async deletePageInfo(rawPost) {
    const splitPost = rawPost.split('---', 3);

    // 没有分成3段，表示原格式错误，返回空串。否则取值会出错。
    if (splitPost.length < 3) {
      return ''
    }
    return splitPost[2];

  }
}
module.exports = github;
