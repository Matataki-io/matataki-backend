const Subscription = require('egg').Subscription;

const RedisKey = 'timedPosts';
let Initialized = false;

class TimedPost extends Subscription {
  static get schedule() {
    return {
      interval: '50s',
      type: 'worker',
      immediate: true
    };
  }

  /** 定时任务，每隔50秒执行一次 */
  async subscribe() {
    if (!Initialized) await this.initTaskList();
    this.traverseTaskList();
  }

  /** 初始化定时任务列表 */
  async initTaskList() {
    const result = await this.app.mysql.select('timed_post', {
      where: { triggered: 0 }
    });
    result.forEach(async task => {
      await this.app.redis.hset(RedisKey, task.draft_id, task.trigger_time && task.trigger_time.getTime());
    });
    Initialized = true;
  }

  /** 检查有没有需要发布的文章 */
  async traverseTaskList() {
    const now = new Date();
    now.setSeconds(0);
    now.setMilliseconds(0);
    const taskList = await this.app.redis.hkeys(RedisKey);
    taskList.forEach(async key => {
      const value = await this.app.redis.hget(RedisKey, key);
      if(value <= now.getTime()) {
        this.triggered(key);
      }
    });
  }

  /** 标记为执行完成 */
  async triggered(draftId) {
    // redis
    this.app.redis.hdel(RedisKey, draftId);
    // mysql
    const row = {
      triggered: 1
    };
    const options = {
      where: {
        draft_id: draftId
      }
    };
    const result = await this.app.mysql.update('timed_post', row, options);
    return result.affectedRows === 1;
  }
}

module.exports = TimedPost;