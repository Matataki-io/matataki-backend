'use strict';

const Service = require('egg').Service;
const _ = require('lodash');

class SupportService extends Service {

  async commentList(signid, page = 1, pagesize = 20) {

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

    const sql = 'SELECT s.amount, s.platform, s.signid, s.create_time,s.action, u.id, u.username, u.nickname, u.avatar, c.comment '
      + 'FROM ( '
      + 'SELECT id,uid,signId,amount,num,platform,create_time,status,2 AS action FROM orders WHERE signId = :signid '
      + 'UNION ALL '
      + 'SELECT id,uid,signId,amount,0 AS num,platform,create_time,status,1 AS action FROM supports WHERE signId = :signid '
      + ') s '
      + 'LEFT JOIN users u ON s.uid = u.id '
      + 'LEFT JOIN comments c ON c.sign_id = s.signid  AND c.uid = s.uid AND s.action=1 '
      + 'WHERE s.status = 1 ORDER BY s.create_time DESC LIMIT :start, :end;';
    const results = await this.app.mysql.query(
      sql,
      // 'SELECT s.amount, s.platform, s.signid, s.create_time, u.id, u.username, u.nickname, u.avatar, c.comment FROM supports s '
      // // 一个user在同一篇文章下的comment和support
      // + 'LEFT JOIN users u ON s.uid = u.id '
      // + 'LEFT JOIN comments c ON c.sign_id = s.signid AND c.uid = u.id '
      // + 'WHERE s.status = 1 AND s.signid = :signid ORDER BY s.create_time DESC limit :start, :end;',
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

    this.app.mysql.queryFromat = function(query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function(txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    };

    if (userid === null) {
      return null;
    }

    // const products = await this.app.mysql.query(
    //   'SELECT p.sign_id, p.digital_copy, p.support_id, p.status, r.title, s.symbol, s.amount, s.create_time '
    //   + 'FROM product_stock_keys p '
    //   + 'INNER JOIN supports s ON p.support_id = s.id '
    //   + 'INNER JOIN product_prices r ON r.sign_id = p.sign_id AND r.symbol = \'EOS\''
    //   + 'WHERE s.uid = :userid ORDER BY s.create_time DESC LIMIT :start, :end;',
    //   { userid, start: (page - 1) * pagesize, end: 1 * pagesize }
    // );

    // 获取用户所有的订单
    const orders = await this.app.mysql.query(
      'SELECT o.signid AS sign_id, o.id AS order_id, o.symbol, o.amount, o.create_time, r.title FROM orders o '
      + 'INNER JOIN product_prices r ON r.sign_id = o.signid AND r.symbol = \'EOS\' '
      + 'WHERE o.uid = :userid ORDER BY o.id DESC LIMIT :start, :end;',
      { userid, start: (page - 1) * pagesize, end: 1 * pagesize }
    );

    if (orders.length === 0) {
      return [];
    }

    // 取出订单的id列表
    const orderids = [];
    _.each(orders, row => {
      row.digital_copy = '';
      orderids.push(row.order_id);
    });

    // 取出订单对应的keys
    const keys = await this.app.mysql.query(
      'SELECT digital_copy, order_id FROM product_stock_keys WHERE order_id IN (:orderids);',
      { orderids }
    );

    // 给每个订单塞上key string
    // todo: 链接只需要塞一次, 这里还没有做修改
    _.each(keys, row => {
      _.each(orders, row2 => {
        if (row.order_id === row2.order_id) {
          row2.digital_copy = row2.digital_copy + row.digital_copy + ',';
        }
      });
    });

    // 去除小尾巴
    _.each(orders, row => {
      row.digital_copy = row.digital_copy.substring(0, row.digital_copy.length - 1);
    });

    return orders;
  }

}

module.exports = SupportService;
