'use strict';

const Controller = require('egg').Controller;
var _ = require('lodash');


class ShareController extends Controller {


  async shares() {
    const pagesize = 20;

    const { page = 1, signid } = this.ctx.query;

    if (!signid) {
      this.ctx.status = 401;
      this.ctx.body = "signid required";
      return;
    }

    let results = await this.app.mysql.query(
      'select a.amount, a.platform, a.symbol, a.signid, a.create_time, b.nickname, b.username from supports a left join users b on a.uid = b.id where a.status = 1 and a.signid = ? order by a.create_time desc limit ?,?',
      [signid, (page - 1) * pagesize, pagesize]
    );

    let signids = [];
    _.each(results, (row) => {
      signids.push(row.signid);
    })

    if (signids.length > 0) {

      const comments = await this.app.mysql.select('comments', {
        where: {
          sign_id: signids
        },
        orders: [['create_time', 'desc']], // 排序方式
        limit: pagesize, // 返回数据量
        offset: (page - 1) * pagesize, // 数据偏移量
      });

      _.each(results, (row) => {
        var comment = _.find(comments, _.matches({ sign_id: row.signid, username: row.username }));

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
