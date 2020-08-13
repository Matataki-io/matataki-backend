const Service = require('egg').Service;
const moment = require('moment');

const RedisKey = 'timedPosts';
const SqlTable = 'timed_post'

class TimedPostService extends Service {
  /** 新建定时发文任务 */
  async add(draftId, postTime) {
    // 最小跨度为分钟，丢弃秒和毫秒的信息
    postTime.setSeconds(0);
    postTime.setMilliseconds(0);
    this.app.redis.hset(RedisKey, draftId, postTime.getTime());
    this.app.mysql.insert(SqlTable, {
      draft_id: draftId,
      trigger_time: moment(postTime).format('YYYY-MM-DD HH:mm')
    })
  }

  /** 删除定时发文任务 */
  async delete(draftId) {
    this.app.redis.hdel(RedisKey, draftId);
    this.app.mysql.delete(SqlTable, {
      draft_id: draftId
    });
  }

  /** 获取未执行的定时发文任务列表 */
  async getList() {
    return await this.app.mysql.select('timed_post', {
      where: { triggered: 0 }
    });
  }

  /** 
   * 执行完成
   * @draftId 草稿ID
   * @failed 【可选】标记为失败任务
   */
  async endTask(draftId, failed) {
    // redis
    await this.app.redis.hdel(RedisKey, draftId);
    // mysql
    const row = {
      triggered: failed ? 2 : 1
    };
    const options = {
      where: {
        draft_id: draftId
      }
    };
    const result = await this.app.mysql.update('timed_post', row, options);
    return result.affectedRows === 1;
  }

  /** 发布文章 */
  async post(draftId) {
    const result = await this.service.draft.postDraft(draftId);
    if (result && result.code === 0) this.postSuccess(result);
    else this.postFailure(result);
    await this.endTask(draftId, !!result.code);
    return result;
  }

  async postSuccess(result) {
    const { user, data } = result;
    return await this.service.notify.announcement.targetedPost(
      'auto_post_success',
      [user.id],
      '文章定时发布成功',
      '',
      data,
      'post'
    );
  }

  async postFailure(result) {
    const { code, user, draft, message } = result;
    if (!user || !draft) return;
    return await this.service.notify.announcement.targetedPost(
      'auto_post_failure',
      [user.id],
      '文章定时发布失败',
      `您的文章《${draft.title || '无标题'}》（Draft ID:${draft.id}）发表失败。<br>错误：(${code}) ${message}`
    );
  }
}

module.exports = TimedPostService;