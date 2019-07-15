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
    const pagesize = 20;

    const { page = 1 } = ctx.query;

    const results = await this.app.mysql.query(
      'select d.id, d.uid, d.title, d.status, d.create_time, d.update_time, d.fission_factor, d.cover, d.is_original, d.tags, u.nickname, u.avatar from drafts d '
      + 'INNER JOIN users u ON d.uid = u.id WHERE u.id = ? order by d.update_time desc limit ?, ?',
      [ ctx.user.id, (page - 1) * pagesize, pagesize ]
    );

    ctx.body = ctx.msg.success;
    ctx.body.data = results;
  }


  async save() {
    const ctx = this.ctx;

    const { id = '', title = '', content = '', cover, fissionFactor = 2000, is_original = 0, tags = "" } = ctx.request.body;

    if (id) {
      await this.save_draft(this.ctx.user.id, id, title, content, cover, fissionFactor, is_original, tags);
    } else {
      await this.create_draft(this.ctx.user.id, title, content, cover, fissionFactor, is_original, tags);
    }
  }

  async save_draft(uid, id, title, content, cover, fissionFactor, is_original, tags) {
    const draft = await this.app.mysql.get('drafts', { id: id });

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

      let result = await this.app.mysql.update("drafts", {
        title,
        content,
        cover,
        fission_factor: fissionFactor,
        update_time: now,
        is_original,
        tags
      }, { where: { id: id } });

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

  async create_draft(uid, title, content, cover, fissionFactor, is_original, tags) {

    try {
      const now = moment().format('YYYY-MM-DD HH:mm:ss');

      const result = await this.app.mysql.insert('drafts', {
        uid,
        title,
        content,
        cover,
        fission_factor: fissionFactor,
        is_original,
        create_time: now,
        update_time: now,
        tags
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

    const draft = await this.app.mysql.get('drafts', { id: id });

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

    const draft = await this.app.mysql.get('drafts', { id: id });

    if (!draft) {
      this.ctx.body = this.ctx.msg.draftNotFound;
      return;
    }

    if (draft.uid !== this.ctx.user.id) {
      this.ctx.body = this.ctx.msg.notYourDraft;
      return;
    }

    const result = await this.app.mysql.delete('drafts', { id: id });

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
