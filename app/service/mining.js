'use strict';
const consts = require('./consts');
const moment = require('moment');

const Service = require('egg').Service;

class LikeService extends Service {

  /*
  1. 首次打开3天内的文章，额外获得积分，用户立即+5个积分（claim的时候领取，如果不claim就没有了），作者立即+1积分（不需要claim）
  2. 每篇文章最多对应10积分，连续阅读5分钟即可得到全部，阅读完成后，需要告知我们是否推荐当前内容，当用户推荐的时候，则作者可额外得用户所得的积分一半；当用户不推荐的时候，则作者不得积分
  3. 阅读超过2分钟，但没有点击推荐/不推荐，作者+1积分

  1. 防作弊的手段：用户每日有上限，作者每天不应该有上限
  2. 同时打开多篇文章，怎么计算阅读时间，判断两次claim的时间间隔
  3. csrf

  防御CSRF攻击，cross site request forgery，跨站请求伪造
  伪装来自受信任用户的请求，攻击者盗用你的身份，以你的名义向网站发送恶意请求

  1. 验证http referer信息，在passport中判断，http referer图片防盗的效果很好
  2. x_csrf_token 每次打开文章新生成一个x_csrf_token (文章Id,salt,timestamp) 加密

  外汇管制
  账号体系

  安全|常见的Web攻击手段之CSRF攻击
  https://www.jianshu.com/p/67408d73c66d


  redis缓存，定时任务处理
  redis记录用户阅读日志，判断是否首次打开3天内的文章，只需保留3天即可，因为超过3天就没有额外奖励了
  数据库记录用户积分日志，每个用户每篇文章只能获得一次积分
  redis记录用户阅读开始时间，claim的时候判断时长，计算积分

  https://www.geetest.com/Deepknow
  深知：通过用户手机号码、ip、设备、登录到点赞的流程等等判断，给用户打风险分（可以看成是一个风控系统），防止黑产注册成千上万的账号薅羊毛，每日生成报告

  todo：
  1. 读者每日上限？？？
  2. 如何防止用户发文刷积分
  3. csrf
  4. 人机验证，防刷
  */

  // csrf验证要开启
  // 每个用户每篇文章只能赞或踩一次，如果已经点赞或踩则不用调用
  async reading(userId, signId) {
    // 更新redis
    // redis_key：'read:userId:signId', 记录阅读的开始时间;
    const timestamp = Date.now() / 1000;
    const TTL = 3 * 24 * 3600; // 保留3天

    const rediskey_read = `read:${userId}:${signId}`;

    // const nonce = 11212212;
    const value = { timestamp };
    await this.app.redis.set(rediskey_read, JSON.stringify(value), 'EX', TTL);

    // const key_read_log = `read:${userId}:${signId}`;
  }

  // 获取是否点赞过
  async liked(userId, signId) {
    const rediskey_readHistory = `readhistory:${userId}:${signId}`;
    const readhistory = await this.app.redis.get(rediskey_readHistory);
    if (readhistory) {
      return 1;
    }
    return 0;
  }

  // 赞
  async like(userId, signId, time, ip) {
    return await this.do_like(userId, signId, time, ip, 1);
  }

  // 踩
  async dislike(userId, signId, time, ip) {
    return await this.do_like(userId, signId, time, ip, 0);
  }

  async do_like(userId, signId, time, ip, likeStatus) {
    // 1. 文章是否存在
    const post = await this.service.post.get(signId);
    if (!post) {
      return -9;
    }

    // 2. 判断是否已经claim过阅读积分
    const rediskey_readHistory = `readhistory:${userId}:${signId}`; // todo key写到统一的一个地方
    const readhistory = await this.app.redis.get(rediskey_readHistory);
    if (readhistory) {
      return -1;
    }

    // 3. 读取redis获取阅读开始时间
    const rediskey_read = `read:${userId}:${signId}`;
    const read = await this.app.redis.get(rediskey_read);
    // 没有开始阅读记录
    if (!read) {
      return -1;
    }
    const readInfo = JSON.parse(read);
    // server_time 服务端时间差
    const server_time = Date.now() / 1000 - readInfo.timestamp;
    // time 客户端时间差
    // 客户端时间小于服务端时间有效，否则认为是异常提交，不做处理， //误差小于10秒有效 Math.abs(time - server_time) < 10
    if (time > server_time) {
      return -8;
    }

    // redis里判断是否已经获取过阅读积分，仅仅缓存使用，最终以mysql为准
    // todo 性能优化：1. 先写入redis，然后异步处理，2. 数据库分库/分表，3. 日志直接记录到redis


    // 还需要判断两次提交时间，时间过短则有问题

    // 小值有效 const interval = time > server_time ? server_time : time;
    const max_point = 10;
    const max_mins = 5;
    let point = Math.floor(time * 1.0 / 60 * max_point / max_mins); // 10积分/5分钟
    if (point > max_point) point = max_point;

    // 4. 处理积分
    const conn = await this.app.mysql.beginTransaction();
    try {
      // 4.1 更新用户积分
      await conn.query('INSERT INTO assets_points(uid, amount) VALUES (?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?;',
        [ userId, point, point ]);

      // 4.2 插入log日志，并判断是否已经插入过
      const logResult = await conn.query('INSERT INTO assets_points_log(uid, sign_id, amount, create_time, type, ip) '
        + 'SELECT ?, ?, ?, ?, ?, ? FROM DUAL WHERE NOT EXISTS(SELECT 1 FROM assets_points_log WHERE uid=? AND sign_id=? AND type=? );',
      [ userId, signId, point, moment().format('YYYY-MM-DD HH:mm:ss'), consts.pointTypes.reading, ip, userId, signId, consts.pointTypes.reading ]);

      if (logResult.affectedRows !== 1) {
        conn.rollback();
        return -1;
      }

      // 4.3 更新点赞次数
      await conn.query('UPDATE post_read_count SET likes=likes+1 WHERE post_id=?;', [ signId ]);

      // 4.4 更新作者积分和日志
      if (likeStatus === 1) {
        const author_point = Math.floor(point / 2);
        if (author_point > 0) {
          await conn.query('INSERT INTO assets_points(uid, amount) VALUES (?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?;', [ post.uid, author_point, author_point ]);
          await conn.query('INSERT INTO assets_points_log(uid, sign_id, amount, create_time, type, ip) VALUES(?,?,?,?,?,?);',
            [ post.uid, signId, author_point, moment().format('YYYY-MM-DD HH:mm:ss'), consts.pointTypes.beread, ip ]);
        }
      }

      // 4.5 阅读3天内的新文章
      if (Date.now() - post.create_time) {
        const readingnew_point = 5;
        const bereadnew_point = 1;

        // 用户额外+5
        const readnewlogResult = await conn.query('INSERT INTO assets_points_log(uid, sign_id, amount, create_time, type, ip) '
          + 'SELECT ?, ?, ?, ?, ?, ? FROM DUAL WHERE NOT EXISTS(SELECT 1 FROM assets_points_log WHERE uid=? AND sign_id=? AND type=? );',
        [ userId, signId, readingnew_point, moment().format('YYYY-MM-DD HH:mm:ss'), consts.pointTypes.readingNew, ip, userId, signId, consts.pointTypes.reading ]);
        if (readnewlogResult.affectedRows === 1) {
          await conn.query('UPDATE assets_points SET amount = amount + ? WHERE uid = ?;', [ readingnew_point, userId ]);

          // 作者额外+1
          await conn.query('INSERT INTO assets_points(uid, amount) VALUES (?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?;', [ post.uid, bereadnew_point, bereadnew_point ]);
          await conn.query('INSERT INTO assets_points_log(uid, sign_id, amount, create_time, type, ip) VALUES(?,?,?,?,?,?);',
            [ post.uid, signId, bereadnew_point, moment().format('YYYY-MM-DD HH:mm:ss'), consts.pointTypes.bereadNew, ip ]);
        }
      }

      // 提交事务
      await conn.commit();

      // 删除redis，是必须的吗？
      await this.app.redis.del(rediskey_read);

      // 4.6 插入redis read:history，表示已经获取积分
      await this.app.redis.set(rediskey_readHistory, 1);

      return 0;
    } catch (e) {
      await conn.rollback();
      this.logger.error('Mining.like exception. j%', e);
      return -1;
    }
  }

  async points(userId, page, pagesize) {
    const points = await this.app.mysql.select('assets_points', {
      columns: [ 'uid', 'amount' ],
      where: { uid: userId },
    });

    if (points || points.length > 0) {
      const countsql = 'SELECT COUNT(1) AS count FROM assets_points_log l ';
      const listsql = 'SELECT l.sign_id, p.title, l.amount, l.create_time, l.type FROM assets_points_log l LEFT JOIN posts p ON l.sign_id=p.id ';
      const wheresql = 'WHERE l.uid = ? ';
      const ordersql = 'ORDER BY l.id DESC LIMIT ? ,? ';

      const sql = countsql + wheresql + ';' + listsql + wheresql + ordersql + ';';

      const queryResult = await this.app.mysql.query(sql,
        [ userId, userId, (page - 1) * pagesize, 1 * pagesize ]
      );

      const result = {
        amount: points[0].amount,
        count: queryResult[0].count,
        logs: queryResult[1],
      };
      return result;
    }

    return { amount: 0, count: 0 };
  }

  // 获取用户从单篇文章阅读获取的积分
  async getPointslogBySignId(userId, signId) {
    const pointslog = await this.app.mysql.select('assets_points_log', {
      columns: [ 'amount', 'type', 'create_time' ],
      where: { uid: userId, sign_id: signId },
    });

    return pointslog;
  }

  async publish(userId, signId, ip) {
    const point = 20;
    const conn = await this.app.mysql.beginTransaction();
    try {
      // 4.1 更新用户积分
      await conn.query('INSERT INTO assets_points(uid, amount) VALUES (?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?;',
        [ userId, point, point ]);

      // 4.2 插入log日志，并判断是否已经插入过, todo：加唯一索引，uid,sign_id, type，上下的语句都改下
      const logResult = await conn.query('INSERT INTO assets_points_log(uid, sign_id, amount, create_time, type, ip) '
        + 'SELECT ?, ?, ?, ?, ?, ? FROM DUAL WHERE NOT EXISTS(SELECT 1 FROM assets_points_log WHERE uid=? AND sign_id=? AND type=? );',
      [ userId, signId, point, moment().format('YYYY-MM-DD HH:mm:ss'), consts.pointTypes.publish, ip, userId, signId, consts.pointTypes.publish ]);

      if (logResult.affectedRows !== 1) {
        conn.rollback();
        return -1;
      }

      // 提交事务
      await conn.commit();
      return 0;

    } catch (e) {
      await conn.rollback();
      this.logger.error('Mining.like exception. j%', e);
      return -1;
    }
  }

}

module.exports = LikeService;
