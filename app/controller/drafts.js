'use strict';

const Controller = require('../core/base_controller');

const moment = require('moment');
var _ = require('lodash');

class DraftsController extends Controller {

  constructor(ctx) {
    super(ctx);
  }

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


  async save() {
    const ctx = this.ctx;

    const { id = '', title = '', content = '', cover, fissionFactor = 2000, is_original = 0, origin_url = '', tags = '' } = ctx.request.body;

    if (id) {
      await this.save_draft(this.ctx.user.id, id, title, content, cover, fissionFactor, is_original, origin_url, tags);
    } else {
      await this.create_draft(this.ctx.user.id, title, content, cover, fissionFactor, is_original, origin_url, tags);
    }
  }

  async save_draft(uid, id, title, content, cover, fissionFactor, is_original, origin_url, tags) {
    const draft = await this.app.mysql.get('drafts', { id });

    if (!draft) {
      this.ctx.body = this.ctx.msg.draftNotFound;
      return;
    }

    if (draft.uid !== uid) {
      this.ctx.body = this.ctx.msg.notYourDraft;
      return;
    }

    try {
      const now = moment().format('YYYY-MM-DD HH:mm:ss');

      const result = await this.app.mysql.update('drafts', {
        title,
        content,
        cover,
        fission_factor: fissionFactor,
        update_time: now,
        is_original,
        origin_url,
        tags,
      }, { where: { id } });

      const updateSuccess = result.affectedRows === 1;

      if (updateSuccess) {
        this.ctx.body = this.ctx.msg.success;
      } else {
        this.ctx.logger.error('save draft err ');
        this.ctx.body = this.ctx.msg.failure;
      }

    } catch (err) {
      this.ctx.logger.error(err.sqlMessage);
      this.ctx.body = this.ctx.msg.failure;
    }
  }

  async create_draft(uid, title, content, cover, fissionFactor, is_original, origin_url, tags) {

    try {
      const now = moment().format('YYYY-MM-DD HH:mm:ss');

      const result = await this.app.mysql.insert('drafts', {
        uid,
        title,
        content,
        cover,
        fission_factor: fissionFactor,
        is_original,
        origin_url,
        create_time: now,
        update_time: now,
        tags,
      });

      const updateSuccess = result.affectedRows === 1;

      if (updateSuccess) {
        this.ctx.logger.info('create draft success ..');
        this.ctx.body = this.ctx.msg.success;

      } else {
        this.ctx.logger.error('create draft err ');
        this.ctx.body = this.ctx.msg.failure;
      }

    } catch (err) {
      this.ctx.logger.error(err.sqlMessage);
      this.ctx.body = this.ctx.msg.failure;
    }
  }

  async draft() {
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

    let tag_arr = draft.tags.split(",");
    tag_arr = tag_arr.filter((x) => { return x !== "" });
    let tags = [];
    if (tag_arr.length > 0) {
      tags = await await this.app.mysql.query(
        'select id, name from tags where id in (?) ',
        [ tag_arr ]
      );
    }
    draft.tags = tags;

    this.ctx.body = this.ctx.msg.success;
    this.ctx.body = draft;
  }

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

    const result = await this.app.mysql.delete('drafts', { id });

    const updateSuccess = result.affectedRows === 1;

    if (updateSuccess) {
      this.ctx.body = this.ctx.msg.success;
    } else {
      this.ctx.body = this.ctx.msg.failure;
    }

  }

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

}

module.exports = DraftsController;
