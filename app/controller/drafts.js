'use strict';

const Controller = require('../core/base_controller');

const moment = require('moment');
const _ = require('lodash');

class DraftsController extends Controller {

  constructor(ctx) {
    super(ctx);
  }

  // 获取草稿列表
  async drafts() {
    const ctx = this.ctx;

    const { page = 1, pagesize = 20 } = ctx.query;

    if (isNaN(parseInt(page)) || isNaN(parseInt(pagesize))) {
      ctx.body = ctx.msg.paramsError;
      return;
    }

    const draftList = await this.service.draft.draftList(ctx.user.id, page, pagesize);

    ctx.body = ctx.msg.success;
    ctx.body.data = draftList;
  }


  // 保存草稿
  async save() {
    const ctx = this.ctx;

    const {
      id = '',
      title = '',
      content = '',
      cover,
      fissionFactor = 2000,
      is_original = 0,
      tags = [],
      commentPayPoint = 0,
      short_content = '',
      cc_license = '',
      ipfs_hide = 0,
      requireToken = [], // 阅读 持币
      requireBuy = [], // 阅读 购买
      editRequireToken = [], // 编辑 持币
      assosiate_with,
    } = ctx.request.body;

    // 评论需要支付的积分
    const comment_pay_point = parseInt(commentPayPoint);
    // if (comment_pay_point > 99999 || comment_pay_point < 1) {
    //   ctx.body = ctx.msg.pointCommentSettingError;
    //   return;
    // }

    // 有id视为保存草稿， 没有id视为一篇新的草稿
    if (id) {
      await this.save_draft(
        this.ctx.user.id,
        id,
        title,
        content,
        cover,
        fissionFactor,
        is_original,
        tags,
        comment_pay_point,
        short_content,
        cc_license,
        ipfs_hide,
        requireToken,
        requireBuy,
        editRequireToken,
        assosiate_with
      );
    } else {
      await this.create_draft(
        this.ctx.user.id,
        title,
        content,
        cover,
        fissionFactor,
        is_original,
        tags,
        comment_pay_point,
        short_content,
        cc_license,
        ipfs_hide,
        requireToken,
        requireBuy,
        editRequireToken,
        assosiate_with
      );
    }
  }

  // 更新一篇已经存在的草稿
  async save_draft(
    uid,
    id,
    title,
    content,
    cover,
    fissionFactor,
    is_original,
    tags,
    comment_pay_point,
    short_content,
    cc_license,
    ipfs_hide,
    requireToken,
    requireBuy,
    editRequireToken,
    assosiate_with
  ) {
    const conn = await this.app.mysql.beginTransaction(); // 初始化事务

    try {
      const draft = await conn.get('drafts', { id });

      if (!draft) {
        this.ctx.body = this.ctx.msg.draftNotFound;
        return;
      }

      if (draft.uid !== uid) {
        this.ctx.body = this.ctx.msg.notYourDraft;
        return;
      }

      const now = moment().format('YYYY-MM-DD HH:mm:ss');
      const data = {
        title,
        content,
        cover,
        fission_factor: fissionFactor,
        update_time: now,
        is_original,
        tags: tags.join(','),
        comment_pay_point,
        short_content,
        cc_license,
        ipfs_hide,
        assosiate_with,
      };

      // 设置属性
      const setAttributes = (token, data, attributes) => {
        if (token.length > 0) {
          data[attributes] = 1;
        } else {
          data[attributes] = 0;
        }
      };

      // 如果有数据则认为持币阅读
      setAttributes(requireToken, data, 'require_holdtokens');

      // 如果有数据则认为持币支付
      setAttributes(requireBuy, data, 'require_buy');

      // 如果有数据则认为持币编辑
      setAttributes(editRequireToken, data, 'editor_require_holdtokens');

      const result = await conn.update('drafts', data, { where: { id } });

      // 清空数据并插入新数据
      const inserData = async (table, id, data) => {
        await conn.delete(table, { draft_id: id });
        for (let i = 0; i < data.length; i++) {
          await conn.insert(table, {
            draft_id: id,
            token_id: data[i].tokenId,
            amount: data[i].amount,
            create_time: now,
          });
        }
      };

      // 写入持币阅读数量
      await inserData('draft_minetokens', id, requireToken);

      // 写入持币支付数量
      await inserData('draft_prices', id, requireBuy);

      // 写入持币编辑数量
      await inserData('draft_edit_minetokens', id, editRequireToken);

      const updateSuccess = result.affectedRows === 1;

      await conn.commit(); // 提交事务

      if (updateSuccess) {
        this.ctx.body = this.ctx.msg.success;
      } else {
        this.ctx.logger.error('save draft err ');
        this.ctx.body = this.ctx.msg.failure;
      }

    } catch (err) {
      await conn.rollback();
      this.ctx.logger.error(err.sqlMessage);
      this.ctx.body = this.ctx.msg.failure;
    }
  }

  // 创建新的草稿
  async create_draft(
    uid,
    title,
    content,
    cover,
    fissionFactor,
    is_original,
    tags,
    comment_pay_point,
    short_content,
    cc_license,
    ipfs_hide,
    requireToken,
    requireBuy,
    editRequireToken,
    assosiate_with
  ) {

    const conn = await this.app.mysql.beginTransaction(); // 初始化事务
    try {
      const now = moment().format('YYYY-MM-DD HH:mm:ss');

      const data = {
        uid,
        title,
        content,
        cover,
        fission_factor: fissionFactor,
        is_original,
        create_time: now,
        update_time: now,
        tags: tags.join(','),
        comment_pay_point,
        short_content,
        cc_license,
        ipfs_hide,
        assosiate_with,
      };

      // 设置属性
      const setAttributes = (token, data, attributes) => {
        if (token.length > 0) {
          data[attributes] = 1;
        } else {
          data[attributes] = 0;
        }
      };

      // 如果有数据则认为持币阅读
      setAttributes(requireToken, data, 'require_holdtokens');

      // 如果有数据则认为持币支付
      setAttributes(requireBuy, data, 'require_buy');

      // 如果有数据则认为持币编辑
      setAttributes(editRequireToken, data, 'editor_require_holdtokens');

      const result = await conn.insert('drafts', data);

      // 插入新数据
      const inserData = async (table, id, data) => {
        for (let i = 0; i < data.length; i++) {
          await conn.insert(table, {
            draft_id: id,
            token_id: data[i].tokenId,
            amount: data[i].amount,
            create_time: now,
          });
        }
      };

      // 写入持币阅读数量
      await inserData('draft_minetokens', result.insertId, requireToken);

      // 写入持币支付数量
      await inserData('draft_prices', result.insertId, requireBuy);

      // 写入持币编辑数量
      await inserData('draft_edit_minetokens', result.insertId, editRequireToken);

      await conn.commit(); // 提交事务

      const updateSuccess = result.affectedRows === 1;

      if (updateSuccess) {
        this.ctx.logger.info('create draft success ..');
        this.ctx.body = this.ctx.msg.success;
        this.ctx.body.data = result.insertId;

      } else {
        this.ctx.logger.error('create draft err ');
        this.ctx.body = this.ctx.msg.failure;
      }

    } catch (err) {
      await conn.rollback();
      this.ctx.logger.error(err.sqlMessage);
      this.ctx.body = this.ctx.msg.failure;
    }
  }

  // 获取一篇草稿
  async draft() {

    try {
      const id = this.ctx.params.id;

      const draft = await this.app.mysql.get('drafts', { id });

      if (!draft) {
        this.ctx.body = this.ctx.msg.draftNotFound;
        return;
      }

      if (draft.uid !== this.ctx.user.id) {
        this.ctx.body = this.ctx.msg.notYourDraft;
        return;
      }

      // 分配标签
      let tag_arr = draft.tags.split(',');
      tag_arr = tag_arr.filter(x => x);
      draft.tags = tag_arr;

      console.log('draft', draft);

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


      this.ctx.body = {
        ...this.ctx.msg.success,
        data: draft,
      };


    } catch (e) {
      console.log(e);
      this.ctx.body = this.ctx.msg.failure;
    }


  }

  // 删除草稿
  async delete() {
    const id = this.ctx.params.id;

    const draft = await this.app.mysql.get('drafts', { id });

    if (!draft) {
      this.ctx.body = this.ctx.msg.draftNotFound;
      return;
    }

    if (draft.uid !== this.ctx.user.id) {
      this.ctx.body = this.ctx.msg.notYourDraft;
      return;
    }

    const result = await this.app.mysql.update('drafts', { status: 1 }, { where: { id } });

    const updateSuccess = result.affectedRows === 1;

    if (updateSuccess) {
      this.ctx.body = this.ctx.msg.success;
    } else {
      this.ctx.body = this.ctx.msg.failure;
    }

  }

  // 转让草稿
  async transferOwner() {
    const ctx = this.ctx;
    const { uid, draftid } = ctx.request.body;

    const success = await this.service.draft.transferOwner(uid, draftid, ctx.user.id);

    if (success) {
      ctx.body = ctx.msg.success;
    } else {
      ctx.body = ctx.msg.failure;
    }
  }


  async previewSetId() {
    const ctx = this.ctx;
    const { id } = ctx.request.body;

    const success = await this.service.draft.previewSetId(id, ctx.user.id);

    if (success) {
      ctx.body = ctx.msg.success;
    } else {
      ctx.body = ctx.msg.failure;
    }
  }
  async previewDraft() {
    const ctx = this.ctx;
    const { id } = this.ctx.params;

    const result = await await this.service.draft.previewDraft(id);

    if (result.code === 0) {
      ctx.body = {
        ...ctx.msg.success,
        data: result.data,
      };
    } else {
      ctx.body = ctx.msg.failure;
    }
    if (result.message) {
      ctx.body.message = result.message;
    }
  }
  async previewDraftTime() {
    const ctx = this.ctx;
    const { id } = this.ctx.params;

    const result = await await this.service.draft.previewDraftTime(id);

    if (result.code === 0) {
      ctx.body = {
        ...ctx.msg.success,
        data: result.data,
      };
    } else {
      ctx.body = ctx.msg.failure;
    }
    if (result.message) {
      ctx.body.message = result.message;
    }
  }


}

module.exports = DraftsController;
