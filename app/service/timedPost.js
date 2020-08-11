const Service = require('egg').Service;

const RedisKey = 'timedPosts';
const SqlTable = 'timed_post'

class TimedPostService extends Service {
  async add(draftId, postTime) {
    this.app.redis.hset(RedisKey, draftId, postTime.getTime());
    this.app.mysql.insert(SqlTable, {
      draft_id: draftId,
      trigger_time: postTime
    })
  }

  async delete(draftId) {
    this.app.redis.hdel(RedisKey, draftId);
    this.app.mysql.delete(SqlTable, {
      draft_id: draftId
    });
  }
}

module.exports = TimedPostService;