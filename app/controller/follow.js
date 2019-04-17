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

    // 获取当前账号关注数
    const follows = await this.app.mysql.query(
      'select count(*) as follows from follows where username = ? and status=1',
      [user]
    );

    // 获取当前账号粉丝数
    const fans = await this.app.mysql.query(
      'select count(*) as fans from follows where followed = ? and status=1',
      [user]
    );

    const results = await this.app.mysql.query(
      'select a.followed, b.nickname from follows a left join users b on a.followed = b.username where a.username = ? order by a.create_time desc limit ?,?',
      [user, (page - 1) * pagesize, pagesize]
    );

    let users = [];

    _.each(results, (row) => {
      row.is_follow = false;
      row.is_fan = false;
      row.fans = 0;
      row.follows = 0;
      users.push(row.followed)
    })


    if (users.length > 0) {
      // 获取列表中账号关注数
      const follow = await this.app.mysql.query(
        'select username, count(*) as follow from follows where status=1 and username in (?) group by username',
        [users]
      );

      _.each(results, (row) => {
        _.each(follow, (row2) => {
          if (row.followed === row2.username) {
            row.follows = row2.follow;
          }
        })
      })

      // 获取列表中账号粉丝数 
      const fan = await this.app.mysql.query(
        'select followed, count(*) as fans from follows where status=1 and followed in (?) group by followed',
        [users]
      );

      _.each(results, (row) => {
        _.each(fan, (row2) => {
          if (row.followed === row2.followed) {
            row.fans = row2.fans;
          }
        })
      })
    }


    const current_user = this.get_current_user();

    if (current_user && users.length > 0) {

      const my_follows = await this.app.mysql.select('follows', {
        where: {
          username: current_user,
          followed: users
        },
        columns: ['followed'],
        orders: [['create_time', 'desc']],
        limit: pagesize,
        offset: (page - 1) * pagesize,
      });

      const my_fans = await this.app.mysql.select('follows', {
        where: {
          username: users,
          followed: current_user
        },
        columns: ['username'],
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
        _.each(my_fans, (fan) => {
          if (row.followed === fan.username) {
            row.is_fan = true;
          }
        })
      })
    }

    let resp = {
      totalFollows: follows[0].follows,
      totalFans: fans[0].fans,
      list: results
    }

    this.ctx.body = resp;
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

    // 获取当前账号关注数
    const follows = await this.app.mysql.query(
      'select count(*) as follows from follows where username = ? and status=1',
      [user]
    );

    // 3.获取当前账号粉丝数
    const fans = await this.app.mysql.query(
      'select count(*) as fans from follows where followed = ? and status=1',
      [user]
    );

    const results = await this.app.mysql.query(
      'select a.username, b.nickname from follows a left join users b on a.username = b.username where a.followed = ? order by a.create_time desc limit ?,?',
      [user, (page - 1) * pagesize, pagesize]
    );

    let users = [];

    _.each(results, (row) => {
      row.is_follow = false;
      row.is_fan = false;
      row.fans = 0;
      row.follows = 0;
      users.push(row.username)
    })


    if (users.length > 0) {
      // 获取列表中账号关注数
      let follow = await this.app.mysql.query(
        'select username, count(*) as follow from follows where status=1 and username in (?) group by username',
        [users]
      );

      _.each(results, (row) => {
        _.each(follow, (row2) => {
          if (row.username === row2.username) {
            row.follows = row2.follow;
          }
        })
      })

      // 获取列表中账号粉丝数 
      let fan = await this.app.mysql.query(
        'select followed, count(*) as fans from follows where status=1 and followed in (?) group by followed',
        [users]
      );

      _.each(results, (row) => {
        _.each(fan, (row2) => {
          if (row.username === row2.followed) {
            row.fans = row2.fans;
          }
        })
      })
    }

    const current_user = this.get_current_user();

    if (current_user && users.length > 0) {
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

      const my_fans = await this.app.mysql.select('follows', {
        where: {
          username: users,
          followed: current_user
        },
        columns: ['username'],
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
        _.each(my_fans, (fan) => {
          if (row.followed === fan.username) {
            row.is_fan = true;
          }
        })
      })
    }

    let resp = {
      totalFollows: follows[0].follows,
      totalFans: fans[0].fans,
      list: results
    }

    this.ctx.body = resp;
  }

}

module.exports = FollowController;
