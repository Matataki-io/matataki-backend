'use strict';

const Controller = require('egg').Controller;
var _ = require('lodash');


class ShareController extends Controller {

  async share() {
    const ctx = this.ctx;

    const { user = '', hash = '' } = ctx.request.body;

    try {
      const result = await this.app.mysql.insert('shares', {
        username: user,
        hash,
        create_time: this.app.mysql.literals.now,
      });

      const updateSuccess = result.affectedRows === 1;

      if (updateSuccess) {
        ctx.status = 200;
      } else {
        ctx.status = 500;
      }
    } catch (err) {
      ctx.logger.error(err.sqlMessage);
      ctx.body = {
        msg: 'insert error' + err.sqlMessage,
      };
      ctx.status = 500;
    }
  }


  async shares() {
    const pagesize = 20;

    const { page = 1, signid, user  } = this.ctx.query;

    let results = [];

    if (user) {
      results = await this.app.mysql.query(
        'select a.author, a.amount, a.sign_id, a.create_time,  b.nickname from actions a left join users b on a.author = b.username where a.type = ? and a.author = ? order by create_time desc limit ?,?',
        ["share", user, (page - 1) * pagesize, pagesize]
      );
    } else if (signid) {
      results = await this.app.mysql.query(
        'select a.author, a.amount, a.sign_id, a.create_time,  b.nickname from actions a left join users b on a.author = b.username where a.type = ? and a.sign_id = ? order by create_time desc limit ?,?',
        ["share", signid, (page - 1) * pagesize, pagesize]
      );
    } else {
      results = await this.app.mysql.query(
        'select a.author, a.amount, a.sign_id, a.create_time,  b.nickname from actions a left join users b on a.author = b.username where a.type = ? order by create_time desc limit ?,?',
        ["share", (page - 1) * pagesize, pagesize]
      );
    }

    let signids = [];
    _.each(results, (row) => {
      signids.push(row.sign_id);
    })

    if (signids.length > 0) {

      let whereOption2 = {
        sign_id: signids
      }

      const comments = await this.app.mysql.select('comments', {
        where: whereOption2, // WHERE 条件
        // columns: ['*'], // 要查询的表字段
        orders: [['create_time', 'desc']], // 排序方式
        limit: pagesize, // 返回数据量
        offset: (page - 1) * pagesize, // 数据偏移量
      });

      _.each(results, (row) => {
        var comment = _.find(comments, _.matches({ sign_id: row.sign_id, username: row.author }));

        if (comment) {
          row.comment = comment.comment;
        } else {
          row.comment = "";
        }
      })
    }

    this.ctx.body = results;
  }

}

module.exports = ShareController;
