'use strict';
const passport = require('./passport');

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;

  // geetest校验中间件
  // const geetestVerify = app.middleware.geetest();

  router.get('/', controller.home.index);

  // -------------------------------- 用户登录 --------------------------------
  // 获取access token
  // router.post('/auth', passport.verify, controller.auth.auth);
  router.post('/login/auth', passport.verify, controller.auth.auth);
  // 验证OAuth回传的Code
  router.post('/login/github', passport.verify, controller.auth.githubLogin);
  // 验证用户存在性， 是否已经注册
  router.get('/login/verify', passport.verify, controller.auth.verifyReg);
  // 发送注册码邮件
  router.get('/login/captcha', passport.verify, controller.auth.sendCaptcha);
  // 注册用户
  router.post('/login/regist', passport.verify, controller.auth.regUser);
  // 进行账密登录
  router.post('/login/account', passport.verify, controller.auth.accountLogin);

  // -------------------------------- 发布与获取文章 --------------------------------
  // 发布文章
  // router.post('/publish', passport.authorize, controller.post.publish);
  router.post('/post/publish', passport.authorize, controller.post.publish);
  // 上传文章到IPFS
  router.post('/post/ipfs', passport.authorize, controller.post.uploadPost);
  // 从IPFS拿取文章内容
  router.get('/post/ipfs/:hash', passport.verify, controller.post.catchPost);
  // 上传图片
  router.post('/post/uploadImage', passport.authorize, controller.post.uploadImage);
  // 文章编辑
  // router.post('/edit', passport.authorize, controller.post.edit);
  router.post('/post/edit', passport.authorize, controller.post.edit);
  // 单篇文章 (by 文章hash)
  router.get('/post/:hash', passport.verify, controller.post.postByHash);
  // 单篇文章 (by 文章id, for 短链接)，统一返回格式示例
  router.get('/p/:id', passport.verify, controller.post.p);
  // 按照打赏金额排序的文章列表(新, 可按照币种排序)
  router.get('/posts/amountRanking', passport.verify, controller.post.getAmountRanking);
  // 按照打赏次数排序的文章列表(新)
  router.get('/posts/supportsRanking', passport.verify, controller.post.getSupportsRanking);
  // 按照发布时间排序的文章列表(新)
  router.get('/posts/timeRanking', passport.verify, controller.post.getTimeRanking);
  // 获取关注的作者的文章
  router.get('/posts/followedPosts', passport.verify, controller.post.getFollowedRanking);
  // 按照评分排序的文章列表(新)
  router.get('/posts/scoreRanking', passport.verify, controller.post.getScoreRanking);
  // 某用户赞赏过的文章列表(新)
  router.get('/posts/supported', passport.verify, controller.post.getSupported);
  // 推荐文章列表(仅5条, 不分页)
  router.get('/posts/recommend', passport.verify, controller.post.getRecommend);
  // 根据 tag 查找tag下的文章
  router.get('/posts/getPostByTag', passport.verify, controller.post.getPostByTag);
  // 文章导入功能
  router.post('/posts/importer', passport.authorize, controller.post.importer);
  // Elastic search
  router.get('/posts/search', passport.verify, controller.search.search);
  // 查询统计数据
  router.get('/posts/stats', passport.verify, controller.post.stats);

  // -------------------------------- 编辑,转移,评论 --------------------------------
  // 隐藏文章，统一返回格式示例
  router.delete('/post/:id', passport.authorize, controller.post.delete2);
  // 编辑时获取我的文章
  router.get('/mypost/:id', passport.authorize, controller.post.mypost);
  // 文章阅读事件上报
  router.post('/post/show/:hash', passport.verify, controller.post.show);
  // router.post('/post/show/:id', passport.verify, controller.post.show);
  // 添加评论
  router.post('/post/comment', passport.authorize, controller.post.comment);
  // 转移文章拥有权
  router.post('/post/transferOwner', passport.authorize, controller.post.transferOwner);

  // -------------------------------- 标签系统 --------------------------------
  // 标签列表
  router.get('/tag/tags', passport.verify, controller.tag.tags);

  // -------------------------------- 草稿系统 --------------------------------
  // 获取我的草稿箱列表 (need access token)
  // router.get('/drafts', passport.authorize, controller.drafts.drafts);
  router.get('/draft/drafts', passport.authorize, controller.drafts.drafts);
  // 获取单篇草稿内容 (need access token)
  router.get('/draft/:id', passport.authorize, controller.drafts.draft);
  // create or update (need access token)
  router.post('/draft/save', passport.authorize, controller.drafts.save);
  // delete (need access token)
  router.delete('/draft/:id', passport.authorize, controller.drafts.delete);
  // 转移草稿拥有权
  router.post('/draft/transferOwner', passport.authorize, controller.drafts.transferOwner);

  // -------------------------------- 用户系统 --------------------------------
  // 获取用户个人主页的统计信息, 请注意和 获取用户信息 方法 的冲突可能
  router.get('/user/stats', passport.authorize, controller.user.getUserDetails);
  // 用户搜索
  // router.get('/search', passport.verify, controller.user.search);
  router.get('/user/search', passport.verify, controller.user.search);
  // 用户搜索， elastic版
  router.get('/users/search', passport.verify, controller.search.searchUser);
  // 个人资产
  // router.get('/balance', passport.authorize, controller.user.balance);
  router.get('/user/balance', passport.authorize, controller.user.balance);
  // 资产明细
  // router.get('/tokens', passport.authorize, controller.user.tokens);
  router.get('/user/tokens', passport.authorize, controller.user.tokens);
  // 获取用户的积分和日志
  router.get('/user/points', passport.authorize, controller.user.points);

  // 设置用户头像 (need access token)
  router.post('/user/setAvatar', passport.authorize, controller.user.setAvatar);
  // 上传用户头像, 并自动设置
  router.post('/user/uploadAvatar', passport.authorize, controller.user.uploadAvatar);
  // 设置用户的个人资料，包括email，昵称和自我介绍。
  router.post('/user/setProfile', passport.authorize, controller.user.setProfile);
  // 发起提现
  router.post('/user/withdraw', passport.authorize, controller.user.withdraw);
  // 推荐用户
  router.get('/users/recommend', passport.verify, controller.user.recommend);
  // 获取任务积分
  router.post('/user/claimTaskPoint', passport.authorize, controller.user.claimTaskPoint);
  // 获取任务状态
  router.get('/user/pointStatus', passport.authorize, controller.user.getPointStatus);
  // 获取我邀请的人的列表
  router.get('/user/invitees', passport.authorize, controller.user.invitees);

  // 获取用户信息：用户名、关注数，粉丝数
  router.get('/user/:id', passport.verify, controller.user.user);

  // -------------------------------- 粉丝系统 --------------------------------
  // follow 关注和取关动作。关注数和粉丝数在userinfo里
  // router.post('/follow', passport.authorize, controller.follow.follow);
  router.post('/follow/follow', passport.authorize, controller.follow.follow);
  // 取消关注
  // router.post('/unfollow', passport.authorize, controller.follow.unfollow);
  router.post('/follow/unfollow', passport.authorize, controller.follow.unfollow);
  // 关注列表
  // router.get('/follows', passport.verify, controller.follow.follows);
  router.get('/follow/follows', passport.verify, controller.follow.follows);
  // 粉丝列表（谁关注了我？）
  // router.get('/fans', passport.verify, controller.follow.fans);
  router.get('/follow/fans', passport.verify, controller.follow.fans);

  // -------------------------------- 点赞和购买 --------------------------------
  // 打赏和评论列表(已被替代)
  // router.get('/support/comments', passport.verify, controller.support.comments);
  // 用户自己已经购买的商品列表(已被替代)
  // router.get('/support/products', passport.authorize, controller.support.myProducts);
  // 跨链打赏 上报接口
  // router.post('/support', passport.authorize, controller.support.support);
  router.post('/support/support', passport.authorize, controller.support.support);
  // 商品订单
  // router.post('/order', passport.authorize, controller.order.create);
  router.post('/order/order', passport.authorize, controller.order.create);
  // 用户自己已经购买的商品列表
  router.get('/order/products', passport.authorize, controller.order.myProducts);

  // // 邮件测试
  // router.get('/mailtest6a3476f5', passport.verify, controller.post.mailtest);

  // -------------------------------- 评论 --------------------------------
  // 评论列表
  // router.get('/comments', passport.verify, controller.comment.comments);
  router.get('/comment/comments', passport.verify, controller.comment.comments);

  // -------------------------------- 橙皮书 --------------------------------
  // 橙皮书合约广告人、次统计
  router.get('/ads/statistics', passport.verify, controller.ads.statistics);
  // 获取广告
  router.get('/ads/ad', passport.verify, controller.ads.ad);
  // 最高出价者 上传广告资料
  router.post('/ads/submit', passport.authorize, controller.ads.submit);

  // -------------------------------- 对外API --------------------------------
  // 获取微信API签名
  router.get('/wx/sign', passport.verify, controller.wechat.calculateSign);

  // -------------------------------- 积分相关 --------------------------------
  // 开始阅读
  router.post('/posts/:id/reading', passport.authorize, controller.mining.reading);
  // 喜欢
  router.post('/posts/:id/like', passport.authorize, controller.mining.like);
  // 不喜欢
  router.post('/posts/:id/dislike', passport.authorize, controller.mining.dislike);
  // 阅读新内容30秒，增加阅读新内容积分
  router.post('/posts/:id/readnew', passport.authorize, controller.mining.readnew);

  // -------------------------------- 搜索相关 --------------------------------
  // 推荐搜索词语
  router.get('/search/recommend', passport.verify, controller.search.recommand);
  // -------------------------------- geetest --------------------------------
  // 注册geetest
  router.get('/gt/register-slide', controller.geetest.register);
  // 验证geetest
  router.post('/gt/validate-slide', controller.geetest.validate);
};

