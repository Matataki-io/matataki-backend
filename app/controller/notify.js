'use strict';

const Controller = require('../core/base_controller');

class NotificationController extends Controller {
  /*!
  * 这两个请求的方法目前只是测试用的，并没有实际对接前端。
  * 有了具体需求之后再做正式的。
  */

  /** 
   * 获取汇总后的消息内容 
   * @startId 【可选】查询起点id （使用这个参数以避免新消息打乱分页，传入0不会生效）
   * @actions 【可选】筛选消息类型，传入一个string数组
   * @filterUnread 【可选】只看未读消息  0\1
   */
  async getEventGgroupsByUid() {
    const ctx = this.ctx;
    let {pagesize = 20, page = 1, startId = 0, actions, filterUnread} = ctx.query;

    actions = actions ? JSON.parse(actions) : undefined;
    // 获取汇总后的消息列表
    const eventList = await this.service.notify.event.getEventGgroupsByUid(parseInt(page), parseInt(pagesize), ctx.user.id, parseInt(startId), actions, parseInt(filterUnread));

    // 汇总消息中所需信息的数据库索引
    let userIdSet = new Set();
    let postIdSet = new Set();
    let commentIdSet = new Set();
    eventList.list.forEach(item => {
      userIdSet.add(item.user_id);
      userIdSet.add(item.min_user_id);
      userIdSet.add(item.max_user_id);
      switch(item.object_type) {
        case 'article':
          postIdSet.add(item.object_id);
        break
        case 'user':
          userIdSet.add(item.object_id);
        break
      }
      if(item.action === 'comment') commentIdSet.add(Number(item.remark));
    })

    ctx.body = ctx.msg.success;
    ctx.body.data = {
      ...eventList,
      // 获取消息中所需的信息
      users: userIdSet.size ? await this.service.user.getUserList([...userIdSet], ctx.user.id) : [],
      posts: postIdSet.size ? await this.service.post.getByIdArray([...postIdSet]) : [],
      comments: commentIdSet.size ? await this.service.comment.getByIdArray([...commentIdSet]) : [],
    };
  }

  /** 获取一个区间内满足特定条件的消息列表 */
  async getEventByRegion() {
    const ctx = this.ctx;
    const {pagesize = 20, page = 1, startId, endId, action, objectId, objectType} = ctx.query;

    // 获取事件通知列表
    const eventList = await this.service.notify.event.getEventByRegion(
      parseInt(page),
      parseInt(pagesize),
      ctx.user.id,
      parseInt(startId),
      parseInt(endId),
      action,
      parseInt(objectId),
      objectType
    );

    // 如果是文章类，则获取文章的简要信息
    if(objectType === 'article') {
      const posts = await this.service.post.getByIdArray([parseInt(objectId)]);
      if(posts !== null && posts.length > 0) eventList.post = posts[0];
    }

    // 汇总消息中所需信息的数据库索引
    let userIdSet = new Set();
    let commentIdSet = new Set();
    eventList.list.forEach(item => {
      userIdSet.add(item.user_id);
      if(item.action === 'comment') commentIdSet.add(Number(item.remark));
    })
    // 获取消息中所需的信息
    const users = userIdSet.size ? await this.service.user.getUserList([...userIdSet], ctx.user.id) : [];
    const comments = commentIdSet.size ? await this.service.comment.getByIdArray([...commentIdSet]) : [];
    // 拼接数据
    eventList.list.forEach(item => {
      item.user = users.find(user => user.id === item.user_id)
      item.comment = comments.find(comment => comment.id === item.remark)
    })

    ctx.body = ctx.msg.success;
    ctx.body.data = eventList;
  }

  /** 获取未读消息数量 */
  async getUnreadQuantity() {
    const ctx = this.ctx;
    const result = await this.service.notify.event.getUnreadQuantity(ctx.user.id);
    ctx.body = ctx.msg.success;
    ctx.body.data = result;
  }

  /** 将数组中的事件设定为已读 */
  async haveRead() {
    const ctx = this.ctx;
    const { ids } = ctx.request.body;
    const result = await this.service.notify.event.haveReadByIdArray(ctx.user.id, ids);
    if(result) {
      ctx.body = ctx.msg.success;
      ctx.body.data = result;
    }
    else ctx.body = ctx.msg.failure;
  }

  /** 全部标记为已读 */
  async haveReadAll() {
    const ctx = this.ctx;
    const result = await this.service.notify.event.haveReadAll(ctx.user.id);
    if(result !== false) {
      ctx.body = ctx.msg.success;
      ctx.body.data = result;
    }
    else ctx.body = ctx.msg.failure;
  }
}

module.exports = NotificationController;
