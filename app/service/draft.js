'use strict';
const consts = require('./consts');

const Service = require('egg').Service;
const _ = require('lodash');
const moment = require('moment');

class DraftService extends Service {

  async transferOwner(uid, draftid, current_uid) {
    let draft = await this.app.mysql.get('drafts', { id: draftid });
    if(!draft){
      throw new Error("draft not found");
    }

    if(draft.uid !== current_uid){
      throw new Error("not your draft");
    }

    let user = await this.app.mysql.get('users', { id : uid });
    if(!user){
      throw new Error("user not found");
    }

    if(!user.accept){
      throw new Error("target user not accept owner transfer");
    }

    const conn = await this.app.mysql.beginTransaction();
    try {
      let result = await conn.query('SELECT * FROM drafts WHERE id=? limit 1 FOR UPDATE;', [draftid]);

      let target_to_modify;
      if (result && result.length > 0) {
        target_to_modify = result[0];
      }

      await conn.update("drafts", {
        uid: user.id,
      }, { where: { id: target_to_modify.id } });

      await conn.insert("post_transfer_log", {
        postid: draftid,
        fromuid: current_uid,
        touid: uid,
        type: "draft",
        create_time: moment().format('YYYY-MM-DD HH:mm:ss')
      });

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      this.ctx.logger.error(err);
      return false;
    }

    return true;
  }

}

module.exports = DraftService;
