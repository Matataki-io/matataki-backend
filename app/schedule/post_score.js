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
      interval: '30s',
      type: 'all',
    };
  }

  async subscribe() {
    // if (this.ctx.app.config.isDebug) return;

    this.logger.info('PostScoreSchedule:: Start to update Score...');
    try {
      await this.app.mysql.query(
        'UPDATE posts p INNER JOIN post_read_count c ON p.id = c.post_id '
        + 'SET p.hot_score = (c.real_read_count * 0.2 + c.likes*0.4 - c.dislikes*0.2 + c.support_count * 0.8); '
        + 'UPDATE posts SET hot_score = hot_score * 1.5 WHERE create_time > DATE_SUB(NOW(), INTERVAL 3 DAY);'
      );
    } catch (err) {
      this.logger.error('PostScoreSchedule:: subscribe error: ', err);
    }
  }
}


module.exports = PostScore;
