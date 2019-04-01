'use strict';

const Controller = require('../core/base_controller');

const moment = require('moment');

class FollowController extends Controller {

  async follow() {
    const ctx = this.ctx;

    const { username = '', followed = '' } = ctx.request.body;

    try {
      this.checkAuth(username);
    } catch (err) {
      ctx.status = 401;
      ctx.body = err.message;
      return;
    }

    try {
      const now = moment().format('YYYY-MM-DD HH:mm:ss');

      const result = await this.app.mysql.query(
        'INSERT INTO follows VALUES (null, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = 1',
        [username, followed, 1, now]
      );

      const updateSuccess = result.affectedRows >= 1;

      if (updateSuccess) {
        ctx.status = 201;
      } else {
        ctx.status = 500;
      }
    } catch (err) {
      ctx.logger.error(err.sqlMessage);
      ctx.body = {
        msg: 'follow error: ' + err.sqlMessage,
      };
      ctx.status = 500;
    }
  }

  async unfollow() {
    const ctx = this.ctx;

    const { username = '', followed = '' } = ctx.request.body;

    try {
      this.checkAuth(username);
    } catch (err) {
      ctx.status = 401;
      ctx.body = err.message;
      return;
    }

    try {
      const now = moment().format('YYYY-MM-DD HH:mm:ss');

      const result = await this.app.mysql.query(
        'INSERT INTO follows VALUES (null, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = 0',
        [username, followed, 0, now]
      );

      const updateSuccess = result.affectedRows >= 1;

      if (updateSuccess) {
        ctx.status = 201;
      } else {
        ctx.status = 500;
      }
    } catch (err) {
      ctx.logger.error(err.sqlMessage);
      ctx.body = {
        msg: 'follow error: ' + err.sqlMessage,
      };
      ctx.status = 500;
    }
  }


  async follows() {
    const pagesize = 20;

    const { page = 1, user } = this.ctx.query;

    if (!user) {
      this.ctx.body = {
        msg: 'user require ',
      };
      this.ctx.status = 500;
      return;
    }

    let whereOption = {
      username: user
    }

    const results = await this.app.mysql.select('follows', {
      where: whereOption,
      columns: ['followed'],
      orders: [['create_time', 'desc']],
      limit: pagesize,
      offset: (page - 1) * pagesize,
    });

    this.ctx.body = results;
  }

  async fans() {
    const pagesize = 20;

    const { page = 1, user } = this.ctx.query;

    if (!user) {
      this.ctx.body = {
        msg: 'user require ',
      };
      this.ctx.status = 500;
      return;
    }

    let whereOption = {
      followed: user
    }

    const results = await this.app.mysql.select('follows', {
      where: whereOption,
      columns: ['username'],
      orders: [['create_time', 'desc']],
      limit: pagesize,
      offset: (page - 1) * pagesize,
    });


    this.ctx.body = results;
  }




}

module.exports = FollowController;
