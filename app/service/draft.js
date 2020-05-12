'use strict';
const consts = require('./consts');

const Service = require('egg').Service;
const _ = require('lodash');
const moment = require('moment');

class DraftService extends Service {

  async draftList(uid, page, pagesize) {
    const countsql = 'SELECT COUNT(*) AS count FROM drafts d ';
    const listsql = 'SELECT d.id, d.uid, d.title, d.status, d.create_time, d.update_time, d.fission_factor,'
      + ' d.cover, d.is_original, d.tags, u.nickname, u.avatar FROM drafts d INNER JOIN users u ON d.uid = u.id ';

    const wheresql = 'WHERE d.uid = :uid AND d.status = 0 ';
    const ordersql = 'ORDER BY d.update_time DESC LIMIT :start, :end ';

    const sqlcode = countsql + wheresql + ';' + listsql + wheresql + ordersql + ';';
    const queryResult = await this.app.mysql.query(
      sqlcode,
      { uid, start: (page - 1) * pagesize, end: 1 * pagesize }
    );

    const amount = queryResult[0];
    const drafts = queryResult[1];

    return { count: amount[0].count, list: drafts };
  }

  async transferOwner(uid, draftid, current_uid) {
    const draft = await this.app.mysql.get('drafts', { id: draftid });
    if (!draft) {
      throw new Error('draft not found');
    }

    if (draft.uid !== current_uid) {
      throw new Error('not your draft');
    }

    const user = await this.service.account.binding.get2({ id: uid });
    // const user = await this.app.mysql.get('users', { id: uid });
    if (!user) {
      throw new Error('user not found');
    }

    if (!user.accept) {
      throw new Error('target user not accept owner transfer');
    }

    const conn = await this.app.mysql.beginTransaction();
    try {
      await conn.update('drafts', {
        uid: user.id,
      }, { where: { id: draft.id } });

      await conn.insert('post_transfer_log', {
        postid: draftid,
        fromuid: current_uid,
        touid: uid,
        type: 'draft',
        create_time: moment().format('YYYY-MM-DD HH:mm:ss'),
      });

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      this.ctx.logger.error(err);
      return false;
    }

    return true;
  }

  async previewSetId(id, current_uid) {
    try {
      // 判断是不是自己的文章
      const selfDraft = await this.app.mysql.get('drafts', {
        id,
        uid: current_uid,
      });

      if (selfDraft) {
        // 60 * 60 * 24
        await this.app.redis.set(`preview:${id}`, Date.now(), 'EX', 86400);
        return true;
      }
      return false;

    } catch (e) {
      console.log(e);
      this.ctx.logger.error(e);
      return false;
    }
  }
  async previewDraft(id) {
    try {
      // 判断权限
      const previewRedis = await this.app.redis.get(`preview:${id}`);
      if (previewRedis) {
        // 获取草稿内容
        const sql = 'SELECT d.*, u.avatar, u.username, u.nickname FROM drafts d, users u WHERE d.id = ? AND d.uid = u.id;';
        let draftContent = await this.app.mysql.query(sql, [ id ]);
        draftContent = draftContent[0];

        if (draftContent) {
          // 分配标签
          let tag_arr = draftContent.tags.split(',');
          tag_arr = tag_arr.filter(x => { return x !== ''; });
          let tags = [];
          if (tag_arr.length > 0) {
            tags = await await this.app.mysql.query(
              'select id, name from tags where id in (?) ',
              [ tag_arr ]
            );
          }
          draftContent.tags = tags;

          return {
            code: 0,
            data: draftContent,
          };
        }
        return {
          code: -1,
          message: '草稿不存在',
        };

      }
      return {
        code: -1,
        message: '预览链接不存在或失效',
      };

    } catch (e) {
      console.log(e);
      this.ctx.logger.error(e);
      return {
        code: -1,
      };
    }

  }

}

module.exports = DraftService;
