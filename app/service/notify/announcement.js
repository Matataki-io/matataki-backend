'use strict';
const Service = require('egg').Service;
const moment = require('moment');

const ANNOUNCEMENT_TABLE = 'announcement';
const EVENT_TABLE = 'notify_event';
const EVENT_RECIPIENT_TABLE = 'notify_event_recipients';

const OBJECT_TYPES = ['announcement', 'announcementToken'];

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
  async initRecipients(uid, mode) {
    const isNewUser = mode === 'informNewUser'
    const filter = isNewUser ? 'informNewUser' : 'informInstant'

    // 事务
    return await this.app.mysql.beginTransactionScope(async conn => {
      // 获取用户信息是为了筛掉用户注册前的公告内容
      const { create_time: createTime } = await conn.get('users', { id: uid });
      // 获取公告消息和收件人列表的id
      const announcementList = await getAnnouncementStatus(conn, uid, createTime, filter);
      // 过滤掉已经初始化收件人的公告
      const eventIds = announcementList.filter(age => !age.recipients_id).map(events => events.id);
      // 设定收件人
      if(eventIds.length === 0) return 0;
      return await setEventArrayRecipient(conn, eventIds, uid, isNewUser);
    }, this.ctx);
  }

}

module.exports = AnnouceService;

/** 获取公告消息和收件人列表的id */
async function getAnnouncementStatus(conn, uid, startTime, filter = 'informInstant') {
  const filterSql = {
    informInstant: ' AND t2.inform_instant = 1 AND t1.create_time > :startTime',
    informNewUser: ' AND t2.inform_new_user = 1 AND (t2.expire_time > :startTime OR t2.expire_time IS NULL)'
  }[filter];
  if(!filterSql) throw new Error(`Wrong filter, filter: ${filter}`)

  const sql = `
    SELECT
      t1.id,
      t3.id AS recipients_id,
      t2.inform_instant, t2.inform_new_user, t2.expire_time
    FROM ${EVENT_TABLE} t1
    JOIN ${ANNOUNCEMENT_TABLE} t2 ON t2.id = t1.object_id
    LEFT JOIN ${EVENT_RECIPIENT_TABLE} t3 ON t1.id = t3.event_id AND t3.user_id = :uid
    WHERE t1.action = 'annouce' AND t1.object_type IN(:objectTypes)${filterSql};
  `;

  const result = await conn.query(sql, {uid, startTime, objectTypes: OBJECT_TYPES});
  return result
}

/** 
 * 设定事件的接收者 (多个事件一个接收者)
 * @eventIds 事件在数据库中的索引列表
 * @uid 事件接收者
 */
async function setEventArrayRecipient(conn, eventIds, uid, useNotifyTime) {
  if(!eventIds || eventIds.length < 1) return false
  let recipients = [];
  eventIds.forEach(eventId => recipients.push({
    event_id: eventId,
    user_id: uid,
    notify_time: useNotifyTime ? moment().format('YYYY-MM-DD HH:mm:ss') : null
  }))

  const result = await conn.insert(EVENT_RECIPIENT_TABLE, recipients);
  return result.affectedRows
}
