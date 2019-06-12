'use strict';

const Service = require('egg').Service;
var _ = require('lodash');

class SupportService extends Service {

  async commentList(signid, page = 1, pagesize = 20) {

    this.app.mysql.queryFromat = function (query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function (txt, key) {
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
      'SELECT s.amount, s.platform, s.signid, s.create_time, u.id, u.username, u.nickname, u.avatar, c.comment FROM supports s '
      // 一个user在同一篇文章下的comment和support
      + 'LEFT JOIN users u ON s.uid = u.id '
      + 'LEFT JOIN comments c ON c.sign_id = s.signid AND c.uid = u.id '
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

  async getUserProducts(page = 1, pagesize = 20, userid = null) {

    this.app.mysql.queryFromat = function (query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function (txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    };

    if (userid === null) {
      return null;
    }

    const products = await this.app.mysql.query(
      'SELECT p.sign_id, p.digital_copy, p.support_id, p.status, r.title, s.symbol, s.amount, s.create_time '
      + 'FROM product_stock_keys p '
      + 'INNER JOIN supports s ON p.support_id = s.id '
      + 'INNER JOIN product_prices r ON r.sign_id = p.sign_id AND r.symbol = \'EOS\''
      + 'WHERE s.uid = :userid ORDER BY s.create_time DESC LIMIT :start, :end;',
      { userid, start: (page - 1) * pagesize, end: 1 * pagesize }
    );

    return products;
  }

}

module.exports = SupportService;
