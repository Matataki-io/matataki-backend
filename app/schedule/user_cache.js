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

    const users = await mysql.query('SELECT id, username, nickname, avatar FROM users WHERE is_recommend = 1;');
    for (const { id, username, nickname, avatar } of users) {
      const key = `user:${id}:info`;

      await redis.sadd('user:recommend', id);
      await redis.hset(key, 'username', this.service.user.maskEmailAddress(username));
      await redis.hset(key, 'nickname', nickname);
      await redis.hset(key, 'avatar', avatar);
    }

    const relationships = await mysql.query('SELECT uid, fuid FROM follows WHERE status = 1;');
    for (const { uid, fuid } of relationships) {
      await redis.sadd(`user:${uid}:follow`, fuid);
      await redis.sadd(`user:${fuid}:follower`, uid);
    }
  }

}

module.exports = UserCache;
