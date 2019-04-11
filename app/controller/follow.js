'use strict';

const Controller = require('../core/base_controller');
const moment = require('moment');
var _ = require('lodash');

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

    let users = [];

    _.each(results, (row) => {
      row.is_follow = false;
      users.push(row.followed)
    })


    const current_user = this.get_current_user();

    if (current_user) {
      let whereOption2 = {
        username: current_user,
        followed: users
      }

      const my_follows = await this.app.mysql.select('follows', {
        where: whereOption2,
        columns: ['followed'],
        orders: [['create_time', 'desc']],
        limit: pagesize,
        offset: (page - 1) * pagesize,
      });

      _.each(results, (row) => {
        _.each(my_follows, (row2) => {
          if (row.followed === row2.followed) {
            row.is_follow = true;
          }
        })
      })
    }

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


    let users = [];

    _.each(results, (row) => {
      row.is_follow = false;
      users.push(row.username)
    })

    const current_user = this.get_current_user();

    if (current_user) {
      let whereOption2 = {
        username: current_user,
        followed: users
      }

      const my_follows = await this.app.mysql.select('follows', {
        where: whereOption2,
        columns: ['followed'],
        orders: [['create_time', 'desc']],
        limit: pagesize,
        offset: (page - 1) * pagesize,
      });

      _.each(results, (row) => {
        _.each(my_follows, (row2) => {
          if (row.followed === row2.followed) {
            row.is_follow = true;
          }
        })
      })
    }


    this.ctx.body = results;
  }




}

module.exports = FollowController;
