'use strict';
const moment = require('moment');
const consts = require('./consts');

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
      'SELECT s.amount, s.platform, s.signid, s.create_time, u.username, u.nickname, u.avatar, c.comment FROM supports s '
      // 一个user在同一篇文章下的comment和support
      + 'LEFT JOIN users u ON s.uid = u.id '
      + 'LEFT JOIN comments c ON c.sign_id = s.signid AND c.username = u.username '
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


  // 赞赏（购买成功）处理
  async verifySupport() {
    try {
      const conn = await this.app.mysql.beginTransaction();

      try {
        // 行为相关者: 作者，打赏人、推荐人

        let amount = support.amount;
        let refuid = support.referreruid;
        let now = moment().format('YYYY-MM-DD HH:mm:ss');

        const post = await this.app.mysql.get('posts', { id: support.signid });

        if (!post) {
          return;
        }

        // 处理发货
        const is_shipped = await this.shipped(post, support, conn);
        if (!is_shipped) {
          await conn.rollback();
          console.log(`发货失败，sign_id: ${post.id}, support_id: ${support.id}`);
          return;
        }

        // 裂变系数
        let fission_factor = post.fission_factor;
        // 裂变最大收入
        let quota = amount * fission_factor / 1000;
        // 裂变返利比率
        const fission_rate = post.fission_rate;
        // 推荐返利比率
        const referral_rate = post.referral_rate;

        // 记录当前赞赏用户的quota
        await conn.query('INSERT INTO support_quota(uid, signid, contract, symbol, quota, create_time) VALUES (?, ?, ?, ?, ?, ?)',
          [support.uid, support.signid, support.contract, support.symbol, quota, now]
        );

        // 记录当前赞赏用户资产变动log
        await conn.query('INSERT INTO assets_change_log(uid, signid, contract, symbol, amount, platform, type, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [support.uid, support.signid, support.contract, support.symbol, 0 - support.amount, support.platform, "support expenses", now]
        );

        // 处理推荐人，可能存在高并发问题，需要锁定推荐人的quota数据
        let referrer_support_quota = await this.app.mysql.get('support_quota', { uid: refuid, signid: support.signid });

        if (referrer_support_quota && referrer_support_quota.quota > 0) {

          // 本次推荐人可以获得奖励金额
          let delta = referrer_support_quota.quota < amount * fission_rate / 100 ? referrer_support_quota.quota : amount * fission_rate / 100;

          amount -= delta; // 剩余的金额

          // 更新推荐人资产余额
          await conn.query('INSERT INTO assets(uid, contract, symbol, amount, platform) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?',
            [refuid, support.contract, support.symbol, delta, support.platform, delta]
          );

          // 更新推荐人的quota
          let new_quota = referrer_support_quota.quota - delta;

          if (new_quota < 0) {
            new_quota = 0;
          }

          await conn.query('UPDATE support_quota SET quota = ? where id = ?',
            [new_quota, referrer_support_quota.id]
          );

          // 记录推荐人资产变动log
          await conn.query('INSERT INTO assets_change_log(uid, signid, contract, symbol, amount, platform, type, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [refuid, support.signid, support.contract, support.symbol, delta, support.platform, "share income", now]
          );
        }

        // get author uid
        let author = await this.app.mysql.get('users', { username: post.username });

        // 处理文章作者
        const result = await conn.query(
          'INSERT INTO assets(uid, contract, symbol, amount, platform) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?',
          [author.id, support.contract, support.symbol, amount, support.platform, amount]
        );

        // 记录作者者资产变动log
        await conn.query('INSERT INTO assets_change_log(uid, signid, contract, symbol, amount, platform, type, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [author.id, support.signid, support.contract, support.symbol, amount, support.platform, "sign income", now]
        );

        // 把当前support 改为已处理状态
        await conn.update("supports", { status: 1 }, { where: { id: support.id } });

        // 提交事务
        await conn.commit();

      } catch (err) {
        await conn.rollback();
        console.log(err);
      }

    } catch (err) {
      console.log("passVerify err", err);
    }
  }


  // 商品类型，处理发货，todo：适用数字copy类的商品，posts表还需要增加商品分类
  async shipped(post, support, conn) {
    // 判断文章所属频道，不是商品直接返回true
    if (post.channel_id !== consts.channels.product) { return true; }

    // 判断金额是否满足商品定价
    const product_price = await conn.query(
      'SELECT price, decimals FROM product_prices WHERE sign_id = ? AND platform = ? AND symbol = ? AND status=1;',
      [support.signid, support.platform, support.symbol]
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

    // 锁定商品库存
    const result = await conn.query(
      'UPDATE product_stock_keys SET status=1, support_id = ? '
      + 'WHERE id = (SELECT id FROM (SELECT id FROM product_stock_keys WHERE sign_id=? AND status=0 LIMIT 1) t);',
      [support.id, support.signid]
    );
    // 没有库存，失败
    if (result.affectedRows === 0) {
      console.log('商品库存不足，sign_id:' + support.signid);
      return false;
    }

    // todo: 处理发邮件 function(support.id)
    const mail = await this.service.mail.sendMail(support.id);
    if (mail) {
      console.log('邮件发送成功，sign_id:' + support.signid);
    } else {
      console.log('邮件发送失败，sign_id:' + support.signid);
    }

    return true;
  }


}

module.exports = SupportService;
