const Subscription = require('egg').Subscription;
const message = require('../../config/message');

const RedisKey = 'timedPosts';
let Initialized = false;

class TimedPost extends Subscription {
  static get schedule() {
    return {
      // 在每一分钟开始时执行一次
      cron: '*/10 * * * * *',
      type: 'worker',
      immediate: true
    };
  }

  /** 定时任务 */
  async subscribe() {
    if (!Initialized) await this.initTaskList();
    this.traverseTaskList();
  }

  /** 初始化定时任务列表 */
  async initTaskList() {
    this.ctx.msg = message.returnObj('zh');
    const result = await this.service.timedPost.getList();
    result.forEach(async task => {
      await this.app.redis.hset(RedisKey, task.draft_id, task.trigger_time && task.trigger_time.getTime());
    });
    Initialized = true;
  }

  /** 检查有没有需要发布的文章 */
  async traverseTaskList() {
    const now = new Date();
    console.log(`现在的时间：${now.getMinutes()}:${now.getSeconds()}:${now.getMilliseconds()}`);
    now.setSeconds(0);
    now.setMilliseconds(0);
    const taskList = await this.app.redis.hkeys(RedisKey);
    console.log(taskList);
    taskList.forEach(async key => {
      const value = await this.app.redis.hget(RedisKey, key);
      if(value <= now.getTime()) {
        console.log(`发布了：${key}`);
        try {
          this.service.timedPost.post(key);
        }
        catch (e) {
          this.logger.error(e);
        }
      }
    });
  }
}

module.exports = TimedPost;