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
    // const { host, port, protocol } = this.config.ipfs_service;
    // this.ipfs = new IPFS({
    //   host,
    //   port,
    //   protocol,
    // });
  }
  // async writeMetadata(uid, rawFile, title = 'title') {
  //   if (uid === null) {
  //     // ctx.body = ctx.msg.failure;
  //     this.logger.info('invalid user id');
  //     return null;
  //   }
  //   const github = await this.app.mysql.get('github', { 'uid': uid });
  //   const userInfo = await this.app.mysql.query('SELECT username FROM users WHERE id = ?;', [uid]);
  //   const accessToken = github.access_token;
  //   const articleRepo = github.article_repo;
  //   const userGithubId = userInfo[0].username;
  //   const hash = await this.generateHash(title);
  //   let buffer = new Buffer.from(rawFile);
  //   const encodedText = buffer.toString('Base64');
  //   let updateGithubRepo = null;
  //   try {
  //       updateGithubRepo = await axios({
  //       method: 'PUT',
  //       url: `https://api.github.com/repos/${userGithubId}/${articleRepo}/contents/${hash.folder}/${hash.hash}.html`,
  //       headers: {
  //         Authorization: 'token ' + accessToken,
  //         'User-Agent': 'test.matataki.io',
  //         accept: 'application/vnd.github.v3+json',
  //       },
  //       data: {
  //         message: 'upload rendered',
  //         content: encodedText
  //       }
  //     });
  //   } catch (err) {
  //     this.logger.error(err);
  //     return null;
  //   }
  //   // console.log(updateGithubRepo);
  //   // return......
  //   //     ctx.body = {
  //   //   ...ctx.msg.success,
  //   //   info: updateGithubRepo.data,
  //   //   data: title,
  //   // }
  //   if (!(updateGithubRepo.status === 201) || !(updateGithubRepo.statusText === 'Created')) {
  //     this.logger.info('incorrect status code, failed');
  //     // ctx.body = ctx.msg.failure;
  //     return null;
  //   }
  //   return hash.hash;
  // }
    
  // https://docs.github.com/en/rest/reference/repos#create-or-update-file-contents
  async writeToGithub(uid, rawFile, title = 'title', filetype = 'html', salt = 'salt') {
  // async writeToGithub(articleBody) {
    // const { ctx } = this;
    // const uid = this.ctx.user.id;
    // const { uid } = ctx.params;
    // const { token } = ctx.query;
    // const uid = this.decode(token);
    // const ctx = this.ctx;
    // const userid = ctx.user.id;
    if (uid === null) {
      // ctx.body = ctx.msg.failure;
      this.logger.info('invalid user id');
      return null;
    }
    // const github = await this.app.mysql.get('github', { 'uid': uid });
    // const userInfo = await this.app.mysql.query('SELECT username FROM users WHERE id = ?;', [uid]);


    const userInfo = await this.app.mysql.query(
        `SELECT github.uid, github.access_token, github.article_repo, users.username, users.platform FROM github
        LEFT JOIN users ON users.id = github.uid
        WHERE github.uid = ?;`, [uid]
    )

    if (userInfo.length === 0) {
        this.logger.info('user not exist');
        return null;
    }

    if (userInfo[0].platform !== 'github') {
        this.logger.info('maybe not a github user');
        return null;
    }

    const accessToken = userInfo[0].access_token;
    const articleRepo = userInfo[0].article_repo;
    const userGithubId = userInfo[0].username;
    const hash = await this.generateHash(title, salt);
    let buffer = new Buffer.from(rawFile);
    const encodedText = buffer.toString('Base64');
    // const writePath = moment().format('YYYY-MM-DD HH:mm:ss');
    // generate hash
    // try??
    let updateGithubRepo = null;
    try {
        updateGithubRepo = await axios({
        method: 'PUT',
        url: `https://api.github.com/repos/${userGithubId}/${articleRepo}/contents/${hash.folder}/${hash.hash}.${filetype}`,
        headers: {
          Authorization: 'token ' + accessToken,
          'User-Agent': 'test.matataki.io',
          accept: 'application/vnd.github.v3+json',
        },
        data: {
          message: 'upload rendered',
          content: encodedText
        }
      });
    } catch (err) {
      this.logger.error('github upload error', err);
      this.logger.info('github upload error', err);
      return null;
    }
    // console.log(updateGithubRepo);
    // return......
    //     ctx.body = {
    //   ...ctx.msg.success,
    //   info: updateGithubRepo.data,
    //   data: title,
    // }
    if (!(updateGithubRepo.status === 201) || !(updateGithubRepo.statusText === 'Created')) {
      this.logger.info('incorrect status code, failed');
      // ctx.body = ctx.msg.failure;
      return null;
    }
    return hash.hash;
  }
  // https://docs.github.com/en/rest/reference/repos#get-repository-content
  // async readFromGithub(hash) {
  //   const { ctx } = this;
  //   // const uid = this.ctx.user.id;
  //   // const { uid } = ctx.params;
  //   const { token, githubRepo } = ctx.query;
  //   const uid = this.decode(token);
  //   if (uid === null) {
  //     ctx.body = ctx.msg.failure;
  //     return;
  //   }
  //   const github = this.app.mysql.get('github', { uid });
  //   const accessToken = github.access_token;
  //   const articleRepo = github.article_repo;
  //   const userGithubId = github.user_id;
  //   const getGithubRepo = await axios({
  //     method: 'GET',
  //     url: `https://api.github.com/repo/${userGithubId}/${articleRepo}/contents/${hash}`,
  //     headers: {
  //       Authorization: 'token ' + accessToken,
  //       'User-Agent': this.ctx.app.config.github.appName,
  //       accept: 'application/vnd.github.v3+json',
  //     },
  //   });
  //   console.log(updateGithubRepo);
  //   // return......
  //   ctx.body = {
  //     ...ctx.msg.success,
  //     // content
  //     data: 'Ghq-march-22-2021.md',
  //   }
  // }
 // https://docs.github.com/en/rest/reference/repos#get-repository-content
  async readFromGithub(hash, filetype = 'html') {
    const article_info = await this.app.mysql.query(`
    SELECT posts.hash, posts.username AS username_p,
    users.id, users.username AS username_u,
    github.uid, github.access_token, github.article_repo
    FROM posts
    LEFT JOIN users ON posts.username = users.username
    LEFT JOIN github ON github.uid = users.id
    WHERE posts.hash = ?;
    `, [ hash ]);
    // verify Gh prefix?
    if (article_info.length === 0) {
      // ctx.body = ctx.msg.failure;
      this.logger.info('article not exist');
      return null;
    }
    if (article_info[0].hash.substring(0, 2) !== 'Gh') {
      this.logger.info('invalid hash');
      return null;
    }
    const folder = article_info[0].hash.substring(2, 6) + '/' + article_info[0].hash.substring(6, 8)
    let getGithubRepo = null;
  
    try {
      getGithubRepo = await axios({
        method: 'GET',
        url: `https://api.github.com/repos/${article_info[0].username_u}/${article_info[0].article_repo}/contents/${folder}/${article_info[0].hash}.${filetype}`,
        headers: {
          Authorization: 'token ' + article_info[0].access_token,
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
  // hash, for article title only
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