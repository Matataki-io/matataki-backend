'use strict';

// 错误码统一编码，提示信息多语言
module.exports = {

  // 成功
  success: 0,

  // 通用错误码
  // 失败
  failure: 1,
  // 参数错误
  paramsError: 2,

  // 没有权限
  unauthorized: 401,
  // 内部服务器错误
  serverError: 500,

  // 用户、登录相关
  loginError: 10000,
  // 请求设置的用户个性签名过长
  userIntroductionInvalid: 10001,
  // 所查询的用户不存在
  userNotExist: 10002,
  // email发生重复
  emailDuplicated: 10003,
  // 昵称发生重复
  nicknameDuplicated: 10004,
  // 昵称不合法,包含字符或者超过12位
  nicknameInvalid: 10005,

  // 错误的EOS帐号地址
  eosAddressInvalid: 10006,
  // 错误的ONT帐号地址
  ontAddressInvalid: 10007,

  // 错误的授权信息
  authCodeInvalid: 10008,
  // 验证用户, 以及分发jet token时候出错
  generateTokenError: 10009,

  // 用户不能关注自己
  followYourself: 10010,

  // 不支持的登录平台
  unsupportedPlatform: 10011,

  // 错误的签名信息, 钱包签名登录用
  invalidSignature: 10012,
  // 签名验证失败
  signatureVerifyFailed: 10013,

  // 验证码获取过于频密， 没到1分钟间隔
  captchaRatelimit: 10014,
  // 验证码错误
  captchaWrong: 10015,
  // 用户已经注册， 不能再次注册
  alreadyRegisted: 10016,
  // 密码错误
  passwordWrong: 10017,
  // 签名过期
  signatureExpired: 10018,
  // GitHub 账号没有绑定，或者没有生成以及保存token以及repo
  githubAccountError: 10019,
  // 用户GitHub repo未留空
  githubRepoAlreadyTaken: 10020,

  // 独立子站未创建，无法进入设置页面，需要走创建步骤
  indieSiteNotReady: 10021,

  // post相关
  postNotFound: 10100,
  postDeleteError: 10101,
  postPublishParamsError: 10102,
  postPublishSignVerifyError: 10103,
  postPublishError: 10104,
  referrerNotExist: 10105,
  referrerNoYourself: 10106,
  postPriceError: 10107,
  postCannotBuy: 10108,
  badFissionFactor: 10109,
  ipfsUploadFailed: 10110,
  ipfsCatchFailed: 10111,
  receiverNotYourself: 10112,
  receiverNotAccept: 10113,
  notYourPost: 10114,
  importPlatformNotSupported: 10115,
  postNoPermission: 10116,
  postNotBookmarked: 10117,
  postBookmarked: 10118,

  // GitHub文章只能转移给GitHub用户
  githubPostTransferLimit: 10119,
  // 文章重复
  postDuplicated: 10120,


  // draft 草稿箱相关
  // 找不到草稿
  draftNotFound: 10201,
  // 无权操作别人的草稿
  notYourDraft: 10202,
  // 草稿已被锁定
  draftIsLocked: 10203,

  // 广告牌相关
  // 获取统计数据时候出错
  getStatisticsError: 10501,
  // 提交广告牌时候出错, 不是正确的用户
  submitAdErrorOfWrongUser: 10502,
  // 提交广告牌时候出错
  submitAdError: 10503,
  // 合约中没有这个广告位
  adNotFound: 10504,
  // 获取广告时候出错
  getAdError: 10505,

  // 积分相关
  // 资料不完整
  pointNoProfile: 10601,
  // 已经领取过积分
  pointAlreadyClaimed: 10602,
  // 领取阅读积分错误
  pointReadError: 10603,
  pointNotEnough: 10604,
  pointCommentSettingError: 10605,

  // geetest
  geetestVerifyFailed: 10700,
  hCaptchaVerifyFailed: 10701,

  tokenAlreadyCreated: 10800,
  tokenSymbolDuplicated: 10801,
  tokenNotExist: 10802,
  exchangeAlreadyCreated: 10803,
  tokenCantMint: 10804,
  tokenNoCreatePermission: 10805,
  exchangeNotEnough: 10806,
  exchangeNotExist: 10807,
  orderHandled: 10900,
  generateGithubTokenError: 11000,
  accountBinded: 11001,
  publishRatelimit: 11002,
  notFountComment: 11100,
  notEnoughPlaces: 11200,
  cannotAddFounder: 11201,
  notCollaborator: 11202,
  // direct trade
  marketNotExist: 11300,
  notInTheFuture: 11400,
  // twitter 相关
  // twitter授权token失效
  invalidTwitterOauthToken: 11500,
  // 未获取 twitter 授权
  twitterNotAuthorized: 11501,
  // 收到了 twitter API 的错误反馈
  twitterApiErrorFeedback: 11502,
  // 推特被锁定
  twitterIsLocked: 11503,
  // 未绑定 twitter
  unboundTwitter: 11504,
  // 未开启推特时间线
  twitterTimelineIsNotTurnedOn: 11505,

  returnObj(lang) {

    const en = {
      lang: 'en',
      success: { code: this.success, message: 'success' },
      failure: { code: this.failure, message: 'failure' },
      paramsError: { code: this.paramsError, message: 'parameter error' },
      unauthorized: { code: this.unauthorized, message: 'unauthorized' },
      postDuplicated: { code: this.postDuplicated, message: 'Post duplicated' },
      serverError: { code: this.serverError, message: 'internal server error' },

      userIntroductionInvalid: { code: this.userIntroductionInvalid, message: 'introduction too long' },
      userNotExist: { code: this.userNotExist, message: 'The user does not exist' },
      emailDuplicated: { code: this.emailDuplicated, message: 'same email already exists' },
      nicknameDuplicated: { code: this.nicknameDuplicated, message: 'same nickname already exists' },
      nicknameInvalid: { code: this.nicknameInvalid, message: 'invalid nickname, maybe it contian symbols or is longer than 12 characters' },

      eosAddressInvalid: { code: this.eosAddressInvalid, message: 'EOS address not avilable on mainnet' },
      ontAddressInvalid: { code: this.ontAddressInvalid, message: 'ONT address has wrong format' },
      authCodeInvalid: { code: this.authCodeInvalid, message: 'Invalid OAuth code' },
      generateTokenError: { code: this.generateTokenError, message: 'Error occurs when generating the token' },
      generateGithubTokenError: { code: this.generateGithubTokenError, message: 'Error occurs when generating the github token' },

      followYourself: { code: this.followYourself, message: 'You can\'t follow yourself' },
      unsupportedPlatform: { code: this.unsupportedPlatform, message: 'Unsupported platform' },
      invalidSignature: { code: this.invalidSignature, message: 'Invalid signature' },
      signatureVerifyFailed: { code: this.signatureVerifyFailed, message: 'Signature verify failed' },
      signatureExpired: { code: this.signatureExpired, message: 'Your signature was expired' },
      githubAccountError: { code: this.githubAccountError, message: 'GitHub account unavailable, please login with GitHub again' },
      githubRepoAlreadyTaken: { code: this.githubRepoAlreadyTaken, message: 'GitHub repo name has been occupied, please change repo name.' },
      indieSiteNotReady: { code: this.indieSiteNotReady, message: 'Indie site haven\'t been created' },

      captchaRatelimit: { code: this.captchaRatelimit, message: 'Captcha rate limit' },
      captchaWrong: { code: this.captchaWrong, message: 'wrong captcha' },
      alreadyRegisted: { code: this.alreadyRegisted, message: 'Already registed' },
      passwordWrong: { code: this.passwordWrong, message: 'wrong password' },

      postNotFound: { code: this.postNotFound, message: 'post not found' },
      postDeleteError: { code: this.postDeleteError, message: 'delete post error' },
      postPublishParamsError: { code: this.postPublishParamsError, message: 'parameters error' },
      postPublishSignVerifyError: { code: this.postPublishSignVerifyError, message: 'signature error' },
      postPublishError: { code: this.postPublishError, message: 'publish error' },
      referrerNotExist: { code: this.referrerNotExist, message: 'referrer does not exist' },
      referrerNoYourself: { code: this.referrerNoYourself, message: 'referrer can not be yourself' },
      postPriceError: { code: this.postPriceError, message: 'the price of the product is wrong' },
      postCannotBuy: { code: this.postCannotBuy, message: 'the post can not buy' },
      badFissionFactor: { code: this.badFissionFactor, message: 'bad fassion factor' },
      ipfsUploadFailed: { code: this.ipfsUploadFailed, message: 'IPFS upload Failed' },
      ipfsCatchFailed: { code: this.ipfsCatchFailed, message: 'IPFS catch Failed' },
      receiverNotYourself: { code: this.receiverNotYourself, message: 'Receiver should not be yourself' },
      receiverNotAccept: { code: this.receiverNotAccept, message: 'This user does not accept' },
      notYourPost: { code: this.notYourPost, message: 'not your post' },
      importPlatformNotSupported: { code: this.importPlatformNotSupported, message: 'Platform not supported' },
      postNoPermission: { code: this.postNoPermission, message: 'You do not have permission to access.' },
      postNotBookmarked: { code: this.postNotBookmarked, message: 'You have not bookmarked this post.' },
      postBookmarked: { code: this.postBookmarked, message: 'You have bookmarked this post.' },
      githubPostTransferLimit: { code: this.githubPostTransferLimit, message: 'Cannot transfer github articles to an none-indie blog user.' },

      draftNotFound: { code: this.draftNotFound, message: 'Cannot find the draft' },
      notYourDraft: { code: this.notYourDraft, message: 'It is not your draft' },

      getStatisticsError: { code: this.getStatisticsError, message: 'Get statistics error' },
      submitAdErrorOfWrongUser: { code: this.submitAdErrorOfWrongUser, message: 'Submit ad error, wrong user' },
      submitAdError: { code: this.submitAdError, message: 'Submit ad error' },
      adNotFound: { code: this.adNotFound, message: 'Ad notfound in contract' },
      getAdError: { code: this.getAdError, message: 'Get ad error' },

      pointNoProfile: { code: this.pointNoProfile, message: 'Please fill in your profile first.' },
      pointAlreadyClaimed: { code: this.pointAlreadyClaimed, message: 'You have already claimed.' },

      geetestVerifyFailed: { code: this.geetestVerifyFailed, message: 'geetest verify failed.' },
      hCaptchaVerifyFailed: { code: this.hCaptchaVerifyFailed, message: 'hCaptcha verify failed.' },
      pointReadError: { code: this.pointReadError, message: 'Get reading points error.' },
      pointNotEnough: { code: this.pointNotEnough, message: 'You do not have enough points. ' },
      pointCommentSettingError: { code: this.pointCommentSettingError, message: 'The post settings error.' },

      tokenAlreadyCreated: { code: this.tokenAlreadyCreated, message: 'You have created the token.' },
      tokenSymbolDuplicated: { code: this.tokenSymbolDuplicated, message: 'The symbol already exists.' },
      tokenNotExist: { code: this.tokenNotExist, message: 'The token does not exist.' },
      exchangeAlreadyCreated: { code: this.exchangeAlreadyCreated, message: 'The exchange pair already exists.' },
      tokenCantMint: { code: this.tokenCantMint, message: 'The token can not mint.' },
      tokenNoCreatePermission: { code: this.tokenNoCreatePermission, message: 'You do not have permission to create a token.' },
      exchangeNotEnough: { code: this.exchangeNotEnough, message: 'There is not enough liquidity.' },
      exchangeNotExist: { code: this.exchangeNotExist, message: 'No swap pairs.' },
      orderHandled: { code: this.orderHandled, message: 'order handle' },
      accountBinded: { code: this.accountBinded, message: 'account already exist, cannot beed binded' },
      publishRatelimit: { code: this.publishRatelimit, message: 'too many requests' },
      notFountComment: { code: this.notFountComment, message: 'not found comment' },
      notEnoughPlaces: { code: this.notEnoughPlaces, message: 'Not enough places' },
      cannotAddFounder: { code: this.cannotAddFounder, message: 'Cannot add founder' },
      notCollaborator: { code: this.notCollaborator, message: 'Not a token collaborator' },
      marketNotExist: { code: this.marketNotExist, message: 'The market does not exist.' },
      notInTheFuture: { code: this.notInTheFuture, message: 'Not in the future, At least two minutes later' },
      invalidTwitterOauthToken: { code: this.invalidTwitterOauthToken, message: 'The Twitter authorization request has expired. Please try again.' },
      twitterNotAuthorized: { code: this.twitterNotAuthorized, message: 'Twitter not authorized' },
      twitterApiErrorFeedback: { code: this.twitterApiErrorFeedback, message: 'Received Twitter API error feedback' },
      twitterIsLocked: { code: this.twitterIsLocked, message: 'The user’s twitter are protected and cannot be viewed' },
      unboundTwitter: { code: this.unboundTwitter, message: 'Unbound Twitter' },
      twitterTimelineIsNotTurnedOn: { code: this.twitterTimelineIsNotTurnedOn, message: 'Twitter timeline is not turned on' },
    };

    const zh = {
      lang: 'zh',
      success: { code: this.success, message: '成功' },
      failure: { code: this.failure, message: '失败' },
      paramsError: { code: this.paramsError, message: '参数错误' },
      unauthorized: { code: this.unauthorized, message: '未授权' },
      postDuplicated: { code: this.postDuplicated, message: '文章已重复' },
      serverError: { code: this.serverError, message: 'internal server error' },

      userIntroductionInvalid: { code: this.userIntroductionInvalid, message: '个性签名不能超过20个字!' },
      userNotExist: { code: this.userNotExist, message: '所请求的用户不存在' },
      emailDuplicated: { code: this.emailDuplicated, message: '已经有相同的email地址存在' },
      nicknameDuplicated: { code: this.nicknameDuplicated, message: '已经有相同的昵称存在' },
      nicknameInvalid: { code: this.nicknameInvalid, message: '昵称不能包含字符,而且长度须小于12个字' },

      eosAddressInvalid: { code: this.eosAddressInvalid, message: 'EOS帐号不存在' },
      ontAddressInvalid: { code: this.ontAddressInvalid, message: 'ONT帐号有误' },
      authCodeInvalid: { code: this.authCodeInvalid, message: '授权信息有误' },
      generateTokenError: { code: this.generateTokenError, message: '无法生成token' },
      generateGithubTokenError: { code: this.generateGithubTokenError, message: '无法生成github token' },

      followYourself: { code: this.followYourself, message: '不能关注自己' },
      unsupportedPlatform: { code: this.unsupportedPlatform, message: '不支持的授权平台' },
      invalidSignature: { code: this.invalidSignature, message: '错误的签名信息' },
      signatureVerifyFailed: { code: this.signatureVerifyFailed, message: '签名信息验证失败' },
      signatureExpired: { code: this.signatureExpired, message: '签名已经过期' },

      captchaRatelimit: { code: this.captchaRatelimit, message: '获取验证码操作次数过多' },
      captchaWrong: { code: this.captchaWrong, message: '验证码错误' },
      alreadyRegisted: { code: this.alreadyRegisted, message: '已经注册，请直接登录' },
      passwordWrong: { code: this.passwordWrong, message: '密码错误' },
      githubAccountError: { code: this.githubAccountError, message: 'GitHub账号信息过期或不存在，请重新用GitHub账号登录' },
      githubRepoAlreadyTaken: { code: this.githubRepoAlreadyTaken, message: 'GitHub repo已经被占用，请在下方修改目标repo名称' },
      indieSiteNotReady: { code: this.indieSiteNotReady, message: '独立子站还未创建' },

      postNotFound: { code: this.postNotFound, message: '帖子不存在' },
      postDeleteError: { code: this.postDeleteError, message: '该文章不存在，或者你无权限删除' },
      postPublishParamsError: { code: this.postPublishParamsError, message: '参数错误' },
      postPublishSignVerifyError: { code: this.postPublishSignVerifyError, message: '签名验证失败' },
      postPublishError: { code: this.postPublishError, message: '发布失败' },
      referrerNotExist: { code: this.referrerNotExist, message: '推荐人不存在' },
      referrerNoYourself: { code: this.referrerNoYourself, message: '推荐人不能是自己' },
      postPriceError: { code: this.postPriceError, message: '商品价格错误' },
      postCannotBuy: { code: this.postCannotBuy, message: '不能购买' },
      badFissionFactor: { code: this.badFissionFactor, message: '不好的裂变系数' },
      ipfsUploadFailed: { code: this.ipfsUploadFailed, message: 'IPFS上传失败' },
      ipfsCatchFailed: { code: this.ipfsCatchFailed, message: 'IPFS获取失败' },
      receiverNotYourself: { code: this.receiverNotYourself, message: '不能转移文章给自己' },
      receiverNotAccept: { code: this.receiverNotAccept, message: '用户不接受转让' },
      notYourPost: { code: this.notYourPost, message: '不能操作别人的文章' },
      importPlatformNotSupported: { code: this.importPlatformNotSupported, message: '不支持导入这个平台的文章' },
      postNoPermission: { code: this.postNoPermission, message: '你没有权限' },
      postNotBookmarked: { code: this.postNotBookmarked, message: '你没有收藏这篇文章' },
      postBookmarked: { code: this.postBookmarked, message: '你已经收藏了这篇文章' },
      githubPostTransferLimit: { code: this.githubPostTransferLimit, message: '不能转移GitHub文章给没有子站的用户' },

      draftNotFound: { code: this.draftNotFound, message: '找不到这篇草稿' },
      notYourDraft: { code: this.notYourDraft, message: '无权操作别人的草稿' },
      draftIsLocked: { code: this.draftIsLocked, message: '草稿已被锁定' },

      getStatisticsError: { code: this.getStatisticsError, message: '获取统计信息出错' },
      submitAdErrorOfWrongUser: { code: this.submitAdErrorOfWrongUser, message: '上传广告牌错误, 不是被认可的用户' },
      submitAdError: { code: this.submitAdError, message: '上传广告牌错误' },
      adNotFound: { code: this.adNotFound, message: '找不到这条广告' },
      getAdError: { code: this.getAdError, message: '获取广告错误' },

      pointNoProfile: { code: this.pointNoProfile, message: '请先完善资料' },
      pointAlreadyClaimed: { code: this.pointAlreadyClaimed, message: '已经获取过积分' },

      geetestVerifyFailed: { code: this.geetestVerifyFailed, message: 'geetest校验失败' },
      hCaptchaVerifyFailed: { code: this.hCaptchaVerifyFailed, message: 'hCaptcha 校验失败' },
      pointReadError: { code: this.pointReadError, message: '获取阅读积分错误' },
      pointNotEnough: { code: this.pointNotEnough, message: '你没有足够的积分' },
      pointCommentSettingError: { code: this.pointCommentSettingError, message: '文章设置错误.' },

      tokenAlreadyCreated: { code: this.tokenAlreadyCreated, message: '你已经创建过token了' },
      tokenSymbolDuplicated: { code: this.tokenSymbolDuplicated, message: 'token简称重名，请更换一个' },
      tokenNotExist: { code: this.tokenNotExist, message: 'token不存在' },
      exchangeAlreadyCreated: { code: this.exchangeAlreadyCreated, message: '交易对已经存在' },
      tokenCantMint: { code: this.tokenCantMint, message: 'token发行已达上限' },
      tokenNoCreatePermission: { code: this.tokenNoCreatePermission, message: '你没有权限发币' },
      exchangeNotEnough: { code: this.exchangeNotEnough, message: '流动性不足' },
      exchangeNotExist: { code: this.exchangeNotExist, message: '没有交易对.' },
      orderHandled: { code: this.orderHandled, message: '订单已处理' },
      accountBinded: { code: this.accountBinded, message: '账号已存在，无法绑定' },
      publishRatelimit: { code: this.publishRatelimit, message: '请求过多' },
      notFountComment: { code: this.notFountComment, message: '回复评论不存在' },
      notEnoughPlaces: { code: this.notEnoughPlaces, message: '名额不足' },
      cannotAddFounder: { code: this.cannotAddFounder, message: '无法添加创始人' },
      notCollaborator: { code: this.notCollaborator, message: '你不是此Fan票的协作者' },
      marketNotExist: { code: this.marketNotExist, message: '市场不存在' },
      notInTheFuture: { code: this.notInTheFuture, message: '请填写未来的时间，至少是两分钟后' },
      invalidTwitterOauthToken: { code: this.invalidTwitterOauthToken, message: 'Twitter 授权申请已过期，请重试。' },
      twitterNotAuthorized: { code: this.twitterNotAuthorized, message: '该账户未获取 Twitter 授权' },
      twitterApiErrorFeedback: { code: this.twitterApiErrorFeedback, message: '收到 Twitter API 错误反馈' },
      twitterIsLocked: { code: this.twitterIsLocked, message: '用户的推文受到保护，无法查看' },
      unboundTwitter: { code: this.unboundTwitter, message: '未绑定 Twitter' },
      twitterTimelineIsNotTurnedOn: { code: this.twitterTimelineIsNotTurnedOn, message: '未开启 Twitter 时间线' },
    };

    let message;

    switch (lang) {
      case 'en':
        message = en;
        break;
      case 'zh':
      case 'zh-Hans':
        message = zh;
        break;
      default:
        message = zh;
        break;
    }

    message.get = function(code) {
      const _this = this;
      const keys = Object.keys(_this);
      let ret;
      for (const key of keys) {
        if (_this[key].code === code) {
          ret = _this[key];
          break;
        }
      }
      return ret;
    };

    return message;
  },

};
