'use strict';
const passport = require('./passport');

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;

  router.get('/', controller.home.index);

  // 发布文章，增加登录验证，todo：还需要改为passport.authorize，必须登录用户才能提交
  router.post('/publish', passport.authorize, controller.post.publish);
  // 文章编辑
  // 此处为了使用msg模块引入了passport.verify, 以后整体修改的时候需用passport.authorize
  router.post('/edit', passport.authorize, controller.post.edit);
  // 文章列表
  // router.get('/posts', controller.post.posts);
  // // 打赏过的文章
  // router.get('/supports', controller.post.supports);
  // 单篇文章
  router.get('/post/:hash', controller.post.post);
  // 单篇文章（for 短链接）
  // router.get('/p/:id', controller.post.p);

  // 单篇文章（for 短链接），统一返回格式示例
  router.get('/p/:id', passport.verify, controller.post.p);
  // 隐藏文章，统一返回格式示例
  router.delete('/post2/:id', passport.authorize, app.controller.post.delete2);

  // 编辑时获取我的文章
  router.get('/mypost/:id', passport.authorize, app.controller.post.mypost);

  // 文章阅读事件上报
  router.post('/post/show/:hash', controller.post.show);
  // 添加评论
  router.post('/post/comment', controller.post.comment);

  // 隐藏文章
  app.router.delete('/post/:id', app.controller.post.delete);

  // 转移文章拥有权
  router.post('/post/transferOwner', passport.authorize, controller.post.transferOwner);


  // 获取用户个人主页的统计信息
  // 请注意和 获取用户信息 方法 的冲突可能
  router.get('/user/stats', passport.authorize, controller.user.getUserDetails);
  // 获取用户信息：用户名、关注数，粉丝数
  router.get('/user/:id', passport.verify, controller.user.user);

  // // 获取资产历史统计、和详情列表（默认最新20条）
  // router.get('/assets', controller.user.assets);
  // // 设置用户nickname (need access token)
  // router.post('/user/setNickname', controller.user.setNickname);
  // // 设置用户email (need access token)
  // router.post('/user/setEmail', controller.user.setEmail);
  // 设置用户头像 (need access token)
  router.post('/user/setAvatar', passport.authorize, controller.user.setAvatar);
  // // 设置用户的个性签名（自我介绍），(need access token)
  // router.post('/user/setIntroduction', passport.authorize, controller.user.setIntroduction);
  // 设置用户的个人资料，包括email，昵称和自我介绍。
  router.post('/user/setProfile', passport.authorize, controller.user.setProfile);

  // 打赏和评论列表
  router.get('/support/comments', passport.verify, controller.support.comments);

  // 用户自己已经购买的商品列表
  router.get('/support/products', passport.authorize, controller.support.myProducts);


  // follow 关注和取关动作。关注数和粉丝数在userinfo里
  app.router.post('/follow', passport.authorize, app.controller.follow.follow);
  app.router.post('/unfollow', passport.authorize, app.controller.follow.unfollow);

  // 关注列表
  app.router.get('/follows', passport.verify, app.controller.follow.follows);
  // 粉丝列表（谁关注了我？）
  app.router.get('/fans', passport.verify, app.controller.follow.fans);

  // 获取access token
  app.router.post('/auth', app.controller.auth.auth);

  // // 被打赏次数排行榜
  // app.router.get('/getSupportTimesRanking', app.controller.post.getSupportTimesRanking);
  // // 被打赏总额排行榜
  // app.router.get('/getSupportAmountRanking', app.controller.post.getSupportAmountRanking);
  // 按照打赏金额排序的文章列表(新, 可按照币种排序)
  app.router.get('/posts/amountRanking', passport.verify, app.controller.post.getAmountRanking);
  // 按照打赏次数排序的文章列表(新)
  app.router.get('/posts/supportsRanking', passport.verify, app.controller.post.getSupportsRanking);
  // 按照发布时间排序的文章列表(新)
  app.router.get('/posts/timeRanking', passport.verify, app.controller.post.getTimeRanking);
  // 某用户赞赏过的文章列表(新)
  app.router.get('/posts/supported', passport.verify, app.controller.post.getSupported);

  // 根据 tag 查找tag下的文章
  app.router.get('/posts/getPostByTag', passport.verify, app.controller.post.getPostByTag);


  // 草稿箱
  // 获取我的草稿箱列表 (need access token)
  app.router.get('/drafts', app.controller.drafts.drafts);
  // 获取单篇草稿内容 (need access token)
  app.router.get('/draft/:id', app.controller.drafts.draft);
  // create or update (need access token)
  app.router.post('/draft/save', app.controller.drafts.save);
  // delete (need access token)
  app.router.delete('/draft/:id', app.controller.drafts.delete);
  // 转移草稿拥有权
  app.router.post('/draft/transferOwner', passport.authorize, app.controller.drafts.transferOwner);

  // 跨链打赏 上报接口
  app.router.post('/support', app.controller.support.support);

  // 个人资产
  app.router.get('/balance', passport.authorize, app.controller.user.balance);
  // 资产明细
  app.router.get('/tokens', passport.authorize, app.controller.user.tokens);
  // 发起提现
  app.router.post('/user/withdraw', passport.authorize, app.controller.user.withdraw);

  // 验证OAuth回传的Code
  app.router.post('/login/github', passport.verify, app.controller.auth.githubLogin);

  // // 邮件测试
  // app.router.get('/mailtest6a3476f5', passport.verify, app.controller.post.mailtest);

  // 标签列表
  app.router.get('/tag/tags', passport.verify, app.controller.tag.tags);
};

