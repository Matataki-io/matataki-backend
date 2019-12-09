const { Subscription } = require('egg');

class UserCache extends Subscription {

  static get schedule() {
      return {
          interval: '1h',
          type: 'all',
          immediate: true
      };
  }

  async subscribe() {
    const { mysql, redis } = this.app;

    const pipeline = redis.multi();

    const users = await mysql.query('SELECT id, username, nickname, avatar FROM users WHERE is_recommend = 1;');
    for (const { id, username, nickname, avatar } of users) {
      const key = `user:${id}:info`;

      pipeline.sadd('user:recommend', id);
      pipeline.hset(key, 'username', this.service.user.maskEmailAddress(username));
      pipeline.hset(key, 'nickname', nickname);
      pipeline.hset(key, 'avatar', avatar);
    }

    const relationships = await mysql.query('SELECT uid, fuid FROM follows WHERE status = 1;');
    for (const { uid, fuid } of relationships) {
      pipeline.rpush(`user:${uid}:follow`, fuid);
      pipeline.rpush(`user:${fuid}:follower`, uid);
    }

    await pipeline.exec();
  }

}

module.exports = UserCache;
