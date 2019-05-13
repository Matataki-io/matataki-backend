'use strict';
const passport = require('./passport');

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;

  router.get('/', controller.home.index);

  // 发布文章
  router.post('/publish', controller.post.publish);
  // 文章编辑
  router.post('/edit', controller.post.edit);
  // 文章列表
  router.get('/posts', controller.post.posts);
  // 打赏过的文章
  router.get('/supports', controller.post.supports);
  // 单篇文章
  router.get('/post/:hash', controller.post.post);
  // 单篇文章（for 短链接）
  router.get('/p/:id', controller.post.p);

  //单篇文章（for 短链接），统一返回格式示例
  router.get('/p2/:id', passport.verify, controller.post.p2);
  // 隐藏文章，统一返回格式示例
  app.router.delete('/post2/:id', passport.authorize, app.controller.post.delete2);

  // 文章阅读事件上报
  router.post('/post/show/:hash', controller.post.show);
  // 添加评论
  router.post('/post/comment', controller.post.comment);

  // 隐藏文章
  app.router.delete('/post/:id', app.controller.post.delete);


  // 获取用户信息：用户名、关注数，粉丝数
  router.get('/user/:username', controller.user.user);

  // 获取资产历史统计、和详情列表（默认最新20条）
  router.get('/assets', controller.user.assets);
  // 设置用户nickname (need access token)
  router.post('/user/setNickname', controller.user.setNickname);
  // 设置用户email (need access token)
  router.post('/user/setEmail', controller.user.setEmail);
  // 设置用户头像 (need access token)
  router.post('/user/setAvatar', controller.user.setAvatar);
  // 设置用户的个性签名（自我介绍），(need access token)
  router.post('/user/setIntroduction', passport.authorize, controller.user.setIntroduction);
  // 设置用户的个人资料，包括email，昵称和自我介绍。
  router.post('/user/setProfile', passport.authorize, controller.user.setProfile);
  // 用户个人主页的统计信息接口
  router.post('/user/getDetail', passport.authorize, controller.user.getUserDetails);

  // 分享
  router.post('/share', controller.share.share);
  router.get('/shares', controller.share.shares);

  // 打赏
  router.post('/vote', controller.vote.vote);

  // ipfs service
  // router.post('/ipfs/add', controller.ipfs.add);
  // router.post('/ipfs/addJSON', controller.ipfs.addJSON);

  // router.get('/ipfs/cat/:hash', controller.ipfs.cat);
  // router.get('/ipfs/catJSON/:hash', controller.ipfs.catJSON);

  // follow 关注和取关动作。关注数和粉丝数在userinfo里
  app.router.post('/follow', app.controller.follow.follow);
  app.router.post('/unfollow', app.controller.follow.unfollow);

  // 关注列表
  app.router.get('/follows', app.controller.follow.follows);
  // 粉丝列表（谁关注了我？）
  app.router.get('/fans', app.controller.follow.fans);

  // 获取access token
  app.router.post('/auth', app.controller.auth.auth);

  // 被打赏次数排行榜
  app.router.get('/getSupportTimesRanking', app.controller.post.getSupportTimesRanking);
  // 被打赏总额排行榜
  app.router.get('/getSupportAmountRanking', app.controller.post.getSupportAmountRanking);

  // 草稿箱
  // 获取我的草稿箱列表 (need access token)
  app.router.get('/drafts', app.controller.drafts.drafts);
  // 获取单篇草稿内容 (need access token)
  app.router.get('/draft/:id', app.controller.drafts.draft);
  // create or update (need access token)
  app.router.post('/draft/save', app.controller.drafts.save);
  // delete (need access token)
  app.router.delete('/draft/:id', app.controller.drafts.delete);

  // 跨链打赏 上报接口
  app.router.post('/support', app.controller.support.support);

  // 个人资产
  app.router.get('/tokens', app.controller.user.tokens);
};

