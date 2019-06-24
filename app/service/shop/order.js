'use strict';
const consts = require('../consts');
const moment = require('moment');
const Service = require('egg').Service;

// 商城订单类
class OrderService extends Service {
  // todo：处理购买多个
  // 发邮件的地方，购买多个，发邮件使用orders
  // 显示的地方，购买多个
  // 购买的地方判断必须是商品频道
  // 处理历史订单数据，supports-》orders
  // product_stock_keys.support_id 要使用orders表的id，
  // 返回文章详情属性使用orders
  // 文章赞赏列表怎么办，supports+orders
  // 用户购买列表使用orders

  // 创建订单
  async create(signId, contract, symbol, amount, platform, num = 0, referreruid) {
    const { ctx } = this;
    const message = ctx.msg;

    // 判断推荐人
    if (referreruid > 0) {
      if (referreruid === this.ctx.user.id) {
        return message.referrNoYourself;
      }
      const ref = await this.get_referrer(referreruid);
      if (ref === null) {
        return message.referrerNotExist;
      }
    }

    // 校验商品价格
    const prices = await this.service.post.getPrices(signId);
    const price = prices.find(p => p.platform === platform);
    if (!price) {
      return message.postCannotBuy;
    }
    // 总价错误
    if (amount !== price.price * num) {
      return message.postPriceError;
    }

    const now = moment().format('YYYY-MM-DD HH:mm:ss');

    try {
      let amount_copy = amount;

      if (platform === 'ont') {
        amount_copy = amount * 10000;
      }

      const result = await this.app.mysql.query(
        'INSERT INTO orders (uid, signid, contract, symbol, num, amount, price, referreruid, platform, status, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ? ,?, ?)',
        [ this.ctx.user.id, signId, contract, symbol, num, amount_copy, price.price, referreruid, platform, 0, now ]
      );

      const updateSuccess = result.affectedRows === 1;

      const oid = result.insertId;

      if (updateSuccess) {
        const ret = message.success;
        ret.data = { orderId: oid };
        return ret;
      }
      return ctx.msg.failure;

    } catch (err) {
      this.ctx.logger.error('create order error', err, this.ctx.user.id, signId, symbol, amount);
      return message.serverError;
    }
  }

  // 处理发货
  async shipped(post, payment, conn) {
    // 判断文章所属频道，不是商品直接返回true
    if (post.channel_id !== consts.postChannels.product) {
      return true;
    }

    // 判断数量是否正确
    if (payment.amount < payment.num * payment.price) {
      return false;
    }


    // 判断金额是否满足商品定价
    const product_price = await conn.query(
      'SELECT price, decimals FROM product_prices WHERE sign_id = ? AND platform = ? AND symbol = ? AND status=1;',
      [ payment.signid, payment.platform, payment.symbol ]
    );
    // 配置错误，没有商品价格信息
    if (!product_price || product_price.length === 0) {
      console.log('商品配置错误，sign_id:' + payment.signid);
      return false;
    }
    // 判断付款金额
    if (product_price[0].price > payment.amount) {
      console.log('商品付款金额错误，amount:' + payment.amount);
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

    // 锁定商品，可能有bug
    const resultKeys = await conn.query(
      'UPDATE product_stock_keys SET status=1, support_id = ? '
      + 'WHERE id IN (SELECT id FROM (SELECT id FROM product_stock_keys WHERE sign_id=? AND status=0 LIMIT ?) t);',
      [ payment.id, payment.signid, payment.num ]
    );

    // 库存不够，失败
    if (resultKeys.affectedRows < payment.num) {
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

}

module.exports = OrderService;
