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

const supportedThemeInfo = {
  // 'Nexmoe': {'hexo-theme-nexmoe': '^2.8.0', 'hexo-wordcount': '^6.0.1'},
  'landscape': {'hexo-theme-landscape': '^0.0.3'},
  'cake': {'hexo-theme-cake': '^3.4.1'},
  'stellar': {'hexo-theme-stellar': '^1.1.0'},
  'next': {'hexo-theme-next': '^8.4.0'},
  'kaze': {'hexo-theme-kaze': '^1.0.5'}
}

class github extends Service {
      constructor(ctx, app) {
    super(ctx, app);

  }

  //发布文章到GitHub
  // https://docs.github.com/en/rest/reference/repos#create-or-update-file-contents
  async writeToGithub(uid, rawFile, title = 'title', filetype = 'md', salt = 'salt', branch = 'main', tags = []) {

    this.logger.info('githubService:: writeToGithub loaded', uid);
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
    const parsedFile = await this.addPageInfo(rawFile, title, tags);
    let buffer = new Buffer.from(parsedFile);
    const encodedText = buffer.toString('Base64');

    this.logger.info('githubService:: writeToGithub request ', uid, userGithubId, articleRepo);

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
    this.logger.info('githubService:: writeToGithub end', uid);
    return hash.hash;
  }

  // 编辑文章
  // https://docs.github.com/en/rest/reference/repos#get-repository-content
  async updateGithub(postid, rawFile, title = 'title', filetype = 'md', branch = 'main', tags = []) {

    this.logger.info('githubService:: updateGithub loaded', postid);
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
    this.logger.info('githubService:: updateGithub request ', postid, userGithubId, articleRepo);
    // // 依据文件类型判断用哪个hash
    // let keepArticleHash;
    // if (filetype === 'html') {
    //   keepArticleHash = article_info[0].htmlHash;
    // } else {
    //   keepArticleHash = article_info[0].metadataHash;
    // }

    // 目前只需要取meta hash了，故不再需要选择
    const keepArticleHash = article_info[0].hash;

    this.logger.info('githubService:: updateGithub ready for request1', postid);
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

    const parsedFile = await this.addPageInfo(rawFile, title, tags);
    let buffer = new Buffer.from(parsedFile);
    const encodedText = buffer.toString('Base64');

    this.logger.info('githubService:: updateGithub ready for request2', postid);
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
    this.logger.info('githubService:: updateGithub loaded', postid);
    return keepArticleHash;

  }

  // 读取文章
  // 参数必须传入json那个hash
  // https://docs.github.com/en/rest/reference/repos#get-repository-content
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
      github_repo: articleRepo,
      content: decodedText
    }

    return JSON.stringify(readResponse);
  }

  // 转移GitHub文章，会复制一篇文章到接收方的repo下
  async transferGithub(postid, toUser, filetype = 'md', branch = 'main') {

    this.logger.info('githubService:: transferGithub loaded', postid, toUser);
    const userInfo = await this.app.mysql.query(
      `SELECT posts.hash, posts.uid AS uid_p,
      users.id,
      github.uid AS uid_g, github.access_token, github.article_repo,
      user_accounts.uid AS uid_u, user_accounts.account
      FROM posts
      LEFT JOIN users ON users.id = posts.uid
      LEFT JOIN github ON github.uid = users.id
      LEFT JOIN user_accounts ON user_accounts.uid = users.id AND user_accounts.platform = 'github'
      WHERE posts.id = ?
      LIMIT 1;

      SELECT github.access_token, github.article_repo, github.site_status,
      users.id,
      user_accounts.account
      FROM github
      LEFT JOIN users ON users.id = github.uid
      LEFT JOIN user_accounts ON user_accounts.uid = users.id AND user_accounts.platform = 'github'
      WHERE github.uid = ?;`, [postid, toUser]
    );

    // if (userInfo[0][0].id !== fromUser) {
    //   return null;
    // }

    // 检查对方的信息，确认是GitHub用户且有子站
    if ((userInfo[0].length === 0) || (userInfo[1].length) === 0) {
      return 7;
    }

    if (!userInfo[1][0].access_token || !userInfo[1][0].article_repo || !userInfo[1][0].account) {
      return 7;
    }

    if (userInfo[1][0].site_status !== 1) {
      return 7;
    }

    // 检查己方的信息
    if (!userInfo[0][0].access_token || !userInfo[0][0].article_repo || !userInfo[0][0].account) {
      return 8;
    }

    const fromUserInfo = {
      accessToken: userInfo[0][0].access_token,
      articleRepo: userInfo[0][0].article_repo,
      userGithubId: userInfo[0][0].account,
      keepArticleHash: userInfo[0][0].hash,
    }

    const toUserInfo = {
      accessToken: userInfo[1][0].access_token,
      articleRepo: userInfo[1][0].article_repo,
      userGithubId: userInfo[1][0].account,
    }

    this.logger.info('githubService:: transferGithub from ', fromUserInfo.userGithubId, fromUserInfo.articleRepo);
    this.logger.info('githubService:: transferGithub to ', toUserInfo.userGithubId, toUserInfo.articleRepo);

    const folder = fromUserInfo.keepArticleHash.substring(2, 6) + '/' + fromUserInfo.keepArticleHash.substring(6, 8);
    let fromGithubRepo = null;
  
    // 获取文章
    try {
      fromGithubRepo = await axios({
        method: 'GET',
        url: `https://api.github.com/repos/${fromUserInfo.userGithubId}/${fromUserInfo.articleRepo}/contents/source/_posts/${folder}/${fromUserInfo.keepArticleHash}.${filetype}?ref=${branch}`,
        headers: {
          Authorization: 'token ' + fromUserInfo.accessToken,
          // 'User-Agent':'test.matataki.io' ,
          accept: 'application/vnd.github.v3+json',
        },
      });
    } catch (err) {
      this.logger.error('github upload error', err);
      return 9;
    }
    if (!(fromGithubRepo.status === 200) || !(fromGithubRepo.statusText === 'OK')) {
      this.logger.info('incorrect status code, failed');
      // ctx.body = ctx.msg.failure;
      return 9;
    }

    const encodedText = fromGithubRepo.data.content;
    let toGithubRepo = null;

    // 上传文章
    // 基本请求，user agent没有作用所以注释掉了
    try {
        toGithubRepo = await axios({
        method: 'PUT',
        url: `https://api.github.com/repos/${toUserInfo.userGithubId}/${toUserInfo.articleRepo}/contents/source/_posts/${folder}/${fromUserInfo.keepArticleHash}.${filetype}`,
        headers: {
          Authorization: 'token ' + toUserInfo.accessToken,
          // 'User-Agent': 'matataki.io',
          accept: 'application/vnd.github.v3+json',
        },
        data: {
          message: 'Transfer article',
          content: encodedText,
          branch: branch
        }
      });
    } catch (err) {
      this.logger.error('github upload error', err);
      return 9;
    }

    if (!(toGithubRepo.status === 201) || !(toGithubRepo.statusText === 'Created')) {
      this.logger.info('incorrect status code, failed');
      // ctx.body = ctx.msg.failure;
      return 9;
    }
    this.logger.info('githubService:: transferGithub end', postid, toUser);
    return 0;
  }

  // 运用模板创建，再添加workflow文件触发page渲染
  // 测试网模板，主网模板。模板地址应写为参数
  // https://docs.github.com/en/rest/reference/repos#create-a-repository-using-a-template
  async prepareRepo(uid) {
    this.logger.info('githubService:: prepareRepo loaded', uid);
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
      username: this.ctx.app.config.github.templateRepoOwner,
      repo: this.ctx.app.config.github.templateRepoName
    }
    const accessToken = userInfo[0].access_token;
    const articleRepo = userInfo[0].article_repo;
    const userGithubId = userInfo[0].account;

    this.logger.info('githubService:: start to create site for ', uid, userGithubId, articleRepo);

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

    await this.app.mysql.query(
      `UPDATE github SET site_status = 1 WHERE uid = ?;`, [uid]
    )
    this.logger.info('githubService:: prepareRepo completed', uid);
    return 0;
  }

  // 创建repo步骤2：设置默认config
  async prepareConfig(uid) {
    this.logger.info('githubService:: prepareConfig loaded', uid);
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

    // if (userInfo[0].site_status !== 0) {
    //   this.logger.info('githubService:: user info site already created');
    //   return null;
    // } 

    const accessToken = userInfo[0].access_token;
    const articleRepo = userInfo[0].article_repo;
    const userGithubId = userInfo[0].account;

    this.logger.info('githubService:: start to set default config for ', uid, userGithubId, articleRepo);

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

    this.logger.info('githubService:: prepareConfig current', configYml);
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

    this.logger.info('githubService:: prepareConfig end', uid);
    return 0;
  }

  // 检查repo名称是否已经存在
  async checkRepo(uid) {
    if (uid === null) {
      // ctx.body = ctx.msg.failure;
      this.logger.info('invalid user id');
      return {
        code: null,
        data: null
      };
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
      return {
        code: 3,
        data: null
      };
    }

    const accessToken = userInfo[0].access_token;
    const articleRepo = userInfo[0].article_repo;
    const userGithubId = userInfo[0].account;

    if (!userGithubId || !articleRepo || !accessToken) {
      this.logger.info('githubService:: user info(some keys) not exist');
      return {
        code: 3,
        data: null
      };
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
        return {
          code: 1,
          data: { articleRepo }
        };
      } else {
        this.logger.error('githubService:: update config github not 200 or 404', err);
        return {
          code: null,
          data: null
        };
      }
    }

    // 200的时候会return 0
    return {
      code: 0,
      data: { articleRepo }
    };
  }

  // 检查子站创建状态。如果未创建，是不能进行其他操作的
  async checkSite(uid, requireLink = false) {
    if (uid === null) {
      // ctx.body = ctx.msg.failure;
      this.logger.info('invalid user id');
      return {
        code: null,
        data: null
      };
    }

    const userInfo = await this.app.mysql.query(
      `SELECT github.site_status, github.article_repo,
      user_accounts.account
      FROM github
      LEFT JOIN users ON users.id = github.uid
      LEFT JOIN user_accounts ON user_accounts.uid = users.id AND user_accounts.platform = 'github'
      WHERE github.uid = ?;`, [uid]
    )

    if (userInfo.length === 0) {
      this.logger.info('githubService:: user info not exist');
      return {
        code: 3,
        data: null
      };
    }

    if (!(userInfo[0].account) || !(userInfo[0].article_repo)) {
      this.logger.info('githubService:: user info(some keys) not exist');
      return {
        code: 3,
        data: null
      };
    }

    let siteObject = { 
      code: userInfo[0].site_status, 
      data: null
    };

    if (requireLink) {
      const siteLink = await this.judgeSiteLink(userInfo[0].account, userInfo[0].article_repo);
      siteObject.data = { siteLink };
    }

    return siteObject;
  }

  // 查看GitHub pages的渲染状态
  async checkPages(uid) {
    if (uid === null) {
      // ctx.body = ctx.msg.failure;
      this.logger.info('invalid user id');
      return {
        code: null,
        data: null
      };
    }

    const userInfo = await this.app.mysql.query(
      `SELECT github.site_status, github.article_repo, github.access_token,
      user_accounts.account
      FROM github
      LEFT JOIN users ON users.id = github.uid
      LEFT JOIN user_accounts ON user_accounts.uid = users.id AND user_accounts.platform = 'github'
      WHERE github.uid = ?;`, [uid]
    )

    if (userInfo.length === 0) {
      this.logger.info('githubService:: user info not exist');
      return {
        code: 3,
        data: null
      };
    }

    const accessToken = userInfo[0].access_token;
    const articleRepo = userInfo[0].article_repo;
    const userGithubId = userInfo[0].account;

    if (!userGithubId || !articleRepo || !accessToken) {
      this.logger.info('githubService:: user info(some keys) not exist');
      return {
        code: 3,
        data: null
      };
    }

    let getPageStatus = null;

    try {
      getPageStatus = await axios({
        method: 'GET',
        url: `https://api.github.com/repos/${userGithubId}/${articleRepo}/pages`,
        headers: {
          Authorization: 'token ' + accessToken,
          // 'User-Agent': 'test.matataki.io',
          accept: 'application/vnd.github.v3+json',
        }
      });

    } catch (err) {
      if ((err.response.status === 404) && (err.response.statusText === 'Not Found')) {
        return {
          code: 0,
          data: { 
            status: err.response.data.status || 'Not Found',
            url: err.response.data.html_url || '',
          }
        };
      } else {
        this.logger.error('githubService:: pages status not 200 or 404', err);
        return {
          code: 4,
          data: null
        };
      }
    }

    return {
      code: 0,
      data: { 
        status: getPageStatus.data.status,
        url: getPageStatus.data.html_url,
      }
    }
  }

  // 读取hexo子站设置
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

    const siteLink = await this.judgeSiteLink(userGithubId, articleRepo);
    usefulConfig['siteLink'] = siteLink;

    return usefulConfig;
  }

  // 设置hexo子站设置
  async editSiteConfig(uid, requestObj) {

    this.logger.info('githubService:: editSiteConfig loaded', uid);
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
   const formerTheme = configObject.theme;

   // 修改 config yml
  for (let everyConfig in requiredSiteConfigList) {
    // 注意是undefined。符合需求的设置，即使是空字符串也要。（需要再三确认）
    if (requestObj[everyConfig] !== undefined) {
      configObject[everyConfig] = requestObj[everyConfig];
    }
  }

  configYml = YAML.stringify(configObject);
  this.logger.info('githubService:: edit config:', configYml);

   let buffer2 = new Buffer.from(configYml);
   const encodedConfig = buffer2.toString('Base64');

  // 主题需要单独处理
  const targetTheme = requestObj['theme'];
  // 有主题这项
  if (targetTheme !== undefined) {
    // 目标主题与以前不同，才需更改。
    if (formerTheme !== targetTheme) {
      // 目标主题受支持，才进行请求，更改package json 内容。否则只更新 config yml
      if (supportedThemeInfo[targetTheme]) {
        this.logger.info('githubService:: editSiteConfig need to edit theme', uid);
        let editDependence = null;
        try {
          editDependence = await axios({
            method: 'GET',
            url: `https://api.github.com/repos/${userGithubId}/${articleRepo}/contents/package.json?ref=source`,
            headers: {
              Authorization: 'token ' + accessToken,
              // 'User-Agent':'test.matataki.io' ,
              accept: 'application/vnd.github.v3+json',
            },
          })
        } catch (err) {
          this.logger.error('githubService:: edit dependence github upload error', err);
          return null;
        }
      
        if (!(editDependence.status === 200) || !(editDependence.statusText === 'OK')) {
          this.logger.info('githubService:: edit dependence incorrect status code, failed');
          // ctx.body = ctx.msg.failure;
          return null;
        }
    
        let buffer3 = new Buffer.from(editDependence.data.content, 'base64')
        let packageJson = buffer3.toString();
        let packageObj = JSON.parse(packageJson);
        const packageSha = editDependence.data.sha;
        // let dependenceObj = packageObj.dependence;
    
        for (let everyDep in packageObj['dependencies']) {
          if (/hexo-theme-[a-zA-Z\-]{1,20}/.test(everyDep)) {
            delete packageObj['dependencies'][everyDep];
          }
        }
    
        for (let everyPkg in supportedThemeInfo[targetTheme]) {
          packageObj['dependencies'][everyPkg] = supportedThemeInfo[targetTheme][everyPkg];
        }

        packageJson = JSON.stringify(packageObj, null, '\t');
        this.logger.info('githubService:: edit package:', packageJson);

        let buffer4 = new Buffer.from(packageJson);
        const encodedDependence = buffer4.toString('Base64');

        this.logger.info('githubService:: editSiteConfig request package json', uid);
        let updateDependence = null;
        try {
            updateDependence = await axios({
            method: 'PUT',
            url: `https://api.github.com/repos/${userGithubId}/${articleRepo}/contents/package.json`,
            headers: {
              Authorization: 'token ' + accessToken,
              // 'User-Agent': 'test.matataki.io',
              accept: 'application/vnd.github.v3+json',
            },
            data: {
              message: 'set package',
              sha: packageSha,
              content: encodedDependence,
              branch: 'source'
            }
          });
        } catch (err) {
          this.logger.error('githubService:: update config github upload error', err);
          return null;
        }
    
            if (!(updateDependence.status === 200) || !(updateDependence.statusText === 'OK')) {
          this.logger.info('githubService:: update config incorrect status code, failed');
          // ctx.body = ctx.msg.failure;
          return null;
        }
        
      } else {
        // 即使目标主题不在支持列表，仍然
        this.logger.info('githubService:: target theme not exist, set as their mind');
      }
    }
  }

  this.logger.info('githubService:: editSiteConfig request config yml', uid);
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

    this.logger.info('githubService:: editSiteConfig end', uid);
    return 0;
  }

  // 返回主题列表，若有。
  async useableConfigList(uid) {
    this.logger.info('githubService: useConfigList', uid);
    let useThemeList = [];
    for (let everyTheme in supportedThemeInfo) {
      useThemeList.push(everyTheme);
     }
    return useThemeList;
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
  async addPageInfo(rawPost, title, tags = []) {
    const timeTag = moment().format('YYYY-MM-DD HH:mm:ss');
    let pageInfoJson = {};
    if (tags === []) {
      pageInfoJson = { title: title, date: timeTag };
    } else {
      pageInfoJson = { title: title, date: timeTag, tags: tags };
    }
    const pageInfoYml = YAML.stringify(pageInfoJson);
    const parsedPost = `---\n${pageInfoYml}---\n${rawPost}`;

    console.log(timeTag);
    console.log(pageInfoJson);
    console.log(pageInfoYml);
    console.log(parsedPost);

    return parsedPost;
  }

  // 用于判断用户是username.github.io 还是username.github.io/repo_name 形式
  // 同时返回正确的子站link
  // 自定义域名暂不考虑
  async judgeSiteLink(username, repo_name) {
    if (repo_name === `${username}.github.io`) {
      return `https://${repo_name}/`;
    } else {
      return `https://${username}.github.io/${repo_name}/`;
    }
  }

  // 消除md文件中的hexo头部信息
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
