'use strict';

const Controller = require('../core/base_controller');

const moment = require('moment');
var _ = require('lodash');

class DraftsController extends Controller {

  constructor(ctx) {
    super(ctx);
  }

  async drafts() {
    const pagesize = 20;

    const { page = 1 } = this.ctx.query;

    let user = await this.get_user();

    let results = await this.app.mysql.query(
      'select * from drafts where uid = ? order by update_time desc limit ?, ?',
      [user.id, (page - 1) * pagesize, pagesize]
    );

    this.ctx.body = results;
  }

  async get_user() {
    const current_user = this.get_current_user();

    try {
      this.checkAuth(current_user);
    } catch (err) {
      this.ctx.status = 401;
      this.ctx.body = err.message;
      return;
    }

    let user = await this.app.mysql.get('users', { username: current_user });

    if (!user) {

      let newuser = await this.app.mysql.insert('users', {
        username: current_user,
        create_time: moment().format('YYYY-MM-DD HH:mm:ss')
      });

      user =  await this.app.mysql.get('users', { username: current_user });
    }

    return user;
  }

  async save() {
    const ctx = this.ctx;

    const { id = '', title = '', content = '' } = ctx.request.body;

    const user = await this.get_user();

    if (id) {
      await this.save_draft(user.id, id, title, content);
    } else {
      await this.create_draft(user.id, title, content);
    }
  }

  async save_draft(uid, id, title, content) {
    const draft = await this.app.mysql.get('drafts', { id: id });

    if (!draft) {
      this.ctx.body = { msg: 'draft not found ' };
      this.ctx.status = 500;
      return;
    }

    if (draft.uid !== uid) {
      this.ctx.body = { msg: 'can modify other user draft' };
      this.ctx.status = 500;
      return;
    }

    try {
      const now = moment().format('YYYY-MM-DD HH:mm:ss');

      let result = await this.app.mysql.update("drafts", {
        title,
        content,
        update_time: now
      }, { where: { id: id } });

      const updateSuccess = result.affectedRows === 1;

      if (updateSuccess) {
        this.ctx.logger.info('save draft success ..');
        this.ctx.body = { msg: 'success' };
        this.ctx.status = 201;
      } else {
        this.ctx.logger.error('save draft err ', err);
        this.ctx.body = { msg: 'save draft fail' };
        this.ctx.status = 500;
      }

    } catch (err) {
      this.ctx.logger.error(err.sqlMessage);
      this.ctx.body = { msg: 'save draft ' + err.sqlMessage };
      this.ctx.status = 500;
    }
  }

  async create_draft(uid, title, content) {

    try {
      const now = moment().format('YYYY-MM-DD HH:mm:ss');

      const result = await this.app.mysql.insert('drafts', {
        uid,
        title,
        content,
        create_time: now,
        update_time: now,
      });

      const updateSuccess = result.affectedRows === 1;

      if (updateSuccess) {
        this.ctx.logger.info('create draft success ..');
        this.ctx.body = { msg: 'success' };
        this.ctx.status = 201;

      } else {
        this.ctx.logger.error('create draft err ', err);
        this.ctx.body = { msg: 'create draft fail' };
        this.ctx.status = 500;
      }

    } catch (err) {
      this.ctx.logger.error(err.sqlMessage);
      this.ctx.body = { msg: 'create draft ' + err.sqlMessage };
      this.ctx.status = 500;
    }
  }

  async draft() {
    const id = this.ctx.params.id;

    const user = await this.get_user();

    const draft = await this.app.mysql.get('drafts', { id: id });

    if (!draft) {
      this.ctx.body = { msg: 'draft not found ' };
      this.ctx.status = 404;
      return;
    }

    if (draft.uid !== user.id) {
      this.ctx.body = { msg: 'can get other user draft' };
      this.ctx.status = 500;
      return;
    }

    this.ctx.body = draft;
    this.ctx.status = 200;
  }

  async delete() {
    const id = this.ctx.params.id;

    const user = await this.get_user();

    const draft = await this.app.mysql.get('drafts', { id: id });

    if (!draft) {
      this.ctx.body = { msg: 'draft not found' };
      this.ctx.status = 404;
      return;
    }

    if (draft.uid !== user.id) {
      this.ctx.body = { msg: 'can delete other user draft' };
      this.ctx.status = 500;
      return;
    }

    const result = await this.app.mysql.delete('drafts', { id: id });

    const updateSuccess = result.affectedRows === 1;

    if (updateSuccess) {
      this.ctx.body = { msg: 'delete success' };
      this.ctx.status = 200;
    } else {
      this.ctx.body = { msg: 'delete fail' };
      this.ctx.status = 500;
    }

  }

}

module.exports = DraftsController;