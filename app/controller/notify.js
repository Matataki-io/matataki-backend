'use strict';

const Controller = require('../core/base_controller');

class NotificationController extends Controller {

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
    let announcementIdSet = new Set();
    let assetsLogIdSet = new Set();
    let minetokensLogIdSet = new Set();
    let tokenIdSet = new Set();
    // 遍历
    eventList.list.forEach(item => {
      userIdSet.add(item.user_id);
      userIdSet.add(item.min_user_id);
      userIdSet.add(item.max_user_id);
      switch(item.object_type) {
        case 'article': // 文章
          postIdSet.add(item.object_id);
          // comment:评论文章, transfer:打赏文章
          if(item.action === 'comment') commentIdSet.add(Number(item.remark));
          else if(item.action === 'transfer') minetokensLogIdSet.add(Number(item.remark));
          break;
        case 'user': // 用户
          userIdSet.add(item.object_id);
          break;
        case 'comment': // 评论
          commentIdSet.add(item.object_id);
          // 回复评论
          if (item.action === 'reply') commentIdSet.add(item.remark);
          break;
        case 'announcement': // 公告
          announcementIdSet.add(item.object_id);
          // 引用文章
          if(item.remark) postIdSet.add(item.remark);
          break;
        case 'announcementToken': // 公告 引用内容为Token
          announcementIdSet.add(item.object_id);
          // 引用Fan票
          if(item.remark) tokenIdSet.add(item.remark);
          break;
        case 'cnyWallet': // CNY转账
          assetsLogIdSet.add(item.object_id);
          break;
        case 'tokenWallet': //Token转账
          minetokensLogIdSet.add(item.object_id);
          break;
        case 'featuredArticles': // 推荐文章
          postIdSet.add(item.object_id);
          break;
        case 'collaborator': // 协作者
          tokenIdSet.add(item.remark);
          break;
      }
    })

    ctx.body = ctx.msg.success;
    ctx.body.data = {
      ...eventList,
      // 获取消息中所需的信息
      users: userIdSet.size ? await this.service.user.getUserList([...userIdSet], ctx.user.id) : [],
      posts: postIdSet.size ? await this.service.post.getByIdArray([...postIdSet]) : [],
      comments: commentIdSet.size ? await this.service.comment.getByIdArray([...commentIdSet]) : [],
      announcements: announcementIdSet.size ? await this.service.notify.announcement.getByIdArray([...announcementIdSet]) : [],
      assetsLog: assetsLogIdSet.size ? await this.service.assets.getByIdArray([...assetsLogIdSet]) : [],
      minetokensLog: minetokensLogIdSet.size ? await this.service.token.mineToken.getLogByIdArray([...minetokensLogIdSet]) : [],
      tokens: tokenIdSet.size ? await this.service.token.mineToken.getByIdArray([...tokenIdSet]) : []
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
    if (objectType === 'comment') {
      const comments = await this.service.comment.getByIdArray([parseInt(objectId)]);
      if (comments !== null && comments.length > 0) eventList.comment = comments[0];
    }

    // 汇总消息中所需信息的数据库索引
    let userIdSet = new Set();
    let commentIdSet = new Set();
    let minetokensLogIdSet = new Set();
    let tokenIdSet = new Set();
    eventList.list.forEach(item => {
      userIdSet.add(item.user_id);

      if (item.action === 'comment' || item.action === 'reply') // 评论或回复
        commentIdSet.add(Number(item.remark));
      else if (item.action === 'transfer' && objectType === 'article') // 打赏文章
        minetokensLogIdSet.add(Number(item.remark));
      else if (objectType === 'collaborator') // 协作者
        tokenIdSet.add(Number(item.remark));
    })
    // 获取消息中所需的信息
    const users = userIdSet.size ? await this.service.user.getUserList([...userIdSet], ctx.user.id) : [];
    const comments = commentIdSet.size ? await this.service.comment.getByIdArray([...commentIdSet]) : [];
    const minetokensLog = minetokensLogIdSet.size ? await this.service.token.mineToken.getLogByIdArray([...minetokensLogIdSet]) : [];
    const tokens = tokenIdSet.size ? await this.service.token.mineToken.getByIdArray([...tokenIdSet]) : [];
    // 拼接数据
    eventList.list.forEach(item => {
      item.user = users.find(user => user.id === item.user_id)
      if (item.action === 'comment' || item.action === 'reply')
        item.comment = comments.find(comment => comment.id === item.remark)
      else if (item.action === 'transfer' && objectType === 'article')
        item.minetokensLog = minetokensLog.find(minetokenLog => minetokenLog.id === item.remark)
      else if (objectType === 'collaborator')
        item.token = tokens.find(token => token.id === item.remark)
    })

    ctx.body = ctx.msg.success;
    ctx.body.data = eventList;
  }

  /** 获取未读消息数量 */
  async getUnreadQuantity() {
    const ctx = this.ctx;
    // 初始化公告类型的通知
    await this.service.notify.announcement.initRecipients(ctx.user.id, 'informInstant');

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

  /** 通知文章解锁条件内的Fan票流动性不足 */
  async postInsufficientLiquidity() {
    const ctx = this.ctx;
    const { postId, tokenId } = ctx.request.body;
    const result = await this.service.notify.announcement.postInsufficientLiquidity(postId, tokenId);
    ctx.body = result ? ctx.msg.success : ctx.msg.failure;
    if (result) ctx.body.data = result
  }
}

module.exports = NotificationController;
