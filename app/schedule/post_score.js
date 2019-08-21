const Subscription = require('egg').Subscription;

/**
 *  read actions from eos blockchain
 */
class PostScore extends Subscription {

  //   constructor(ctx) {
  //     super(ctx);
  //   }

  static get schedule() {
    return {
      interval: '300s',
      type: 'all',
    };
  }

  // todo：如果文章很多的情况下，此处运行会很慢，长时间锁表，需要用另外的机制逐条刷新数据，一条文章被阅读、点赞等行为发一个消息，然后积累【5】分钟后更新数据
  async subscribe() {
    if (this.ctx.app.config.isDebug) return;

    this.logger.info('PostScoreSchedule:: Start to update Score...');
    try {
      await this.app.mysql.query(`
          -- 计算热度积分
          UPDATE posts p INNER JOIN post_read_count c ON p.id = c.post_id
          SET p.hot_score = (c.real_read_count * 0.2 + c.likes * 0.4 - c.dislikes * 1 + c.support_count * 1);
          -- 3天内的提权
          UPDATE posts SET hot_score = hot_score * 1.5 WHERE create_time > DATE_SUB(NOW(), INTERVAL 3 DAY);
          -- 按天减少权重
          UPDATE posts SET hot_score = hot_score - datediff(now(), create_time) * 3;`
      );
      // 'UPDATE posts p INNER JOIN post_read_count c ON p.id = c.post_id '
      // + 'SET p.hot_score = (c.real_read_count * 0.2 + c.likes*0.4 - c.dislikes*0.2 + c.support_count * 0.8); '
      // + 'UPDATE posts SET hot_score = hot_score * 1.5 WHERE create_time > DATE_SUB(NOW(), INTERVAL 3 DAY);'
    } catch (err) {
      this.logger.error('PostScoreSchedule:: subscribe error: ', err);
    }
  }
}


module.exports = PostScore;
