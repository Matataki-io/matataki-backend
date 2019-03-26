'use strict';

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;

  router.get('/', controller.home.index);

  // 发布文章
  router.post('/publish', controller.post.publish);
  // 文章列表
  router.get('/posts', controller.post.posts);
  // 打赏过的文章
  router.get('/supports', controller.post.supports);
  // 单篇文章
  router.get('/post/:hash', controller.post.post);

  // 文章阅读事件上报 
  router.post('/post/show/:hash', controller.post.show);
  // 添加评论
  router.post('/post/comment', controller.post.comment);

  // 获取用户信息：用户名、关注数，粉丝数
  router.get('/user/:username', controller.user.user);

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

  // 获取access token 
  app.router.post('/auth', app.controller.auth.auth);
};

