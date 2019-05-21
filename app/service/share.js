'use strict';

const Service = require('egg').Service;
var _ = require('lodash');

class ShareService extends Service {

  async shareList(signid, page = 1, pagesize = 20) {

    this.app.mysql.queryFromat = function(query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function(txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    };

    if (!signid) {
      return null;
    }

    const results = await this.app.mysql.query(
      'SELECT s.amount, s.platform, s.signid, s.create_time, u.username, u.nickname, u.avatar, c.comment FROM supports s '
      // 一个user在同一篇文章下的comment和support
      + 'INNER JOIN users u ON s.uid = u.id '
      + 'INNER JOIN comments c ON c.sign_id = s.signid AND c.username = u.username '
      + 'WHERE s.status = 1 AND s.signid = :signid ORDER BY s.create_time DESC limit :start, :end;',
      { signid, start: (page - 1) * pagesize, end: pagesize }
    );

    _.each(results, row => {
      if (row.comment === null) {
        row.comment = '';
      }
    });

    return results;
  }

}

module.exports = ShareService;
