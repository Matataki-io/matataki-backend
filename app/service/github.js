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
class github extends Service {
      constructor(ctx, app) {
    super(ctx, app);

  }

  // https://docs.github.com/en/rest/reference/repos#create-or-update-file-contents
  async writeToGithub(uid, rawFile, title = 'title', filetype = 'html', salt = 'salt') {

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
    if (!(userInfo[0].access_token) || !(userInfo[0].article_repo)) {
      this.logger.info('githubService:: key missing');
      return 2;
    }


    const accessToken = userInfo[0].access_token;
    const articleRepo = userInfo[0].article_repo;
    // join了user_accounts表，取其中的account为github id，防止账号切换导致username变更
    const userGithubId = userInfo[0].account;
    const hash = await this.generateHash(title, salt);
    let buffer = new Buffer.from(rawFile);
    const encodedText = buffer.toString('Base64');

    let updateGithubRepo = null;

    // 基本请求，user agent没有作用所以注释掉了
    try {
        updateGithubRepo = await axios({
        method: 'PUT',
        url: `https://api.github.com/repos/${userGithubId}/${articleRepo}/contents/${hash.folder}/${hash.hash}.${filetype}`,
        headers: {
          Authorization: 'token ' + accessToken,
          // 'User-Agent': 'matataki.io',
          accept: 'application/vnd.github.v3+json',
        },
        data: {
          message: 'Publish article',
          content: encodedText
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


  async updateGithub(postid, rawFile, filetype = 'html') {
    const article_info = await this.app.mysql.query(`
    SELECT posts.hash, posts.username AS username_p, posts.id AS pid, posts.uid AS uid_p,
    users.id AS userid, users.username AS username_u, users.platform AS paltform_u,
    github.uid, github.access_token, github.article_repo,
    user_accounts.uid AS uid_ua, user_accounts.account, user_accounts.platform AS platform_u,
    post_ipfs.metadataHash, post_ipfs.htmlHash
    FROM posts
    LEFT JOIN users ON users.id = posts.uid
    LEFT JOIN github ON github.uid = users.id
    LEFT JOIN user_accounts ON user_accounts.uid = users.id AND user_accounts.platform = 'github'
    LEFT JOIN post_ipfs ON articleId = posts.id
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

    if (!(article_info[0].access_token) || !(article_info[0].article_repo)) {
      this.logger.info('githubService:: key missing');
      return 2;
    }

    const accessToken = article_info[0].access_token;
    const articleRepo = article_info[0].article_repo;
    const userGithubId = article_info[0].account;

    const folder = article_info[0].hash.substring(2, 6) + '/' + article_info[0].hash.substring(6, 8)
    
    // 依据文件类型判断用哪个hash
    let keepArticleHash;
    if (filetype === 'html') {
      keepArticleHash = article_info[0].htmlHash;
    } else {
      keepArticleHash = article_info[0].metadataHash;
    }

    let getGithubRepo = null;
  
    try {
      getGithubRepo = await axios({
        method: 'GET',
        url: `https://api.github.com/repos/${userGithubId}/${articleRepo}/contents/${folder}/${keepArticleHash}.${filetype}`,
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

    let buffer = new Buffer.from(rawFile);
    const encodedText = buffer.toString('Base64');

    let updateGithubRepo = null;
    try {
        updateGithubRepo = await axios({
        method: 'PUT',
        url: `https://api.github.com/repos/${userGithubId}/${articleRepo}/contents/${folder}/${keepArticleHash}.${filetype}`,
        headers: {
          Authorization: 'token ' + accessToken,
          // 'User-Agent': 'test.matataki.io',
          accept: 'application/vnd.github.v3+json',
        },
        data: {
          message: 'Update article',
          sha: origin_sha,
          content: encodedText
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
  async readFromGithub(hash, filetype = 'html') {

    if (hash.substring(0, 2) !== 'Gh') {
      this.logger.info('invalid hash');
      return null;
    }

    const article_info = await this.app.mysql.query(`
    SELECT posts.hash, posts.username AS username_p, posts.uid AS uid_p,
    users.id, users.username AS username_u,
    github.uid AS uid_g, github.access_token, github.article_repo,
    user_accounts.uid AS uid_u, user_accounts.platform, user_accounts.account,
    post_ipfs.metadataHash, post_ipfs.htmlHash, post_ipfs.articleId
    FROM posts
    LEFT JOIN users ON users.id = posts.uid
    LEFT JOIN github ON github.uid = users.id
    LEFT JOIN user_accounts ON user_accounts.uid = users.id AND user_accounts.platform = 'github'
    LEFT JOIN post_ipfs ON post_ipfs.articleId = posts.id
    WHERE posts.hash = ?
    LIMIT 1;
    `, [ hash ]);

    // 此处不返回详细信息，直接null
    if (article_info.length === 0) {
      // ctx.body = ctx.msg.failure;
      this.logger.info('githubService:: user/article not exist');
      return null;
    }

    if (!(article_info[0].access_token) || !(article_info[0].article_repo)) {
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
        url: `https://api.github.com/repos/${userGithubId}/${articleRepo}/contents/${folder}/${keepArticleHash}.${filetype}`,
        headers: {
          Authorization: 'token ' + accessToken,
          'User-Agent':'test.matataki.io' ,
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
    const decodedText = buffer.toString();
    return decodedText;
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
      const finalHash = prefix + month + shasum.digest('hex');
      return { hash:finalHash, folder }
  }
}
module.exports = github;
