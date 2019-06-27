'use strict';
const consts = require('../consts');
const moment = require('moment');
const Service = require('egg').Service;

// 商城订单类
class OrderService extends Service {
  // todo：处理购买、赞赏分开，可以购买多个
  // √ 云芝新 发邮件的地方，购买多个，发邮件使用orders
  // √ 云芝新 用户购买列表使用orders
  // √ 陈浩 购买的地方判断必须是商品频道
  // √ 陈浩 文章赞赏列表怎么办，supports+orders

  // product_stock_keys.support_id 要使用orders表的id，还需要再排查下
  // getPostProfile 返回文章详情属性使用orders，从orders里面查询是否已经买过，去掉查询key的代码，显示的地方，购买多个待删除
  // 处理历史订单数据，supports-》orders
  // 订单的评论
  // 已经购买的商品bug

  // 创建订单处理订单的评论
  // 创建support时，处理评论

  // 创建订单
  async create(userId, signId, contract, symbol, amount, platform, num, referreruid) {
    // 校验商品价格
    const prices = await this.service.post.getPrices(signId);
    const price = prices.find(p => p.platform === platform);
    if (!price) {
      return -1; // message.postCannotBuy;
    }
    // 总价错误
    if (amount !== price.price * num) {
      return -2; // message.postPriceError;
    }

    const now = moment().format('YYYY-MM-DD HH:mm:ss');

    try {
      const result = await this.app.mysql.query(
        'INSERT INTO orders (uid, signid, contract, symbol, num, amount, price, decimals, referreruid, platform, status, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ? ,?, ?, ?)',
        [ userId, signId, contract, symbol, num, amount, price.price, price.decimals, referreruid, platform, 0, now ]
      );

      const updateSuccess = result.affectedRows === 1;

      const orderId = result.insertId;

      if (updateSuccess) {
        return orderId;
      }
      return -3; // message.failure;

    } catch (err) {
      this.ctx.logger.error('create order error', err, userId, signId, symbol, amount);
      return -99; // message.serverError;
    }
  }

  // 处理发货
  async shipped(post, payment, conn) {
    // 判断文章所属频道，不是商品直接返回true
    if (post.channel_id !== consts.postChannels.product) {
      return true;
    }

    // 判断金额、数量、单价是否正确
    if (payment.amount < payment.num * payment.price) {
      this.ctx.logger.error('发货失败，订单金额、数量、单价不正确 %j', payment);
      return false;
    }

    // 减库存数量
    const resultStockQuantity = await conn.query(
      'UPDATE product_prices SET stock_quantity = stock_quantity - ? WHERE sign_id = ? AND stock_quantity >= ?;',
      [ payment.num, payment.signid, payment.num ]
    );

    // 没有库存，失败
    if (resultStockQuantity.affectedRows === 0) {
      console.log('商品库存不足，sign_id:' + payment.signid);
      return false;
    }

    // 根据购买数量num锁定商品
    const resultKeys = await conn.query(
      'UPDATE product_stock_keys SET status=1, order_id = ? '
      + 'WHERE id IN (SELECT id FROM (SELECT id FROM product_stock_keys WHERE sign_id=? AND status=0 LIMIT ?) t);',
      [ payment.id, payment.signid, payment.num ]
    );

    // 库存不够，失败
    if (resultKeys.affectedRows !== payment.num) {
      console.log('商品库存不足，sign_id:' + payment.signid);
      return false;
    }

    // 统计商品销量+payment.num
    await conn.query(
      'INSERT INTO post_read_count(post_id, real_read_count, sale_count, support_count, eos_value_count, ont_value_count)'
      + ' VALUES (?, 0, ?, 0, 0, 0) ON DUPLICATE KEY UPDATE sale_count = sale_count + ?;',
      [ payment.signid, payment.num, payment.num ]
    );

    return true;
  }

  // 获取用户已经购买的商品
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

module.exports = OrderService;
