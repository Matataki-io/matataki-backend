'use strict';
const moment = require('moment');
const consts = require('../consts');
const Service = require('egg').Service;
/*
  裂变机制，公式：
  赞赏者奖励quota：quota = amount * fission_factor
  上家获得的奖励：fission_bonus = amount * fission_rate
  作者获得的奖励：amount - fission_bonus
*/
class FissionService extends Service {

  async do_support(support) {
    try {
      const conn = await this.app.mysql.beginTransaction();

      try {
        // 行为相关者: 作者，打赏人、推荐人

        let amount = support.amount;
        const refuid = support.referreruid;
        const now = moment().format('YYYY-MM-DD HH:mm:ss');

        const post = await this.app.mysql.get('posts', { id: support.signid });

        if (!post) {
          return;
        }

        // 处理发货
        const is_shipped = await this.service.shop.order.shipped(post, support, conn);
        if (!is_shipped) {
          await conn.rollback();
          console.log(`发货失败，sign_id: ${post.id}, support_id: ${support.id}`);
          return;
        }

        // 裂变系数
        const fission_factor = post.fission_factor;
        const quota = amount * fission_factor / 1000;
        // 裂变返利比率
        const fission_rate = post.fission_rate;
        // 推荐返利比率
        // const referral_rate = post.referral_rate;

        // 记录当前赞赏用户的quota
        await conn.query('INSERT INTO support_quota(uid, signid, contract, symbol, quota, create_time) VALUES (?, ?, ?, ?, ?, ?)',
          [ support.uid, support.signid, support.contract, support.symbol, quota, now ]
        );

        // 记录当前赞赏用户资产变动log
        await conn.query('INSERT INTO assets_change_log(uid, signid, contract, symbol, amount, platform, type, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [ support.uid, support.signid, support.contract, support.symbol, 0 - support.amount, support.platform, 'support expenses', now ]
        );

        // 处理裂变推荐人，可能存在高并发问题，需要 FOR UPDATE 锁定推荐人的quota数据
        const referrer_result = await conn.query('SELECT id, quota FROM support_quota WHERE uid=? AND signid=? FOR UPDATE;', [ refuid, support.signid ]);
        // const referrer_support_quota = await this.app.mysql.get('support_quota', { uid: refuid, signid: support.signid });

        if (referrer_result && referrer_result.length > 0 && referrer_result[0].quota > 0) {
          const referrer_support_quota = referrer_result[0];
          // 本次推荐人可以获得奖励金额
          // 公式：fission_bonus = amount * fission_rate
          const delta = referrer_support_quota.quota < amount * fission_rate / 100 ? referrer_support_quota.quota : amount * fission_rate / 100;

          amount -= delta; // 剩余的金额

          // 更新推荐人资产余额
          await conn.query('INSERT INTO assets(uid, contract, symbol, amount, platform) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?',
            [ refuid, support.contract, support.symbol, delta, support.platform, delta ]
          );

          // 更新推荐人的quota
          let new_quota = referrer_support_quota.quota - delta;

          if (new_quota < 0) {
            new_quota = 0;
          }

          await conn.query('UPDATE support_quota SET quota = ? where id = ?',
            [ new_quota, referrer_support_quota.id ]
          );

          // 记录推荐人资产变动log
          await conn.query('INSERT INTO assets_change_log(uid, signid, contract, symbol, amount, platform, type, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [ refuid, support.signid, support.contract, support.symbol, delta, support.platform, 'share income', now ]
          );
        }

        // get author uid
        // const author = await this.app.mysql.get('users', { username: post.username });

        // 处理文章作者
        await conn.query(
          'INSERT INTO assets(uid, contract, symbol, amount, platform) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?',
          [ post.uid, support.contract, support.symbol, amount, support.platform, amount ]
        );

        // 记录作者者资产变动log
        await conn.query('INSERT INTO assets_change_log(uid, signid, contract, symbol, amount, platform, type, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [ post.uid, support.signid, support.contract, support.symbol, amount, support.platform, 'sign income', now ]
        );

        // 把当前support 改为已处理状态
        await conn.update('supports', { status: 1 }, { where: { id: support.id } });

        // 提交事务
        await conn.commit();

        // 另行处理邮件发送..
        if (post.channel_id === consts.channels.product) {
          this.logger.info('MailService:: sendMail :是商品, 准备发送邮件' + support.id);
          if (this.ctx.app.config.mailSetting) {
            const mail = await this.service.mail.sendMail(support.id);
            if (mail) {
              this.logger.info('MailService:: sendMail success: supportid: ' + support.id);
            } else {
              this.logger.error('MailService:: sendMail error: supportid: ' + support.id);
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

module.exports = FissionService;
