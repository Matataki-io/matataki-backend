'use strict';
const moment = require('moment');
const consts = require('../consts');
const Service = require('egg').Service;
/*
  推荐机制适用范围：
  投资人裂变quota满足后，将获得推荐机制奖励
  购买人只能获得推荐机制奖励

  推荐机制公式：
  推荐人获得的奖励：referral_bonus = amount * referral_rate
  作者获得的奖励：amount - referral_bonus
*/
class ReferralService extends Service {
  async do_referral(payment) {
    try {
      const conn = await this.app.mysql.beginTransaction();

      try {
        // 行为相关者: 作者、付费人、推荐人

        let amount = payment.amount;
        const refuid = payment.referreruid; // 推荐人

        const now = moment().format('YYYY-MM-DD HH:mm:ss');

        // 查询文章/商品
        const post = await this.app.mysql.get('posts', { id: payment.signid });

        if (!post) {
          return;
        }

        // 处理发货
        const is_shipped = await this.service.shop.order.shipped(post, payment, conn); // todo：修改order.shipped，处理payment
        if (!is_shipped) {
          await conn.rollback();
          console.log(`发货失败，sign_id: ${post.id}, order_id: ${payment.id}`);
          return;
        }

        // 推荐返利比率
        const referral_rate = post.referral_rate;
        // 推荐返利额
        const referral_bonus = amount * referral_rate;

        // 记录当前用户资产变动log
        await conn.query('INSERT INTO assets_change_log(uid, signid, contract, symbol, amount, platform, type, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [ payment.uid, payment.signid, payment.contract, payment.symbol, 0 - payment.amount, payment.platform, 'support expenses', now ] // todo：type 重新定义
        );

        // 更新推荐人资产余额
        await conn.query('INSERT INTO assets(uid, contract, symbol, amount, platform) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?',
          [ refuid, payment.contract, payment.symbol, referral_bonus, payment.platform, referral_bonus ]
        );

        // 记录推荐人资产变动log
        await conn.query('INSERT INTO assets_change_log(uid, signid, contract, symbol, amount, platform, type, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [ refuid, payment.signid, payment.contract, payment.symbol, referral_bonus, payment.platform, 'share income', now ] // todo：type 重新定义
        );

        amount -= referral_bonus; // 剩余的金额

        // 更新作者资产余额
        await conn.query(
          'INSERT INTO assets(uid, contract, symbol, amount, platform) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?',
          [ post.uid, payment.contract, payment.symbol, amount, payment.platform, amount ]
        );

        // 记录作者资产变动log
        await conn.query('INSERT INTO assets_change_log(uid, signid, contract, symbol, amount, platform, type, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [ post.uid, payment.signid, payment.contract, payment.symbol, amount, payment.platform, 'sign income', now ]
        );

        // 把当前support 改为已处理状态
        // todo：orders表处理
        await conn.update('supports', { status: 1 }, { where: { id: payment.id } });

        // 提交事务
        await conn.commit();

        // 另行处理邮件发送..
        if (post.channel_id === consts.channels.product) {
          this.logger.info('MailService:: sendMail :是商品, 准备发送邮件' + payment.id);
          if (this.ctx.app.config.mailSetting) {
            const mail = await this.service.mail.sendMail(payment.id);
            if (mail) {
              this.logger.info('MailService:: sendMail success: supportid: ' + payment.id);
            } else {
              this.logger.error('MailService:: sendMail error: supportid: ' + payment.id);
            }
          }
        }

      } catch (err) {
        await conn.rollback();
        console.log(err);
      }

    } catch (err) {
      console.log('passVerify err', err);
    }

  }

}

module.exports = ReferralService;
