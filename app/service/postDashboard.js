'use strict';
const Service = require('egg').Service;
const moment = require('moment');

// 访问的数据库先在这里写
const TABLE = {
  POST_ACTION_LOG: 'post_action_log',
  POSTS: 'posts',
  BOOKMARKS: 'post_bookmarks',
  COMMENTS: 'comments',
  ORDERS: 'orders',
  SUPPORTS: 'supports',
  ASSETS_TOKEN_LOG: 'assets_minetokens_log'
}

// 行为的种类
const ACTION_TYPES = [
  'read', // 阅读
  'like', // 推荐
  'dislike', // 不推荐
  'share', // 分享
  'unlock' // 解锁
]

class PostDashboardService extends Service {
  /**
   * 获取全部统计数据
   * @param {Number} userId 用户 id
   * @param {Number} days 【选填】筛选多少天内的数据
   */
  async get(userId, days) {
    // 拿到 ACTION_TYPES 包括的那部分数据
    const actionRes = await this.getActionCountByUserId(userId, days);
    // 查询主体部分
    const select = {
      bookmark: `SELECT COUNT(*) AS count FROM ${TABLE.BOOKMARKS} WHERE pid IN (SELECT id FROM ${TABLE.POSTS} WHERE uid = :userId)`,
      comment: `SELECT COUNT(*) AS count FROM ${TABLE.COMMENTS} WHERE sign_id IN (SELECT id FROM ${TABLE.POSTS} WHERE uid = :userId)`,
      sale: `SELECT COUNT(*) AS count FROM ${TABLE.ORDERS} WHERE status = 9 AND signid IN (SELECT id FROM ${TABLE.POSTS} WHERE uid = :userId)`,
      reward: `SELECT COUNT(*) AS count FROM ${TABLE.ASSETS_TOKEN_LOG} WHERE type = 'reward_article' AND to_uid = :userId`
    }
    // 时间筛选部分
    const whereDate = days ? ` AND TO_DAYS(NOW()) - TO_DAYS(create_time) <= :days` : '';
    // 拼接
    const sql = select.bookmark + whereDate + '; '
      + select.comment + whereDate + '; '
      + select.sale + whereDate + '; '
      + select.reward + whereDate + ';';
    // 查询
    const res = await this.app.mysql.query(sql, { userId, days });
    // 整理数据并返回
    return {
      ...actionRes,
      bookmarkCount: res[0][0].count,
      commentCount: res[1][0].count,
      saleCount: res[2][0].count,
      rewardCount: res[3][0].count
    }
  }

  /**
   * 获取指定用户所有文章的行为日志统计。
   * @param {Number} userId 用户 id
   * @param {Number} days 【选填】筛选多少天内的数据
   */
  async getActionCountByUserId(userId, days) {
    const whereDate = 'AND TO_DAYS(NOW()) - TO_DAYS(create_time) <= :days';
    const sql = `
      SELECT
        action, COUNT(*) AS count
      FROM
        ${TABLE.POST_ACTION_LOG}
      WHERE
        post_id IN (SELECT id FROM ${TABLE.POSTS} WHERE uid = :userId) ${days ? whereDate : ''}
      GROUP BY
        action;
    `;
    const res = await this.app.mysql.query(sql, { userId, days });
    // 整理数据。
    const result = {};
    ACTION_TYPES.forEach(type => {
      result[type + 'Count'] = { ...res.find(item => item.action === type) }.count || 0;
    });
    return result;
  }

  async addActionLog(userId, postId, action, notRepeat) {
    if (!ACTION_TYPES.includes(action)) return;
    if (notRepeat && await this.getActionLog(userId, postId, action)) return -1;

    const res = await this.app.mysql.insert(TABLE.POST_ACTION_LOG, {
      uid: userId,
      post_id: postId,
      action,
      create_time: moment().format('YYYY-MM-DD HH:mm:ss')
    });
    return res.affectedRows
  }

  async getActionLog(userId, postId, action) {
    return await this.app.mysql.get(TABLE.POST_ACTION_LOG, {
      uid: userId,
      post_id: postId,
      action
    });
  }
}

module.exports = PostDashboardService;