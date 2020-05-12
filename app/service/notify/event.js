'use strict';
const Service = require('egg').Service;
const moment = require('moment');

// 表
const EVENT_TABLE = 'notify_event';
const EVENT_RECIPIENT_TABLE = 'notify_event_recipients';

/** 行为类型 */
const ACTION_TYPES = [
  'follow', //关注
  'unfollow', // 取消关注
  'comment', // 评论
  'like' // 点赞
];

/** 对象类型 */
const OBJECT_TYPES = [
  'article', // 文章
  'user' // 用户
];


const isValidActionAndObject = (action, objectType) => ACTION_TYPES.includes(action) && OBJECT_TYPES.includes(objectType);

class NotifyService extends Service {

  /** 
   * 创建一个事件 
   * @uid 产生这个事件的用户
   * @action 用户所做的行为
   * @objectId 对象的索引
   * @objectType 行为所作用对象的类型
   * @remark 【可选】补充信息
   * @return 事件在数据库中的索引
   */
  async createEvent(uid, action, objectId, objectType, remark) {
    if(!isValidActionAndObject(action, objectType)) return false;

    const result = await this.app.mysql.insert(EVENT_TABLE, {
      user_id: uid,
      action,
      object_id: objectId,
      object_type: objectType,
      remark,
      create_time: moment().format('YYYY-MM-DD HH:mm:ss')
    })
    return result.insertId
  }

  /** 
   * 设定事件的接收者 
   * @eventId 事件在数据库中的索引
   * @uids 事件接收者列表
   */
  async setEventRecipient(eventId, uids) {
    if(!uids || uids.length < 1) return false
    try {
      let recipients = [];
      uids.forEach(uid => recipients.push({ event_id: eventId, user_id: uid}))

      const result = await this.app.mysql.insert(EVENT_RECIPIENT_TABLE,recipients);
      return result.affectedRows
    }
    catch(e) {
      this.logger.error(e);
      return false
    }
  }


  /** 
   * 发送一个事件 (整合了创建事件与设定接收者)
   * @senderId 产生这个事件的用户
   * @receivingIds 事件接收者的列表
   * @action 用户所做的行为
   * @objectId 对象的索引
   * @objectType 行为所作用对象的类型
   * @remark 【可选】补充信息
   */
  async sendEvent(senderId, receivingIds,  action, objectId, objectType, remark) {
    // 创建事件
    const eventId = await this.createEvent(senderId, action, objectId, objectType, remark);
    if(!eventId) return false;
    // 设定事件的接收者
    const result = await this.setEventRecipient(eventId, receivingIds);
    return result.affectedRows > 0;
  }

  /** 通过uid获取事件列表 */
  async getEventsByUid(page, pagesize, uid, unread = true) {
    const sql = `
      SELECT t2.*, t1.state, t1.read_time
      FROM ${EVENT_RECIPIENT_TABLE} t1
      JOIN ${EVENT_TABLE} t2 ON t1.event_id = t2.id
      WHERE t1.user_id = :uid And t1.state = :state
      LIMIT :offset, :limit;

      SELECT count(1) as count
      FROM ${EVENT_RECIPIENT_TABLE} c1
      JOIN ${EVENT_TABLE} c2 ON c1.event_id = c2.id
      WHERE c1.user_id = :uid AND c1.state = :state;
    `;

    try {
      const result = await this.app.mysql.query(sql, {
        offset: (page - 1) * pagesize,
        limit: pagesize,
        uid,
        state: unread ? 0 : 1
      });
      return {
        count: result[1][0].count,
        list: result[0]
      }
    }
    catch(e) {
      this.logger.error(e);
      return {
        count: 0,
        list: [],
      }
    }
  }

  /** 给定一个区间，将区间内的事件设为已读（区间包括start本身，不包括end） */
  async haveReadByRegion(uid, startId, endId) {
    const sql = `
      UPDATE ${EVENT_RECIPIENT_TABLE}
      SET state = 1, read_time = :readTime
      WHERE user_id = :uid AND state = 0 AND event_id >= :startId AND event_id < :endId
    `;
    try {
      const result = await this.app.mysql.query(sql, {
        uid,
        startId,
        endId,
        readTime: moment().format('YYYY-MM-DD HH:mm:ss')
      });
      return result.affectedRows;
    }
    catch(e) {
      this.logger.error(e);
      return false;
    }
  }
}

module.exports = NotifyService;
