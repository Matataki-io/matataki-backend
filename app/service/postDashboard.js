'use strict';
const Service = require('egg').Service;
const moment = require('moment');

const TABLE = {
  POST_ACTION_LOG: 'post_action_log'
}

const ACTION_TYPES = [
  'read',
  'like',
  'dislike',
  'share',
  'unlock'
]

class PostDashboardService extends Service {
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