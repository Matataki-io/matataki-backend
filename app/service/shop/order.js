'use strict';
const consts = require('../consts');
const Service = require('egg').Service;

// 商城订单类
class OrderService extends Service {

  // 处理发货，todo：适用数字copy类的商品，posts表还需要增加商品分类
  async shipped(post, support, conn) {
    // 判断文章所属频道，不是商品直接返回true
    if (post.channel_id !== consts.channels.product) { return true; }

    // 判断金额是否满足商品定价
    const product_price = await conn.query(
      'SELECT price, decimals FROM product_prices WHERE sign_id = ? AND platform = ? AND symbol = ? AND status=1;',
      [ support.signid, support.platform, support.symbol ]
    );
    // 配置错误，没有商品价格信息
    if (!product_price || product_price.length === 0) {
      console.log('商品配置错误，sign_id:' + support.signid);
      return false;
    }
    // 判断付款金额
    if (product_price[0].price > support.amount) {
      console.log('商品付款金额错误，amount:' + support.amount);
      return false;
    }

    // 减库存数量
    const resultStockQuantity = await conn.query(
      'UPDATE product_prices SET stock_quantity = stock_quantity - 1 WHERE sign_id = ? AND stock_quantity > 0;',
      [ support.signid ]
    );

    // 没有库存，失败
    if (resultStockQuantity.affectedRows === 0) {
      console.log('商品库存不足，sign_id:' + support.signid);
      return false;
    }

    // 锁定商品
    const resultKeys = await conn.query(
      'UPDATE product_stock_keys SET status=1, support_id = ? '
      + 'WHERE id = (SELECT id FROM (SELECT id FROM product_stock_keys WHERE sign_id=? AND status=0 LIMIT 1) t);',
      [ support.id, support.signid ]
    );

    // 没有库存，失败
    if (resultKeys.affectedRows === 0) {
      console.log('商品库存不足，sign_id:' + support.signid);
      return false;
    }

    // 统计商品销量+1
    await this.app.mysql.query(
      'INSERT INTO post_read_count(post_id, sale_count) VALUES (?, ?) ON DUPLICATE KEY UPDATE sale_count = sale_count + 1;',
      [ support.signid, 1 ]
    );

    return true;
  }

}

module.exports = OrderService;
