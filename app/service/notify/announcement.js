'use strict';
const Service = require('egg').Service;

const ANNOUNCEMENT_TABLE = 'announcement';

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
    // 获公告消息和收件人列表的id
    const announcementList = await this.service.notify.event.getAnnouncementStatus(uid);
    // 过滤掉已经初始化收件人的公告
    const eventIds = announcementList.filter(age => !age.recipients_id).map(events => events.id);
    // 设定收件人
    if(eventIds.length === 0) return 0;
    return await this.service.notify.event.setEventArrayRecipient(eventIds, uid);
  }

}

module.exports = AnnouceService;
