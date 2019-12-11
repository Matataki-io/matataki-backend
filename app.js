class Bootstrapper {

  constructor(app) {
    this.app = app;
  }

  didReady() {
    this.loadCache();
  }

  async loadCache() {
    const { mysql, redis } = this.app;
    const ctx = await this.app.createAnonymousContext();

    const pipeline = redis.multi();

    let keys = await redis.keys('user:*');
    if (keys.length > 0) pipeline.del(keys);

    keys = await redis.keys('post:*');
    if (keys.length > 0) pipeline.del(keys);

    const users = await mysql.query('SELECT id, username, nickname, avatar, is_recommend FROM users;');

    pipeline.hset('user:stat', 'count', users.length);

    for (const { id, username, nickname, avatar, is_recommend } of users) {
      pipeline.hmset(`user:${id}:info`, 'username', ctx.service.user.maskEmailAddress(username), 'nickname', nickname, 'avatar', avatar);

      if (is_recommend) pipeline.sadd('user:recommend', id);
    }

    const relationships = await mysql.query('SELECT uid, fuid FROM follows WHERE status = 1;');
    for (const { uid, fuid } of relationships) {
      pipeline.rpush(`user:${uid}:follow_list`, fuid);
      pipeline.rpush(`user:${fuid}:follower_list`, uid);
      pipeline.sadd(`user:${uid}:follow_set`, fuid);
      pipeline.sadd(`user:${fuid}:follower_set`, uid);
    }

    pipeline.hset('user:stat', 'point', (await mysql.query('SELECT SUM(amount) as amount FROM assets_points;'))[0].amount);
    pipeline.hset('post:stat', 'count', (await mysql.query('SELECT COUNT(1) as count FROM posts;'))[0].count);

    const tags = await this.app.mysql.query(`SELECT id, name FROM tags WHERE type = 'post';`);
    for (const { id, name } of tags) {
      pipeline.hset('post:tag', id, name);
    }

    const posts = await mysql.query('SELECT id, status, hot_score, time_down, require_holdtokens, require_buy FROM posts;')
    for (const { id, require_holdtokens, time_down, hot_score, require_buy, status } of posts) {
      pipeline.sadd('post', id);

      if (status !== 0) {
        continue;
      }

      if (require_holdtokens === 0 && require_buy === 0) {
        pipeline.zadd('post:time:filter1', time_down, id);
        pipeline.zadd('post:hot:filter1', hot_score, id);
      } else {
        if (require_holdtokens) {
          pipeline.zadd('post:time:filter2', time_down, id);
          pipeline.zadd('post:hot:filter2', hot_score, id);
        }
        if (require_buy) {
          pipeline.zadd('post:time:filter4', time_down, id);
          pipeline.zadd('post:hot:filter4', hot_score, id);
        }
      }
    }

    await pipeline.exec();
  }

}

module.exports = Bootstrapper;
