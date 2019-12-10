class Bootstrapper {

  constructor(app) {
    this.app = app;
  }

  async didReady() {
    await this.loadUserCache();
  }

  async loadUserCache() {
    const { mysql, redis } = this.app;
    const ctx = await this.app.createAnonymousContext();

    const keys = await redis.keys('user:*');
    const pipeline = redis.multi();

    if (keys.length > 0) pipeline.del(keys);

    const users = await mysql.query('SELECT id, username, nickname, avatar, is_recommend FROM users;');
    for (const { id, username, nickname, avatar, is_recommend } of users) {
      const key = `user:${id}:info`;

      pipeline.hset(key, 'username', ctx.service.user.maskEmailAddress(username));
      pipeline.hset(key, 'nickname', nickname);
      pipeline.hset(key, 'avatar', avatar);

      if (is_recommend) pipeline.sadd('user:recommend', id);
    }

    const relationships = await mysql.query('SELECT uid, fuid FROM follows WHERE status = 1;');
    for (const { uid, fuid } of relationships) {
      pipeline.rpush(`user:${uid}:follow_list`, fuid);
      pipeline.rpush(`user:${fuid}:follower_list`, uid);
      pipeline.sadd(`user:${uid}:follow_set`, fuid);
      pipeline.sadd(`user:${fuid}:follower_set`, uid);
    }

    await pipeline.exec();
  }

}

module.exports = Bootstrapper;
