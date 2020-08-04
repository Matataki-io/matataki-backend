'use strict';
const _ = require('lodash');
const moment = require('moment');
const consts = require('../service/consts');
const Service = require('egg').Service;

class CommentService extends Service {

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

  // 付费评论
  async payPointCreate(userId, username, signId, comment) { // 注释了 ip参数
    // 评论功能不需要消耗积分

    // const result = await this.service.mining.comment(userId, signId, ip);
    // // 积分扣除成功
    // if (result < 0) {
    //   return result;
    // }

    // await this.create(userId, username, signId, comment, consts.commentTypes.point, result);
    const result = await this.create(userId, username, signId, comment, consts.commentTypes.point, 0);
    return {
      status: 0,
      id: result.insertId,
    };
  }

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

    return result;
  }
  /**
   * 添加回复
   * @param {*} { uid, username, sign_id, comment, reply_id }
   * @return {*} 返回-1: 错误找不到对应回复的评论
   * @memberof CommentService
   */
  async reply({ uid, username, sign_id, comment, reply_id }) {
    const post = await this.app.mysql.get('comments', { id: reply_id });
    let reply_uid = null;
    if (!post) {
      return -1;
    }
    let parents_id = reply_id;
    if (post.parents_id !== null) {
      parents_id = post.parents_id;
      reply_uid = post.uid;
    } else {
      reply_id = null;
    }
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    const result = await this.app.mysql.insert('comments', {
      uid,
      username,
      sign_id,
      parents_id,
      reply_id,
      reply_uid,
      comment,
      type: consts.commentTypes.point,
      ref_id: 0,
      create_time: now,
    });
    return result;
  }
  async like(id) {
    try {
      await this.app.mysql.query(`
      UPDATE comments SET like_num=like_num+1 where id = :id;
      `, { id });
      return 0;
    } catch (e) {
      this.logger.error('service.comments like error: ', e);
      return -1;
    }
  }

  async delete(id, uid) {
    try {
      const { affectedRows } = await this.app.mysql.delete('comments', { id, uid });
      return affectedRows === 1;
    } catch (e) {
      this.logger.error('service.comments delete error: ', e);
      return false;
    }
  }

  // 评论列表
  async commentList(signid, page = 1, pagesize = 20) {
    if (!signid) {
      return null;
    }

    const post = await this.service.post.get(signid);
    if (!post) {
      return null;
    }
    console.log('post.channel_id', post.channel_id);
    let sql;
    if (post.channel_id === 1) {
      sql = 'SELECT c.id, c.uid, c.comment,c.create_time, u.username, u.nickname, u.avatar FROM comments c  '
        + 'LEFT JOIN users u ON c.uid = u.id '
        + 'WHERE c.sign_id = :signid AND c.type=3 ORDER BY c.create_time DESC LIMIT :start, :end;'
        + 'SELECT count(1) as count FROM comments c WHERE c.sign_id = :signid AND c.type=3;';
    } else {
      // tudo：会有性能问题，需要优化，comments表增加status字段，增加其它展示信息，避免查询orders、supports、assets_points_log表
      sql = 'SELECT s.id, s.amount, s.platform, s.signid, s.create_time, s.num, s.action, s.uid, u.username, u.nickname, u.avatar, c.comment '
        + 'FROM ( '
        + 'SELECT id,uid,signid,amount,num,platform,create_time,status,2 AS action FROM orders WHERE signId = :signid AND category = 0 '
        + 'UNION ALL '
        + 'SELECT id,uid,signid,amount,0 AS num,platform,create_time,status,1 AS action FROM supports WHERE signId = :signid '
        // + 'UNION ALL '
        // + 'SELECT id,uid,sign_id AS signid,-amount,0 AS num,\'point\' AS platform,create_time,status,3 AS action FROM assets_points_log WHERE sign_id=:signid and type=\'comment_pay\' '
        + ') s '
        + 'LEFT JOIN users u ON s.uid = u.id '
        + 'LEFT JOIN comments c ON c.type=s.action and c.ref_id = s.id '
        + 'WHERE s.status = 1 ORDER BY s.create_time DESC LIMIT :start, :end;'
        + 'SELECT count(1) as count '
        + 'FROM ( '
        + 'SELECT id,uid,signid,amount,num,platform,create_time,status,2 AS action FROM orders WHERE signId = :signid AND category = 0 '
        + 'UNION ALL '
        + 'SELECT id,uid,signid,amount,0 AS num,platform,create_time,status,1 AS action FROM supports WHERE signId = :signid '
        // + 'UNION ALL '
        // + 'SELECT id,uid,sign_id AS signid,-amount,0 AS num,\'point\' AS platform,create_time,status,3 AS action FROM assets_points_log WHERE sign_id=:signid and type=\'comment_pay\' '
        + ') s '
        + 'WHERE s.status = 1;';
    }

    const results = await this.app.mysql.query(
      sql,
      // 'SELECT s.amount, s.platform, s.signid, s.create_time, u.id, u.username, u.nickname, u.avatar, c.comment FROM supports s '
      // // 一个user在同一篇文章下的comment和support
      // + 'LEFT JOIN users u ON s.uid = u.id '
      // + 'LEFT JOIN comments c ON c.sign_id = s.signid AND c.uid = u.id '
      // + 'WHERE s.status = 1 AND s.signid = :signid ORDER BY s.create_time DESC limit :start, :end;',
      { signid, start: (page - 1) * pagesize, end: pagesize }
    );

    _.each(results[0], row => {
      if (row.comment === null) {
        row.comment = '';
      }

      row.username = this.service.user.maskEmailAddress(row.username);
    });

    return {
      count: results[1][0].count,
      list: results[0],
    };
  }

  /** 根据id列表获取评论内容 */
  async getByIdArray(idList) {
    const comments = await this.app.mysql.query(
      'SELECT id, sign_id, comment FROM comments WHERE id IN (:idList);',
      { idList }
    );
    if (comments === null) return [];
    return comments;
  }
  async getComments(signid, page = 1, pagesize = 20) {
    const sql = `
    SELECT c.id, c.uid, c.comment, c.like_num, c.reply_id, c.reply_uid, c.create_time, u.username, u.nickname, u.avatar, u.is_recommend AS user_is_recommend
    FROM comments c
    LEFT JOIN users u ON c.uid = u.id
    WHERE c.sign_id = :signid AND c.type=3 AND c.parents_id IS NULL
    ORDER BY c.create_time DESC LIMIT :start, :end;
    SELECT count(1) as count FROM comments c WHERE c.sign_id = :signid AND c.type=3 AND c.parents_id IS NULL;
    SELECT count(1) as allcount FROM comments c WHERE c.sign_id = :signid AND c.type=3;
    `;
    const result = await this.app.mysql.query(
      sql,
      { signid, start: (page - 1) * pagesize, end: pagesize }
    );
    const list = result[0];
    if (list.length === 0) {
      return {
        list: [],
        count: 0,
        allcount: 0,
      };
    }
    const count = result[1][0].count;
    const allcount = result[2][0].allcount;
    const ids = [];
    const c_obj = {};
    for (const item of list) {
      ids.push(item.id);
      item.replyList = [];
      c_obj[item.id] = item;
    }
    const children = await this.app.mysql.query(`
      SELECT c.id, c.uid, c.comment, c.like_num, c.reply_id, c.reply_uid, c.create_time, c.parents_id, u.username, u.nickname, u.avatar, u.is_recommend AS user_is_recommend, u2.nickname as reply_nickname
      FROM comments c
      LEFT JOIN users u ON c.uid = u.id
      LEFT JOIN users u2 ON c.reply_uid = u2.id
      WHERE c.parents_id IN (:ids) AND c.type=3
      ORDER BY c.create_time ASC;
    `, { ids });
    for (const item of children) {
      const id = item.parents_id;
      c_obj[id].replyList.push(item);
    }
    return {
      list, count, allcount,
    };
  }

  /**
   * 通过评论id获取评论在对应文章评论区的排列序号
   * @param {Number} id
   */
  async getCommentIndexById(id) {
    const sql = `
      SET @mycnt = 0;

      SELECT
        t1.rownum,
        t1.id AS parents_id
      FROM
        (
        SELECT
          t2.id,
          ( @mycnt := @mycnt + 1 ) AS rownum
        FROM
          (
          SELECT
            id,
            create_time
          FROM
            comments
          WHERE
            sign_id IN ( SELECT pid FROM ( SELECT sign_id AS pid FROM comments WHERE id = :id ) c1 )
            AND parents_id IS NULL
          ) AS t2
        ORDER BY
          t2.create_time DESC
        ) AS t1
      WHERE
        t1.id = :id
        OR t1.id IN ( SELECT cid FROM ( SELECT parents_id AS cid FROM comments WHERE id = :id ) c2 );
    `;
    try {
      const result = await this.app.mysql.query(sql, { id });
      if (result[1].length > 0) {
        return result[1][0];
      }

      return false;

    } catch (e) {
      this.logger.error(e);
      return false;
    }
  }

}

module.exports = CommentService;
