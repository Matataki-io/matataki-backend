'use strict';
const consts = require('./consts');

const Service = require('egg').Service;
const _ = require('lodash');
const moment = require('moment');

class DraftService extends Service {

  async get(id) {
    const draft = await this.app.mysql.get('drafts', { id });
    if (!draft) {
      return;
    }

    // 分配标签
    let tag_arr = draft.tags.split(',');
    tag_arr = tag_arr.filter(x => x);
    draft.tags = tag_arr;

    // 持币阅读
    if (Number(draft.require_holdtokens) === 1) {
      const sql = 'SELECT token_id, amount FROM draft_minetokens WHERE draft_id = ?;';
      draft.require_holdtokens = await this.app.mysql.query(sql, [ draft.id ]);
    } else {
      draft.require_holdtokens = [];
    }

    // 持币阅读支付
    if (Number(draft.require_buy) === 1) {
      const sql = 'SELECT token_id, amount FROM draft_prices WHERE draft_id = ?;';
      draft.require_buy = await this.app.mysql.query(sql, [ draft.id ]);
    } else {
      draft.require_buy = [];
    }

    // 编辑持币
    if (Number(draft.editor_require_holdtokens) === 1) {
      const sql = 'SELECT token_id, amount FROM draft_edit_minetokens WHERE draft_id = ?;';
      draft.editor_require_holdtokens = await this.app.mysql.query(sql, [ draft.id ]);
    } else {
      draft.editor_require_holdtokens = [];
    }

    return draft;
  }

  /** 软删除草稿 */
  async delete(draftId) {
    const result = await this.app.mysql.update('drafts', { status: 1 }, { where: { id: draftId } });
    return result.affectedRows === 1;
  }

  /** 将草稿发表为文章 */
  async postDraft(draftId) {
    const { ctx } = this;
    const draft = await this.get(draftId);
    // 草稿不存在
    if (!draft) return ctx.msg.draftNotFound;
    const user = await this.service.user.get(draft.uid);
    // 用户不存在
    if (!user) return ctx.msg.userNotExist;
    // 草稿被软删除
    if (draft.status === 1) return {
      ...ctx.msg.draftNotFound,
      user,
      draft
    }
    const author = user.nickname || user.username;

    // 格式化 ，token_id 改为 tokenId
    const map = tokens => tokens.map(token => { return { amount: token.amount, tokenId: token.token_id }});
    // 发布
    const result = await this.service.post.fullPublish(
      user,
      author,
      draft.title,
      {
        author,
        title: draft.title,
        content: draft.content
      },
      draft.fission_factor || 0,
      draft.cover,
      draft.is_original,
      user.platform,
      draft.tags,
      draft.assosiateWith,
      draft.comment_pay_point,
      draft.short_content,
      draft.cc_license,
      map(draft.require_holdtokens),
      map(draft.require_buy),
      map(draft.editor_require_holdtokens),
      null,
      draft.ipfs_hide
    );
    // 发布成功后删除草稿
    if (result.code === 0) await this.delete(draftId);
    return {
      ...result,
      user,
      draft
    };
  }

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
        const sql = 'SELECT d.*, u.avatar, u.username, u.nickname FROM drafts d, users u WHERE d.id = ? AND d.uid = u.id AND d.`status` = 0;';
        let draftContent = await this.app.mysql.query(sql, [ id ]);
        draftContent = draftContent[0];

        if (draftContent) {
          // 分配标签
          let tag_arr = draftContent.tags.split(',');
          tag_arr = tag_arr.filter(x => { return x !== ''; });
          draftContent.tags = tag_arr;

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

  async previewDraftTime(id) {
    try {
      const time = await this.app.redis.ttl(`preview:${id}`);
      if (time) {
        return {
          code: 0,
          data: time,
        };
      }
      return {
        code: -1,
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
