'use strict';

// import { axios } from 'axios';
const axios = require('axios').default
const amqp = require('amqplib');
const { Controller } = require('egg');
const fs = require('fs');
const jwt = require('jwt-simple');

class GithubController extends Controller {
  async index() {
    const { ctx } = this;
    // const uid = this.ctx.user.id;
    // const { uid } = ctx.params;
    const { token, githubRepo } = ctx.query;
    const uid = this.decode(token);
    if (uid === null) {
      ctx.body = ctx.msg.failure;
      return;
    }
    const github = this.app.mysql.get('github', { uid });
    const accessToken = github.access_token;
    const res = await axios.get('https://api.github.com/user/repos', {
      headers: {
        Authorization: `token ${accessToken}`
      }
    });
    let repos = JSON.parse(res);
    let repoList = repos.map(repo => repo.full_name);
    ctx.body = {
      ...ctx.msg.success,
      data: repoList,
    }
  }
  async sync() {
    const { ctx } = this;
    // const uid = this.ctx.user.id;
    // const { uid } = ctx.params;
    const { token, githubRepo } = ctx.query;
    const uid = this.decode(token);
    if (uid === null) {
      ctx.body = ctx.msg.failure;
      return;
    }
    const github = this.app.mysql.get('github', { uid });
    const accessToken = github.access_token;
    // uid, accessToken, githubRepo
    let conn = await amqp.connect(ctx.app.config.amqp.url);
    let chan = await conn.createChannel();
    await chan.assertQueue('github-sync', { durable: false });
    chan.sendToQueue(ctx.app.config.amqp.githubSyncQueueName, Buffer.from(JSON.stringify({
      uid,
      accessToken,
      githubRepo,
    })));
    await conn.close();
  }

  // https://docs.github.com/en/rest/reference/repos#get-repository-content
  // async getGithub() {
    // const { ctx } = this;
    // // const uid = this.ctx.user.id;
    // // const { uid } = ctx.params;
    // const { token, githubRepo } = ctx.query;
    // const uid = this.decode(token);


    
    // if (uid === null) {
    //   ctx.body = ctx.msg.failure;
    //   return;
    // }

    // const ctx = this.ctx;
    // const hash = ctx.params.hash;

    // const articleInfo = await this.service.github.readFromGithub(hash);



    // const article_info = await this.app.mysql.query('SELECT posts FROM posts WHERE hash = ?', [hash])



    // const author = await this.app.mysql.query('', [article_info[0].uid])
    // const github = await this.app.mysql.get('github', { uid });

    // const article_info = await this.app.mysql.query(`
    // SELECT posts.hash, posts.username AS username_p,
    // users.id, users.username AS username_u,
    // github.uid, github.access_token, github.article_repo
    // FROM posts
    // LEFT JOIN users ON posts.username = users.username
    // LEFT JOIN github ON github.uid = users.id
    // WHERE posts.hash = ?;
    // `
    
    // , [ hash ]);

    // if (articleInfo === null) {
    //   ctx.body = ctx.msg.failure;
    //   return;
    // }




    // const article_info = github.access_token;
    // const articleRepo = github.article_repo;
    // const userGithubId = github.user_id;

    // const getGithubRepo = await axios({
    //   method: 'GET',
    //   url: `https://api.github.com/repos/${article_info[0].username_u}/${article_info[0].article_repo}/contents/${article_info[0].hash}`,
    //   headers: {
    //     Authorization: 'token ' + article_info[0].access_token,
    //     'User-Agent':'test.matataki.io' ,
    //     accept: 'application/vnd.github.v3+json',
    //   },
    // });



    // console.log(getGithubRepo);
    // return......
    // ctx.body = {
    //   ...ctx.msg.success,

    //   // content
    //   data: 'Ghq-march-22-2021.md',
    // }

    // let buffer = new Buffer(getGithubRepo.data.content, 'base64')
    // const decodedText = buffer.toString();

    // ??
  //   ctx.body = {
  //     ...ctx.msg.success,
  //     data: articleInfo
  //   }
  // }

}

module.exports = GithubController;
