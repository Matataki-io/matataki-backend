'use strict';

import { axios } from 'axios';
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
}

module.exports = GithubController;
