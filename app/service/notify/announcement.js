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

  /** 设定公告内容  */
  async setAnnouncement(sender, title, content, informInstant, informNewUser, expireTime) {
    const result = await this.app.mysql.insert(ANNOUNCEMENT_TABLE, {
      sender,
      title,
      content,
      inform_instant: informInstant,
      inform_new_user: informNewUser,
      expire_time: expireTime
    })
    return result.insertId
  }

  /**
   * 发布定向公告
   * @sender 发件人
   * @receivingIds 事件接收者的列表
   * @title 公告标题
   * @content 公告正文
   * @quoteId 引用内容的ID (传入0表示不引用)
   * @quoteType 引用内容的类型，有 post 和 token 可选，默认是 post
   */
  async targetedPost(sender, receivingIds, title, content, quoteId, quoteType) {
    const { ctx } = this;
    const objectSwitch = { post: 'announcement', token: 'announcementToken' };
    const objectType = objectSwitch[quoteType] || objectSwitch.post
    try {
      const announcementId = await this.setAnnouncement(sender, title, content, 0, 0);
      if(!announcementId) return false;

      return await this.service.notify.event.sendEvent(0, receivingIds, 'annouce', announcementId, objectType, quoteId || 0);
    }
    catch(e) {
      this.logger.error('Announce service error:', e);
      return false;
    }
  }

  /** 通知文章解锁条件内的Fan票流动性不足 */
  async postInsufficientLiquidity(postId, tokenId) {
    const { ctx } = this;
    const autoName = 'auto_insufficient_liquidity';

    const post = await this.service.post.get(postId);
    if (!post) return false;
    const token = await this.service.token.mineToken.get(tokenId);
    if (!token) return false;

    // 今天已经通知过了就不重复通知了
    const sql = `
      SELECT a.id
      FROM announcement a
      JOIN notify_event n
        ON n.object_id = a.id
        AND n.object_type IN('announcement', 'announcementToken')
      WHERE a.sender = :autoName AND n.remark = :postId AND DATE(n.create_time) = CURDATE();
    `;
    const aids = await this.app.mysql.query(sql, { autoName, postId });
    if (aids.length > 0) return -1;

    const title = `流动性不足提示`;
    const content = `您发布的文章因为Fan票 ${token.symbol} 流动性不足，读者们无法使用一键解锁功能了呢。<br>Fan票协作者或创始人可以通过“添加流动金”或是“转入直通车”来提升Fan票的流动性。<br><a href="https://www.yuque.com/matataki/matataki/xzzv3r">如何添加流动性？</a>`;
    return await this.targetedPost(autoName, [post.uid], title, content, postId, 'post'); 
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
