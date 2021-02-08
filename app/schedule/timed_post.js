const Subscription = require('egg').Subscription;
const message = require('../../config/message');

const RedisKey = 'timedPosts';
let Initialized = false;

class TimedPost extends Subscription {
  static get schedule() {
    return {
      // 在每一分钟开始时执行一次
      cron: '00 * * * * *',
      type: 'worker',
      // immediate: true
    };
  }

  /** 定时任务 */
  async subscribe() {
    if (!Initialized) await this.initTaskList();
    this.traverseTaskList();
  }

  /** 初始化定时任务列表 */
  async initTaskList() {
    const result = await this.service.timedPost.getList();
    result.forEach(async task => {
      await this.app.redis.hset(RedisKey, task.draft_id, task.trigger_time && task.trigger_time.getTime());
    });
    Initialized = true;
  }

  /** 检查有没有需要发布的文章 */
  async traverseTaskList() {
    const now = new Date();
    // console.log(`现在的时间：${now.getMinutes()}:${now.getSeconds()}:${now.getMilliseconds()}`);
    now.setSeconds(0);
    now.setMilliseconds(0);
    const taskList = await this.app.redis.hkeys(RedisKey);
    // console.log(taskList);
    taskList.forEach(async key => {
      const value = await this.app.redis.hget(RedisKey, key);
      if (value <= now.getTime()) {
        try {
          this.initMsg();
          this.ctx.service.timedPost.post(key);
        } catch (e) {
          this.logger.error(e);
        }
      }
    });
  }

  /**
   * 如果msg为空，则给msg赋值。
   * 因为出现过msg中途丢失的灵异情况，所以每次执行 timedPost() 之前都执行一次本方法。
   */
  initMsg() {
    if (!this.ctx.msg) this.ctx.msg = message.returnObj('zh');
  }
}

module.exports = TimedPost;