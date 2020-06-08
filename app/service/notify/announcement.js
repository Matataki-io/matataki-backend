'use strict';
const Service = require('egg').Service;

const ANNOUNCEMENT_TABLE = 'announcement';
const EVENT_TABLE = 'notify_event';
const EVENT_RECIPIENT_TABLE = 'notify_event_recipients';

class AnnouceService extends Service {

  /** 根据id列表获取公告 */
  async getByIdArray(idList) {
    const announcements = await this.app.mysql.query(
      `SELECT * FROM ${ ANNOUNCEMENT_TABLE } WHERE id IN (:idList);`,
      { idList }
    );

    if (announcements === null) return [];
    return announcements;
  }

  /** 初始化用户的公告时间轴 */
  async initRecipients(uid) {
    // 事务
    return await this.app.mysql.beginTransactionScope(async conn => {
      // 获取用户信息是为了筛掉用户注册前的公告内容
      const users = await conn.get('users', { id: uid });
      // 获取公告消息和收件人列表的id
      const announcementList = await getAnnouncementStatus(conn, uid, users.create_time);
      // 过滤掉已经初始化收件人的公告
      const eventIds = announcementList.filter(age => !age.recipients_id).map(events => events.id);
      // 设定收件人
      if(eventIds.length === 0) return 0;
      return await setEventArrayRecipient(conn, eventIds, uid);
    }, this.ctx);
  }

}

module.exports = AnnouceService;

/** 获取公告消息和收件人列表的id */
async function getAnnouncementStatus(conn, uid, startTime) {
  const sql = `
    SELECT t1.id, t2.id AS recipients_id
    FROM ${EVENT_TABLE} t1
    LEFT JOIN ${EVENT_RECIPIENT_TABLE} t2 ON t1.id = t2.event_id AND t2.user_id = :uid
    WHERE t1.action = 'annouce' AND t1.object_type = 'announcement' AND t1.create_time > :startTime
  `;

  const result = await conn.query(sql, {uid, startTime});
  return result
}

/** 
 * 设定事件的接收者 (多个事件一个接收者)
 * @eventIds 事件在数据库中的索引列表
 * @uid 事件接收者
 */
async function setEventArrayRecipient(conn, eventIds, uid) {
  if(!eventIds || eventIds.length < 1) return false
  let recipients = [];
  eventIds.forEach(eventId => recipients.push({ event_id: eventId, user_id: uid}))

  const result = await conn.insert(EVENT_RECIPIENT_TABLE, recipients);
  return result.affectedRows
}
