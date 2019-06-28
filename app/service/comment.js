'use strict';
const _ = require('lodash');
const moment = require('moment');
const Service = require('egg').Service;

class CommentService extends Service {

  // 创建评论
  async create(userId, username, signId, comment, type, refId) {
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    const result = await this.app.mysql.insert('comments', {
      username,
      uid: userId,
      sign_id: signId,
      comment,
      type,
      ref_id: refId,
      create_time: now,
    });

    return result.affectedRows === 1;
  }

  // 评论列表
  async commentList(signid, page = 1, pagesize = 20) {

    this.app.mysql.queryFromat = function(query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function(txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    };

    if (!signid) {
      return null;
    }

    const sql = 'SELECT s.id as payId, s.amount, s.platform, s.signid, s.create_time, s.num, s.action, u.id, u.username, u.nickname, u.avatar, c.comment '
      + 'FROM ( '
      + 'SELECT id,uid,signId,amount,num,platform,create_time,status,2 AS action FROM orders WHERE signId = :signid '
      + 'UNION ALL '
      + 'SELECT id,uid,signId,amount,0 AS num,platform,create_time,status,1 AS action FROM supports WHERE signId = :signid '
      + ') s '
      + 'LEFT JOIN users u ON s.uid = u.id '
      + 'LEFT JOIN comments c ON c.type=s.action and c.ref_id = s.id '
      + 'WHERE s.status = 1 ORDER BY s.create_time DESC LIMIT :start, :end;';
    const results = await this.app.mysql.query(
      sql,
      // 'SELECT s.amount, s.platform, s.signid, s.create_time, u.id, u.username, u.nickname, u.avatar, c.comment FROM supports s '
      // // 一个user在同一篇文章下的comment和support
      // + 'LEFT JOIN users u ON s.uid = u.id '
      // + 'LEFT JOIN comments c ON c.sign_id = s.signid AND c.uid = u.id '
      // + 'WHERE s.status = 1 AND s.signid = :signid ORDER BY s.create_time DESC limit :start, :end;',
      { signid, start: (page - 1) * pagesize, end: pagesize }
    );

    _.each(results, row => {
      if (row.comment === null) {
        row.comment = '';
      }
    });

    return results;
  }

}

module.exports = CommentService;
