const Subscription = require('egg').Subscription;
const moment = require('moment');

// 热门文章数据计算
class PostScore extends Subscription {

  static get schedule() {
    return {
      interval: '10m',
      type: 'worker',
    };
  }

  async subscribe() {
    this.logger.info('Running:schedule calculate_hot_score');
    /*
    -- 计算热度积分
    UPDATE posts p INNER JOIN post_read_count c ON p.id = c.post_id
    SET p.hot_score = (c.real_read_count * 0.2 + c.likes * 0.4 - c.dislikes * 1 + c.support_count * 1 - c.down * 1);
    -- 3天内的提权
    UPDATE posts SET hot_score = hot_score * 1.5 WHERE create_time > DATE_SUB(NOW(), INTERVAL 3 DAY);
    -- 按天减少权重
    UPDATE posts SET hot_score = hot_score - datediff(now(), create_time) * 3;
    */
    const posts = await this.app.mysql.query(
      `SELECT p.id, p.create_time, p.channel_id, c.dislikes, c.likes, c.real_read_count, c.support_count, c.down 
      FROM posts p 
      INNER JOIN post_read_count c 
      ON p.id = c.post_id
      WHERE p.status=0;`
    );
    const postList = [];
    const shareList = [];
    for (const post of posts) {
      const { id, create_time, channel_id, dislikes, likes, real_read_count, support_count, down } = post;
      // 计算热度积分
      let hot_score = (real_read_count * 2 + likes * 4 - dislikes * 10 + support_count * 10 - down * 10) + 1000000;
      // 3天内的提权
      if (this.isAfter3Days(create_time)) hot_score += 1000;
      // 按小时减少权重
      hot_score -= this.dateDiff(create_time);
      hot_score /= 10;
      if (channel_id === 1) {
        postList.push(hot_score, id);
      }
      if (channel_id === 3) {
        shareList.push(hot_score, id);
      }
    }
    if (postList.length > 0) {
      this.app.redis.zadd('post:score:filter:1', postList);
    }
    if (shareList.length > 0) {
      this.app.redis.zadd('post:score:filter:3', shareList);
    }
  }
  isAfter3Days(time) {
    return moment(time).isAfter(moment().subtract(3, 'days'));
  }
  dateDiff(time) {
    return moment().diff(moment(time), 'minute');
  }
}


module.exports = PostScore;
