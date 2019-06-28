'use strict';

const Controller = require('../core/base_controller');
const moment = require('moment');
var _ = require('lodash');

class FollowController extends Controller {

  async follow() {
    const ctx = this.ctx;

    const {  uid  } = ctx.request.body;

    const user = ctx.user;

    if (user.id === parseInt(uid)) {
      this.response(403, 'Not able to follow yourself!');
      return;
    }

    try {
      const now = moment().format('YYYY-MM-DD HH:mm:ss');

      let followed_user = await this.app.mysql.get('users', { id: uid });

      if (!user || !followed_user) {
        this.response(403, "user not exist");
        return;
      }

      // let result = await this.app.mysql.insert('follows', {
      //   username: user.username,
      //   followed: followed_user.followed,
      //   status: 1,
      //   uid: user.id,
      //   fuid: followed_user.id,
      //   create_time: now
      // });

      const result = await this.app.mysql.query(
        'INSERT INTO follows(username, followed, status, uid, fuid, create_time) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = 1, create_time = ?;',
        [ user.username, followed_user.username, 1, user.id, followed_user.id, now, now ]
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

    const {  uid  } = ctx.request.body;

    try {
      const user = ctx.user;

      let followed_user = await this.app.mysql.get('users', { id: uid });

      if (!user || !followed_user) {
        this.response(403, "user not exist");
        return;
      }

      const now = moment().format('YYYY-MM-DD HH:mm:ss');

      const result = await this.app.mysql.query(
        'INSERT INTO follows(username, followed, status, uid, fuid, create_time) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = 0, create_time = ?;',
        [ user.username, followed_user.username, 0, user.id, followed_user.id, now, now ]
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
    const ctx = this.ctx;
    const pagesize = 20;

    const { page = 1, uid } = ctx.query;

    if (!uid) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    // 获取当前账号关注数
    const follows = await this.app.mysql.query(
      'select count(*) as follows from follows where uid = ? and status=1',
      [uid]
    );

    // 获取当前账号粉丝数
    const fans = await this.app.mysql.query(
      'select count(*) as fans from follows where fuid = ? and status=1',
      [uid]
    );

    const results = await this.app.mysql.query(
      'select a.fuid, a.uid, a.followed, b.nickname, b.avatar from follows a left join users b on a.fuid = b.id where a.uid = ? and a.status=1 order by a.id desc limit ?,?',
      [uid, (page - 1) * pagesize, pagesize]
    );

  
    let users = [];

    _.each(results, (row) => {
      row.is_follow = false;
      row.is_fan = false;
      row.fans = 0;
      row.follows = 0;
      users.push(row.fuid)
    })


    if (users.length > 0) {
      // 获取列表中账号关注数
      const follow = await this.app.mysql.query(
        'select uid, count(*) as follow from follows where status=1 and uid in (?) group by uid',
        [users]
      );

      _.each(results, (row) => {
        _.each(follow, (row2) => {
          if (row.fuid === row2.uid) {
            row.follows = row2.follow;
          }
        })
      })

      // 获取列表中账号粉丝数 
      const fan = await this.app.mysql.query(
        'select fuid, count(*) as fans from follows where status=1 and fuid in (?) group by fuid',
        [users]
      );

      _.each(results, (row) => {
        _.each(fan, (row2) => {
          if (row.fuid === row2.fuid) {
            row.fans = row2.fans;
          }
        })
      })
    }

    const current_user = ctx.user;

    if (current_user && users.length > 0) {

      const my_follows = await this.app.mysql.select('follows', {
        where: {
          status: 1,
          uid: current_user.id,
          fuid: users
        },
        columns: ['fuid'],
        orders: [['create_time', 'desc']],
        limit: pagesize,
        offset: (page - 1) * pagesize,
      });

      const my_fans = await this.app.mysql.select('follows', {
        where: {
          status: 1,
          uid: users,
          fuid: current_user.id
        },
        columns: ['uid'],
        orders: [['create_time', 'desc']],
        limit: pagesize,
        offset: (page - 1) * pagesize,
      });

      _.each(results, (row) => {
        _.each(my_follows, (row2) => {
          if (row.fuid === row2.fuid) {
            row.is_follow = true;
          }
        })
        _.each(my_fans, (fan) => {
          if (row.fuid === fan.uid) {
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

    ctx.body = ctx.msg.success;
    ctx.body.data = resp;
  }

  async fans() {
    const pagesize = 20;
    const ctx = this.ctx;

    const { page = 1, uid } = ctx.query;

    if (!uid) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    // 获取当前账号关注数
    const follows = await this.app.mysql.query(
      'select count(*) as follows from follows where uid = ? and status=1',
      [uid]
    );

    // 3.获取当前账号粉丝数
    const fans = await this.app.mysql.query(
      'select count(*) as fans from follows where fuid = ? and status=1',
      [uid]
    );

    const results = await this.app.mysql.query(
      'select a.uid, a.fuid, a.username, b.nickname, b.avatar from follows a left join users b on a.uid = b.id where a.fuid = ? and a.status=1 order by a.id desc limit ?,?',
      [uid, (page - 1) * pagesize, pagesize]
    );

    let users = [];

    _.each(results, (row) => {
      row.is_follow = false;
      row.is_fan = false;
      row.fans = 0;
      row.follows = 0;
      users.push(row.uid)
    })


    if (users.length > 0) {
      // 获取列表中账号关注数
      let follow = await this.app.mysql.query(
        'select uid, username, count(*) as follow from follows where status=1 and uid in (?) group by uid',
        [users]
      );

      _.each(results, (row) => {
        _.each(follow, (row2) => {
          if (row.uid === row2.uid) {
            row.follows = row2.follow;
          }
        })
      })

      // 获取列表中账号粉丝数 
      let fan = await this.app.mysql.query(
        'select fuid, followed, count(*) as fans from follows where status=1 and fuid in (?) group by fuid',
        [users]
      );

      _.each(results, (row) => {
        _.each(fan, (row2) => {
          if (row.uid === row2.fuid) {
            row.fans = row2.fans;
          }
        })
      })
    }

    const current_user = ctx.user;

    if (current_user && users.length > 0) {
      let whereOption2 = {
        status: 1,
        uid: current_user.id,
        fuid: users
      }

      const my_follows = await this.app.mysql.select('follows', {
        where: whereOption2,
        columns: ['fuid'],
        orders: [['create_time', 'desc']],
        limit: pagesize,
        offset: (page - 1) * pagesize,
      });

      const my_fans = await this.app.mysql.select('follows', {
        where: {
          status: 1,
          uid: users,
          fuid: current_user.id
        },
        columns: ['uid'],
        orders: [['create_time', 'desc']],
        limit: pagesize,
        offset: (page - 1) * pagesize,
      });

      _.each(results, (row) => {
        _.each(my_follows, (row2) => {
          if (row.fuid === row2.fuid) {
            row.is_follow = true;
          }
        })
        _.each(my_fans, (fan) => {
          if (row.fuid === fan.uid) {
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

    ctx.body = ctx.msg.success;
    ctx.body.data = resp;
  }

}

module.exports = FollowController;
