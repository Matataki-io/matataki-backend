'use strict';
const Service = require('egg').Service;
const moment = require('moment');

// 表
const EVENT_TABLE = 'notify_event';
const EVENT_RECIPIENT_TABLE = 'notify_event_recipients';
const EVENT_RECIPIENT_DESC_TABLE = 'notify_event_recipients_desc';

/** 行为类型 */
const ACTION_TYPES = [
  'comment', // 评论
  'like', // 点赞
  'reply', // 回复
  'follow', // 关注
  'annouce', // 宣布
  'transfer', // 转账
];

/** 对象类型 */
const OBJECT_TYPES = [
  'article', // 文章
  'user', // 用户
  'comment', // 评论
  'announcement', // 公告
  'announcementToken', // 引用内容为Fan票的公告
  'tokenWallet', // Token 钱包
  'cnyWallet', // CNY 钱包
  'collaborator', // 协作者
];

const isValidActionAndObject = (action, objectType) => ACTION_TYPES.includes(action) && OBJECT_TYPES.includes(objectType);

class NotifyService extends Service {

  /** *******/
  /** Set **/
  /** *******/

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
    if (!isValidActionAndObject(action, objectType)) return false;

    const result = await this.app.mysql.insert(EVENT_TABLE, {
      user_id: uid,
      action,
      object_id: objectId,
      object_type: objectType,
      remark,
      create_time: moment().format('YYYY-MM-DD HH:mm:ss'),
    });
    return result.insertId;
  }

  /**
   * 设定事件的接收者 (一个事件多个接收者)
   * @eventId 事件在数据库中的索引
   * @uids 事件接收者列表
   */
  async setEventRecipients(eventId, uids) {
    if (!uids || uids.length < 1) return false;
    try {
      const recipients = [];
      uids.forEach(uid => recipients.push({ event_id: eventId, user_id: uid }));

      const result = await this.app.mysql.insert(EVENT_RECIPIENT_TABLE, recipients);
      return result.affectedRows;
    } catch (e) {
      this.logger.error(e);
      return false;
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
   * @noDuplication 【默认：true】避免重复。开启时，如果参数相同的事件已经存在，将不会创建新事件。
   */
  async sendEvent(senderId, receivingIds, action, objectId, objectType, remark, noDuplication = true) {
    // 过滤接收者和发送者相同的情况
    receivingIds = receivingIds.filter(userId => userId !== senderId);
    if (receivingIds.length === 0) return true;
    // 参数相同的事件如果已经存在了，就不会在创建新的
    if (noDuplication) {
      const existing = await this.app.mysql.select(EVENT_TABLE, {
        where: {
          user_id: senderId,
          action,
          object_id: objectId,
          object_type: objectType,
          remark,
        },
      });
      if (existing.length > 0) return false;
    }

    // 创建事件
    const eventId = await this.createEvent(senderId, action, objectId, objectType, remark);
    if (!eventId) return false;
    // 设定事件的接收者
    const result = await this.setEventRecipients(eventId, receivingIds);
    return result.affectedRows > 0;
  }

  /** 数组内的事件设为已读 */
  async haveReadByIdArray(uid, ids) {
    const sql = `
      UPDATE ${EVENT_RECIPIENT_TABLE}
      SET state = 1, read_time = :readTime
      WHERE user_id = :uid AND state = 0 AND event_id IN(:ids)
    `;
    try {
      const result = await this.app.mysql.query(sql, {
        uid,
        ids,
        readTime: moment().format('YYYY-MM-DD HH:mm:ss'),
      });
      return result.affectedRows;
    } catch (e) {
      this.logger.error(e);
      return false;
    }
  }

  /** 全部标记为已读 */
  async haveReadAll(uid) {
    const sql = `
      UPDATE ${EVENT_RECIPIENT_TABLE}
      SET state = 1, read_time = :readTime
      WHERE user_id = :uid AND state = 0
    `;
    try {
      const result = await this.app.mysql.query(sql, {
        uid,
        readTime: moment().format('YYYY-MM-DD HH:mm:ss'),
      });
      return result.affectedRows;
    } catch (e) {
      this.logger.error(e);
      return false;
    }
  }

  /** *******/
  /** Get **/
  /** *******/

  /**
   * 通过uid获取聚合后的事件
   * @uid 用户id
   * @startId 【可选】查询起点id （使用这个参数以避免新消息打乱分页，传入0不会生效）
   * @actions 【可选】筛选消息类型，传入一个string数组
   * @filterUnread 【可选】只看未读消息
  */
  async getEventGgroupsByUid(page, pagesize, uid, startId, actions = ACTION_TYPES, filterUnread = false) {
    const whereStart = [
      startId ? ' AND t2.id <= :startId' : '',
      startId ? ' AND c2.id <= :startId' : '',
    ];
    let sqlList = `
      SELECT
        t2.id,
        MIN(t2.id) as end_id,
        count(*) as total,
        t2.user_id,
        t2.action,
        t2.object_id,
        t2.object_type,
        t2.remark,
        t2.create_time,
        t1.state,
        t1.notify_time,
        t1.read_time,
        MIN(t2.user_id) as min_user_id,
        MAX(t2.user_id) as max_user_id
      FROM ${EVENT_RECIPIENT_DESC_TABLE} t1
      JOIN ${EVENT_TABLE} t2 ON t1.event_id = t2.id
      WHERE t1.user_id = :uid AND t2.action IN(:actions)${whereStart[0]}
      GROUP BY t2.action, t2.object_id, object_type, DATE(create_time)
      ORDER BY id DESC
      LIMIT :offset, :limit
    `;

    let sqlCount = `
      SELECT count(1) as count FROM(
        SELECT count(1), c1.state
        FROM ${EVENT_RECIPIENT_DESC_TABLE} c1
        JOIN ${EVENT_TABLE} c2 ON c1.event_id = c2.id
        WHERE c1.user_id = :uid AND c2.action IN(:actions)${whereStart[1]}
        GROUP BY c2.action, c2.object_id, object_type, DATE(create_time)
      ) a
    `;

    // 只看未读
    if (filterUnread) {
      sqlList = `SELECT * FROM (${sqlList}) a WHERE a.state = 0`;
      sqlCount += ' WHERE a.state = 0';
    }

    const sql = `${sqlList}; ${sqlCount};`;

    try {
      const result = await this.app.mysql.query(sql, {
        offset: (page - 1) * pagesize,
        limit: pagesize,
        uid,
        actions,
        startId,
      });

      // 返沪用户是否发币
      const listFormat = await this.service.token.mineToken.formatListReturnTokenInfo(result[0], 'user_id');

      return {
        count: result[1][0].count,
        list: listFormat,
      };
    } catch (e) {
      this.logger.error(e);
      return {
        count: 0,
        list: [],
      };
    }
  }

  /** 获取一个区间内特定类型的事件列表 */
  async getEventByRegion(page, pagesize, uid, startId, endId, action, objectId, objectType) {
    const sql = `
      SELECT
        t2.id,
        t2.user_id,
        t2.action,
        t2.object_id,
        t2.object_type,
        t2.remark,
        t2.create_time,
        t1.state,
        t1.notify_time,
        t1.read_time
      FROM ${EVENT_RECIPIENT_DESC_TABLE} t1
      JOIN ${EVENT_TABLE} t2 ON t1.event_id = t2.id
      WHERE t1.user_id = :uid
        AND t2.id <= :startId
        AND t2.id >= :endId
        AND action = :action
        AND object_id = :objectId
        AND object_type = :objectType
      ORDER BY id DESC
      LIMIT :offset, :limit;

      SELECT
        count(1) as count
      FROM ${EVENT_RECIPIENT_DESC_TABLE} c1
      JOIN ${EVENT_TABLE} c2 ON c1.event_id = c2.id
      WHERE c1.user_id = :uid
        AND c2.id <= :startId
        AND c2.id >= :endId
        AND action = :action
        AND object_id = :objectId
        AND object_type = :objectType;
    `;
    try {
      const result = await this.app.mysql.query(sql, {
        offset: (page - 1) * pagesize,
        limit: pagesize,
        uid,
        startId,
        endId,
        action,
        objectId,
        objectType,
      });

      // 返沪用户是否发币
      const listFormat = await this.service.token.mineToken.formatListReturnTokenInfo(result[0], 'user_id');

      return {
        count: result[1][0].count,
        list: listFormat,
      };
    } catch (e) {
      this.logger.error(e);
      return {
        count: 0,
        list: [],
      };
    }
  }

  /** 通过uid获取未读消息数量 */
  async getUnreadQuantity(uid) {
    const sql = `
      SELECT count(1) as count FROM (
        SELECT count(1), c1.state
        FROM ${EVENT_RECIPIENT_DESC_TABLE} c1
        JOIN ${EVENT_TABLE} c2 ON c1.event_id = c2.id
        WHERE c1.user_id = :uid
        GROUP BY c2.action, c2.object_id, object_type, DATE(create_time)
      ) a WHERE a.state = 0;
    `;

    try {
      const result = await this.app.mysql.query(sql, { uid });
      return result[0].count;
    } catch (e) {
      this.logger.error(e);
      return 0;
    }
  }

}

module.exports = NotifyService;
