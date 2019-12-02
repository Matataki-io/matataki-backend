'use strict';

const Service = require('egg').Service;
const _ = require('lodash');
const moment = require('moment');

class FollowService extends Service {

  constructor(ctx, app) {
    super(ctx, app);
    this.app.mysql.queryFromat = function(query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function(txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    };
  }

  // 关注动作
  async follow(uid) {
    const ctx = this.ctx;
    const user = ctx.user;

    // 用户不能关注自己
    if (user.id === parseInt(uid)) {
      return 2;
    }

    try {
      const now = moment().format('YYYY-MM-DD HH:mm:ss');

      const followed_user = await this.app.mysql.get('users', { id: uid });

      if (!user || !followed_user) {
        return 3;
      }

      const result = await this.app.mysql.query(
        'INSERT INTO follows(username, followed, status, uid, fuid, create_time) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = 1, create_time = ?;',
        [ user.username, followed_user.username, 1, user.id, followed_user.id, now, now ]
      );

      const updateSuccess = result.affectedRows >= 1;

      if (updateSuccess) {
        return 0;
      }
      return 1;

    } catch (err) {
      ctx.logger.error(err.sqlMessage);
      return 1;
    }

  }

  // 取关动作
  async unfollow(uid) {
    const ctx = this.ctx;
    const user = ctx.user;

    if (user.id === parseInt(uid)) {
      return 2;
    }

    try {

      const followed_user = await this.app.mysql.get('users', { id: uid });

      if (!user || !followed_user) {
        return 3;
      }

      const now = moment().format('YYYY-MM-DD HH:mm:ss');

      const result = await this.app.mysql.query(
        'INSERT INTO follows(username, followed, status, uid, fuid, create_time) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = 0, create_time = ?;',
        [ user.username, followed_user.username, 0, user.id, followed_user.id, now, now ]
      );

      const updateSuccess = result.affectedRows >= 1;

      if (updateSuccess) {
        return 0;
      }
      return 1;

    } catch (err) {
      ctx.logger.error(err.sqlMessage);
      return 1;
    }

  }

  // 获取某个用户的关注列表
  async follows(pagesize = 20, page = 1, uid = null) {

    if (!uid) {
      return 2;
    }

    // 获取关注数量 粉丝数量 被关注者详情
    const infos = await this.app.mysql.query(
      'SELECT COUNT(*) AS follows FROM follows WHERE uid = :uid AND status = 1;'
      + 'SELECT COUNT(*) AS fans FROM follows WHERE fuid = :uid AND status = 1;'
      + 'SELECT a.fuid, a.uid, a.followed, b.nickname, b.avatar FROM follows a '
      + 'LEFT JOIN users b ON a.fuid = b.id WHERE a.uid = :uid AND a.status = 1 ORDER BY a.id DESC LIMIT :start, :end;',
      { uid, start: (page - 1) * pagesize, end: 1 * pagesize }
    );

    const follows = infos[0];
    const fans = infos[1];
    const results = infos[2];

    const users = [];

    _.each(results, row => {
      row.fans = 0;
      row.is_follow = false;
      row.is_fan = false;
      users.push(row.fuid);
    });


    if (users.length > 0) {
      // 获取列表中账号粉丝数
      const fan = await this.app.mysql.query(
        'SELECT fuid, COUNT(*) AS fans FROM follows WHERE status = 1 AND fuid IN (?) GROUP BY fuid;',
        [ users ]
      );

      // 分配粉丝数到每个人
      _.each(results, row => {
        _.each(fan, row2 => {
          if (row.fuid === row2.fuid) {
            row.fans = row2.fans;
          }
        });
      });
    }

    const current_user = this.ctx.user;

    if (current_user && users.length > 0) {

      // 查询我对该列表的follow状态 我是否有fo这群人
      const my_follows = await this.app.mysql.select('follows', {
        where: {
          status: 1,
          uid: current_user.id,
          fuid: users,
        },
        columns: [ 'fuid' ],
      });

      // 这群人是否有fo我
      const my_fans = await this.app.mysql.select('follows', {
        where: {
          status: 1,
          uid: users,
          fuid: current_user.id,
        },
        columns: [ 'uid' ],
      });

      _.each(results, row => {
        _.each(my_follows, row2 => {
          if (row.fuid === row2.fuid) {
            row.is_follow = true;
          }
        });
        _.each(my_fans, fan => {
          if (row.fuid === fan.uid) {
            row.is_fan = true;
          }
        });
      });
    }

    const res = {
      totalFollows: follows[0].follows,
      totalFans: fans[0].fans,
      list: results,
    };

    return res;
  }

  // 获取某个用户的粉丝列表
  async fans(pagesize = 20, page = 1, uid = null) {

    if (!uid) {
      return 2;
    }

    // 获取关注数量 粉丝数量 粉丝列表详情
    const infos = await this.app.mysql.query(
      'SELECT COUNT(*) AS follows FROM follows WHERE uid = :uid AND status = 1;'
      + 'SELECT COUNT(*) AS fans FROM follows WHERE fuid = :uid AND status = 1;'
      + 'SELECT a.uid, a.fuid, a.username, b.nickname, b.avatar FROM follows a '
      + 'LEFT JOIN users b on a.uid = b.id WHERE a.fuid = :uid AND a.status = 1 ORDER BY a.id DESC LIMIT :start, :end;',
      { uid, start: (page - 1) * pagesize, end: 1 * pagesize }
    );

    const follows = infos[0];
    const fans = infos[1];
    const results = infos[2];

    const users = [];

    _.each(results, row => {
      row.fans = 0;
      row.is_follow = false;
      row.is_fan = false;
      users.push(row.uid);

      row.username = this.service.user.maskEmailAddress(row.username);
    });

    if (users.length > 0) {
      // 获取列表中账号粉丝数
      const fan = await this.app.mysql.query(
        'SELECT fuid, COUNT(*) AS fans FROM follows WHERE status = 1 AND fuid IN (?) GROUP BY fuid;',
        [ users ]
      );

      // 分配粉丝数到每个人
      _.each(results, row => {
        _.each(fan, row2 => {
          if (row.uid === row2.fuid) {
            row.fans = row2.fans;
          }
        });
      });
    }

    const current_user = this.ctx.user;

    if (current_user && users.length > 0) {

      // 查询我对该列表的follow状态
      const my_follows = await this.app.mysql.select('follows', {
        where: {
          status: 1,
          uid: current_user.id,
          fuid: users,
        },
        columns: [ 'fuid' ],
      });

      const my_fans = await this.app.mysql.select('follows', {
        where: {
          status: 1,
          uid: users,
          fuid: current_user.id,
        },
        columns: [ 'uid' ],
      });

      _.each(results, row => {
        _.each(my_follows, row2 => {
          if (row.uid === row2.fuid) {
            row.is_follow = true;
          }
        });
        _.each(my_fans, fan => {
          if (row.uid === fan.uid) {
            row.is_fan = true;
          }
        });
      });
    }

    const res = {
      totalFollows: follows[0].follows,
      totalFans: fans[0].fans,
      list: results,
    };

    return res;
  }

  // 提供推送信息
  async populateNotifications(userId, fromDate, page, pageSize) {
    fromDate = moment.isMoment(fromDate) ? fromDate.format('YYYY-MM-DD HH:mm:ss') : undefined;
    const fans = await this.ctx.app.mysql.query(`SELECT a.uid, UNIX_TIMESTAMP(a.create_time) AS time, a.username, b.nickname, b.avatar, EXISTS(SELECT id FROM follows WHERE uid = a.fuid AND fuid = a.uid) AS back FROM follows a LEFT JOIN users b on a.uid = b.id WHERE a.fuid = :userId AND a.status = 1${fromDate ? ' AND a.create_time > :fromDate' : ''} ORDER BY a.id DESC LIMIT :start, :end`, {
      userId, fromDate, start: (page - 1) * pageSize, end: 1 * pageSize,
    });
    return _.map(fans, fan => {
      return {
        kind: 'follow',
        source: fan.uid, // undefined if from system,
        destination: userId,
        timestamp: fan.time,
        message: fan.username,
        avatar: fan.avatar,
        actions: [{ name: 'follow', emit: fan.back ? undefined : fan.uid }],
      };
    });
  }

}

module.exports = FollowService;
