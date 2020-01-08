const Subscription = require('egg').Subscription;
const moment = require('moment');

// 热门文章数据计算
class PostScore extends Subscription {

  static get schedule() {
    return {
      interval: '30m',
      type: 'worker',
    };
  }

  async subscribe() {
    this.logger.info('score cal');
    const posts = await this.app.mysql.query(
      `SELECT p.id, p.create_time, p.channel_id, c.dislikes, c.likes, c.real_read_count, c.support_count, c.down 
      FROM posts p 
      INNER JOIN post_read_count c 
      ON p.id = c.post_id;`
    );
    const postList = [];
    const shareList = [];
    for (const post of posts) {
      const { id, create_time, channel_id, dislikes, likes, real_read_count, support_count, down } = post;
      let hot_score = (real_read_count * 0.2 + likes * 0.4 - dislikes * 1 + support_count * 1 - down * 1);
      if (this.isAfter3Days(create_time)) {
        hot_score *= 1.5;
      }
      hot_score -= this.dateDiff(create_time) * 3;
      if (channel_id === 1) {
        postList.push(hot_score, id);
      }
      if (channel_id === 3) {
        shareList.push(hot_score, id);
      }
    }
    this.app.redis.zadd('post:score:filter:1', postList);
    this.app.redis.zadd('post:score:filter:3', shareList);
  }
  isAfter3Days(time) {
    return moment(time).isAfter(moment().subtract(3, 'days'));
  }
  dateDiff(time) {
    return moment().diff(moment(time), 'days');
  }
}


module.exports = PostScore;
