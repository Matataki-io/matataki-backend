'use strict';
const passport = require('./passport');
/**
 * @param {Egg.Application} app - egg application
 */
module.exports = app => {
  const { router, controller } = app;

  // geetest校验中间件
  const geetestVerify = app.middleware.geetest();

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
  router.post('/login/captcha', passport.verify, geetestVerify, controller.auth.sendCaptcha);
  // 发送重置密码邮件
  router.post('/login/resetPassword/captcha', passport.verify, geetestVerify, controller.auth.sendResetCaptcha);
  // 重置密码
  router.post('/login/resetPassword', passport.verify, controller.auth.resetPassword);
  // 注册用户
  router.post('/login/regist', passport.verify, controller.auth.regUser);
  // 进行账密登录
  router.post('/login/account', passport.verify, controller.auth.accountLogin);
  // 微信登录
  router.post('/login/weixin', passport.verify, controller.auth.weixinLogin);
  router.post('/login/telegram', passport.verify, controller.auth.telegramAuth);

  // -------------------------------- 发布与获取文章 --------------------------------
  // 发布文章
  // router.post('/publish', passport.authorize, controller.post.publish);
  router.post('/post/publish', passport.authorize, controller.post.publish);

  // Frank(Feb 6th, 2020): 既然放弃了发文签名，我们应该逐步取消掉这个路由了
  // @todo: 准备放弃上传文章到IPFS的路由，合并到上方的publish
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

  // 通过文章ID获取 IPFS 信息
  router.get('/p/:id/ipfs', passport.verify, controller.post.getIpfsById);

  // 文章哈希上链相关
  router.get('/p/:id/timeMachine/getLatestIpfsHash', passport.verify, controller.timemachine.getLatestIpfsHash);
  router.get('/p/:id/timeMachine/getArticleRivisionHistory/:size', passport.verify, controller.timemachine.getArticleRivisionHistory);
  router.get('/p/:id/timeMachine/getCurrentRevisionId', passport.verify, controller.timemachine.getCurrentRevisionCount);

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

  // -------------------------------- 编辑,转移,评论,收藏 --------------------------------
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
  // 收藏文章
  router.post('/post/:id/bookmark', passport.authorize, controller.post.addBookmark);
  // 取消收藏文章
  router.delete('/post/:id/bookmark', passport.authorize, controller.post.removeBookmark);

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
  // 上传 banner 图像, 并自动设置
  router.post('/user/uploadBanner', passport.authorize, controller.user.uploadBanner);
  // 设置用户的个人资料，包括email，昵称和自我介绍。
  router.post('/user/setProfile', passport.authorize, controller.user.setProfile);
  // 设置用户的网站和社交帐号信息
  router.put('/user/links', passport.authorize, controller.user.setLinks);
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

  // 获取收藏文章
  router.get('/user/bookmarks', passport.authorize, controller.user.getBookmarks);
  // 获取收藏文章状态
  router.get('/user/bookmark/stats', passport.authorize, controller.user.getBookmarkStats);

  // 获取用户信息：用户名、关注数，粉丝数
  router.get('/user/:id', passport.verify, controller.user.user);
  // 获取用户的网站和社交帐号信息
  router.get('/user/:id/links', passport.verify, controller.user.getLinks);

  // 获取目前用户的绑定第三方帐户状态
  router.get('/user/:id/bind', passport.verify, controller.account.bind.getBindStatus);
  // 用户获取 platform 的绑定状态，如果没绑定则验证码（用于API对用户识别、钱包的签名请求等）
  router.get('/user/:id/bind/:platform', passport.authorize, controller.account.bind.GetMyPlatform);
  // 设置 platform 相关数据（第三方平台的id等，对应 user_third_party 表）
  router.post('/user/:id/bind/:platform', passport.verify, controller.account.bind.setBindData);

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

  // 保存交易hash
  router.post('/support/saveTxhash', passport.authorize, controller.support.saveTxhash);
  router.post('/order/saveTxhash', passport.authorize, controller.order.saveTxhash);

  // // 邮件测试
  // router.get('/mailtest6a3476f5', passport.verify, controller.post.mailtest);

  // -------------------------------- 评论 --------------------------------
  // 评论列表
  // router.get('/comments', passport.verify, controller.comment.comments);
  router.get('/comment/comments', passport.verify, controller.comment.comments);
  // 直接评论，需要支付积分
  router.post('/comment/comment', passport.authorize, controller.comment.comment);

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

  // 创建token
  router.post('/minetoken/create', passport.authorize, controller.mineToken.create);
  router.post('/minetoken/mint', passport.authorize, controller.mineToken.mint);
  router.post('/minetoken/transfer', passport.authorize, controller.mineToken.transfer);
  // 查询当前用户的token余额
  router.get('/minetoken/balance', passport.authorize, controller.mineToken.getBalance);
  // 查询任意用户的token余额
  // router.get('/minetoken/balanceOf', passport.authorize, controller.mineToken.getUserBalance);
  router.get('/minetoken/:id', passport.verify, controller.mineToken.get);
  router.put('/minetoken/:id', passport.authorize, controller.mineToken.update);
  router.get('/minetoken/:id/resources', passport.verify, controller.mineToken.getResources);
  router.put('/minetoken/:id/resources', passport.authorize, controller.mineToken.saveResources);
  router.get('/minetoken/:id/related', passport.verify, controller.mineToken.getRelated);

  // -------------------------------- token display API --------------------------------
  // 查询用户发行的token持仓用户list
  router.get('/token/userlist', passport.authorize, controller.token.userList);
  // router.get('/token/usertokenflow', passport.verify, controller.token.userTokenFlow);
  // 用户持仓token list
  router.get('/token/tokenlist', passport.authorize, controller.token.tokenList);
  // router.get('/token/tokenflow', passport.verify, controller.token.tokenFlow);
  // 查询我发行的token详情
  router.get('/token/minetoken', passport.authorize, controller.token.minetokenDetail);
  // 所有的token 分页
  router.get('/token/all', passport.verify, controller.token.allToken);
  router.get('/token/symbol', passport.verify, controller.token.getTokenBySymbol);

  router.get('/token/:id/balances', passport.verify, controller.token.balances);
  router.get('/token/:id/transactions', passport.verify, controller.token.transactions);

  // 我的token transfer日志
  router.get('/token/userlogs', passport.authorize, controller.token.getUserLogs);
  // 我发行的token transfer日志
  router.get('/token/tokenlogs', passport.authorize, controller.token.getTokenLogs);
  // 查询用户:id发行的token
  router.get('/token/user/:id', passport.verify, controller.token.getByUserId);
  // 查询符号为:symbol的token
  router.get('/token/symbol/:symbol', passport.verify, controller.token.getBySymbol);

  // 查询当前用户的资产余额
  router.get('/asset/balance', passport.verify, controller.asset.getBalance);
  // 资产转移
  router.post('/asset/transfer', passport.authorize, controller.asset.transfer);

  // 创建交易对
  router.post('/exchange/create', passport.authorize, controller.exchange.create);
  // 查询交易对
  router.get('/exchange/', passport.verify, controller.exchange.get);

  // todo:测试代码，待删除
  router.post('/exchange/addLiquidityOrder', passport.authorize, controller.exchange.addLiquidityOrder);
  router.post('/exchange/addLiquidityBalance', passport.authorize, controller.exchange.addLiquidityBalance);
  router.post('/exchange/removeLiquidity', passport.authorize, controller.exchange.removeLiquidity);

  router.post('/exchange/cnyToTokenInputOrder', passport.authorize, controller.exchange.cnyToTokenInputOrder);
  router.post('/exchange/cnyToTokenInputBalance', passport.authorize, controller.exchange.cnyToTokenInputBalance);
  router.post('/exchange/cnyToTokenOutputOrder', passport.authorize, controller.exchange.cnyToTokenOutputOrder);
  router.post('/exchange/cnyToTokenOutputBalance', passport.authorize, controller.exchange.cnyToTokenOutputBalance);

  router.post('/exchange/tokenToCnyInput', passport.authorize, controller.exchange.tokenToCnyInput);
  router.post('/exchange/tokenToCnyOutput', passport.authorize, controller.exchange.tokenToCnyOutput);

  router.post('/exchange/tokenToTokenInput', passport.authorize, controller.exchange.tokenToTokenInput);
  router.post('/exchange/tokenToTokenOutput', passport.authorize, controller.exchange.tokenToTokenOutput);
  router.post('/exchange/refundOrder', passport.authorize, controller.exchange.refundOrder);

  // -------------------------------- exchage计算 display API --------------------------------
  // 获取pool size & supply
  router.get('/exchange/currentPoolSize', passport.verify, controller.exchange.getCurrentPoolSize);
  // 获取yout pool size
  router.get('/exchange/userPoolSize', passport.authorize, controller.exchange.getYourPoolSize);
  // 获取your mint token
  router.get('/exchange/userMintToken', passport.verify, controller.exchange.getYourMintToken);
  router.get('/exchange/poolCnyToTokenPrice', passport.verify, controller.exchange.getPoolCnyToTokenPrice);
  // router.get('/exchange/balance', passport.authorize, controller.exchange.getUserBalance);

  // 支付后订单状态修改通知接口
  router.get('/exchange/notify', passport.verify, controller.exchange.notify);
  // 获取output amount
  router.get('/exchange/outputAmount', passport.verify, controller.exchange.getOutputAmount);
  // 获取input amount
  router.get('/exchange/inputAmount', passport.verify, controller.exchange.getInputAmount);
  // swap，// token 换 token / cny接口
  router.post('/exchange/swap', passport.authorize, controller.exchange.swap);
  // 根据资金池通证获取输出
  router.get('/exchange/outputPoolSize', passport.verify, controller.exchange.getOutputPoolSize);

  // 持币阅读
  router.post('/post/addMineTokens', passport.authorize, controller.post.addMineTokens);
  router.post('/post/currentProfile', passport.authorize, controller.post.currentProfile);

  // 解析引用网址内容，提取标题
  router.post('/posts/extractRefTitle', passport.verify, controller.post.extractRefTitle);
  // 添加/修改引用
  router.put('/posts/:id/references', passport.authorize, controller.post.addReference);
  // 删除引用
  router.delete('/posts/:id/references/:number', passport.authorize, controller.post.deleteReference);
  // 查看单个引用
  router.get('/posts/:id/references/:number', passport.verify, controller.post.getReference);
  // 查看本文引用列表
  router.get('/posts/:id/references', passport.verify, controller.post.getReferences);
  // 查看本文被引用的文章列表
  router.get('/posts/:id/posts', passport.verify, controller.post.refPosts);
  // 文章价格
  router.put('/posts/:id/prices', passport.authorize, controller.post.addPrices);
  router.delete('/posts/:id/prices', passport.authorize, controller.post.delPrices);

  router.put('/drafts/:id/references', passport.authorize, controller.post.addDraftReference);
  router.delete('/drafts/:id/references/:number', passport.authorize, controller.post.deleteDraftReference);
  router.get('/drafts/:id/references/:number', passport.verify, controller.post.getDraftReference);
  router.post('/drafts/:id/references/publish', passport.authorize, controller.post.publishReferences);
  router.get('/drafts/:id/references', passport.verify, controller.post.getDraftReferences);

  // 持有流动金
  router.get('/token/holdLiquidity', passport.authorize, controller.token.getHoldLiquidity);
  router.get('/token/liquidityLogs', passport.verify, controller.token.getLiquidityLogs);
  router.get('/token/myLiquidityLogs', passport.authorize, controller.token.getMyLiquidityLogs);
  router.get('/token/purchaseLogs', passport.verify, controller.token.getPurchaseLog);
  router.get('/token/myPurchaseLogs', passport.authorize, controller.token.getMyPurchaseLog);
  router.get('/token/:id/liquidity/balances', passport.verify, controller.token.getLiquidityBalances);
  router.get('/token/:id/liquidity/transactions', passport.verify, controller.token.getLiquidityTransactions);

  // -------------------------------- 微信支付相关API --------------------------------
  // 微信支付回调
  router.post('/wx/notify', app.middleware.tenpay('pay', app), controller.wxpay.notify);
  // 微信退款结果通知
  router.post('/wx/refundNotify', app.middleware.tenpay('pay', app), controller.wxpay.refundNotify);
  // 微信支付接口
  router.post('/wx/pay', passport.authorize, controller.wxpay.pay);

  router.post('/wxpay/refund', passport.verify, controller.wxpay.refund);

  // 微信登录获取openid
  router.post('/wx/login', passport.verify, controller.wxpay.login);

  // 修改wxpay的微信支付
  // router.post('/order/create', passport.authorize, controller.wxpay.createOrder);
  // router.get('/order/get/:id', passport.authorize, controller.wxpay.getOrder);
  // router.post('/order/pay', passport.authorize, controller.wxpay.wxpay);
  router.put('/orders', passport.authorize, controller.order.createOrder);
  router.get('/orders/:tradeNo', passport.authorize, controller.order.get);
  router.put('/orders/:tradeNo', passport.authorize, controller.order.updateOrder);
  router.post('/orders/handleAmount0', passport.authorize, controller.order.handleAmount0);

  router.post('/wx/payarticlenotify', app.middleware.tenpay('pay', app), controller.wxpay.payArticleNotify);
  router.post('/order/wxpay', passport.authorize, controller.wxpay.wxpayArticle);

  // for ethereum related routes
  router.get('/eth/getTransaction/:txHash', passport.verify, controller.ethereum.api.getTransaction);
  router.get('/eth/getTxReceipt/:txHash', passport.verify, controller.ethereum.api.getTransactionReceipt);

  // get metadata from url
  router.get('/metadata/getFromUrl/', passport.verify, controller.metadata.get);

  // 通知
  router.get('/notification', passport.authorize, controller.notification.overview);
  router.get('/notification/fetch', passport.authorize, controller.notification.fetch);
  router.post('/notification/read', passport.authorize, controller.notification.read);

  // 上传图片
  router.post('/oss/uploadImage', passport.authorize, controller.oss.uploadImage);

  // 给我们的机器人提供一个查询钱包
  router.get('/_internal_bot/account/:id/ethWallet', passport.apiVerify, controller.internalApi.telegram.getWalletAddressFromTelegramUid);
  router.get('/_internal_bot/account/:id/info', passport.apiVerify, controller.internalApi.telegram.getAssociatedInfo);
  router.get('/_internal_bot/minetoken/:id/contractAddress', passport.apiVerify, controller.internalApi.telegram.getContractAddress);
  router.post('/_internal_bot/minetoken/:id/transferFrom', passport.apiAuthorize, controller.internalApi.telegram.transferFrom);
  router.get('/_internal_bot/minetoken/:userId/:symbol/balance', passport.apiVerify, controller.internalApi.telegram.getUserTokenDetail);
  router.get('/_internal_bot/minetokens', passport.apiVerify, controller.internalApi.telegram.getAllMinetokens);

  // 账号绑定
  router.post('/account/binding', passport.authorize, controller.account.binding.binding);
  router.post('/account/unbinding', passport.authorize, controller.account.binding.unbinding);
  router.post('/account/changeMainAccount', passport.authorize, controller.account.binding.changeMainAccount);
  router.get('/account/list', passport.authorize, controller.account.binding.list);

  // alipay
  router.post('/alipay/wapPay', passport.verify, controller.alipay.wapPay);
  router.post('/alipay/pagePay', passport.verify, controller.alipay.pagePay);
  router.post('/alipay/notify', passport.verify, controller.alipay.notify);
  // router.post('/alipay/auth', passport.verify, controller.alipay.auth);
  // router.post('/stablecoin/transfer', passport.verify, controller.ethereum.stablecoin.transfer);

  // moment
  router.post('/share', passport.authorize, controller.share.create);
  router.get('/share', passport.verify, controller.share.index);
  router.get('/share/:id', passport.verify, controller.share.show);
  router.get('/dev/score', passport.verify, controller.share.getHotArticle);
};

