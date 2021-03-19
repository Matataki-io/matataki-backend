'use strict';

import { axios } from 'axios';
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
    const access_token = github.access_token;
    const res = await axios.get('https://api.github.com/user/repos', {headers: {
      Authorization: `token ${access_token}`
    }});
    let repos = JSON.parse(res);
    let repoList = repos.map(repo => repo.full_name);
    ctx.body = {
      ...ctx.msg.success,
      data: repoList,
    }
  }

}

module.exports = GithubController;
