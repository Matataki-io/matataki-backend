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

  // draft 草稿箱相关
  // 找不到草稿
  draftNotFound: 10201,
  // 无权操作别人的草稿
  notYourDraft: 10202,

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

  returnObj(lang) {

    const en = {
      lang: 'en',
      success: { code: this.success, message: 'success' },
      failure: { code: this.failure, message: 'failure' },
      paramsError: { code: this.paramsError, message: 'parameter error' },
      unauthorized: { code: this.unauthorized, message: 'unauthorized' },
      serverError: { code: this.serverError, message: 'internal server error' },

      userIntroductionInvalid: { code: this.userIntroductionInvalid, message: 'introduction too long' },
      userNotExist: { code: this.userNotExist, message: 'user does not exist' },
      emailDuplicated: { code: this.emailDuplicated, message: 'same email already exists' },
      nicknameDuplicated: { code: this.nicknameDuplicated, message: 'same nickname already exists' },
      nicknameInvalid: { code: this.nicknameInvalid, message: 'invalid nickname, maybe it contian symbols or is longer than 12 characters' },

      eosAddressInvalid: { code: this.eosAddressInvalid, message: 'EOS address not avilable on mainnet' },
      ontAddressInvalid: { code: this.ontAddressInvalid, message: 'ONT address has wrong format' },
      authCodeInvalid: { code: this.authCodeInvalid, message: 'Invalid OAuth code' },
      generateTokenError: { code: this.generateTokenError, message: 'Error occurs when generating the token' },

      followYourself: { code: this.followYourself, message: 'You can\'t follow yourself' },
      unsupportedPlatform: { code: this.unsupportedPlatform, message: 'Unsupported platform' },
      invalidSignature: { code: this.invalidSignature, message: 'Invalid signature' },
      signatureVerifyFailed: { code: this.signatureVerifyFailed, message: 'Signature verify failed' },

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

      draftNotFound: { code: this.draftNotFound, message: 'Cannot find the draft' },
      notYourDraft: { code: this.notYourDraft, message: 'It is not your draft' },

      getStatisticsError: { code: this.getStatisticsError, message: 'Get statistics error' },
      submitAdErrorOfWrongUser: { code: this.submitAdErrorOfWrongUser, message: 'Submit ad error, wrong user' },
      submitAdError: { code: this.submitAdError, message: 'Submit ad error' },
      adNotFound: { code: this.adNotFound, message: 'Ad notfound in contract' },
      getAdError: { code: this.getAdError, message: 'Get ad error' },
    };

    const zh = {
      lang: 'zh',
      success: { code: this.success, message: '成功' },
      failure: { code: this.failure, message: '失败' },
      paramsError: { code: this.paramsError, message: '参数错误' },
      unauthorized: { code: this.unauthorized, message: '未授权' },
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

      followYourself: { code: this.followYourself, message: '不能关注自己' },
      unsupportedPlatform: { code: this.unsupportedPlatform, message: '不支持的授权平台' },
      invalidSignature: { code: this.invalidSignature, message: '错误的签名信息' },
      signatureVerifyFailed: { code: this.signatureVerifyFailed, message: '签名信息验证失败' },

      captchaRatelimit: { code: this.captchaRatelimit, message: '获取验证码操作次数过多' },
      captchaWrong: { code: this.captchaWrong, message: '验证码错误' },
      alreadyRegisted: { code: this.alreadyRegisted, message: '已经注册，请直接登录' },
      passwordWrong: { code: this.passwordWrong, message: '密码错误' },

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

      draftNotFound: { code: this.draftNotFound, message: '找不到这篇草稿' },
      notYourDraft: { code: this.notYourDraft, message: '无权操作别人的草稿' },

      getStatisticsError: { code: this.getStatisticsError, message: '获取统计信息出错' },
      submitAdErrorOfWrongUser: { code: this.submitAdErrorOfWrongUser, message: '上传广告牌错误, 不是被认可的用户' },
      submitAdError: { code: this.submitAdError, message: '上传广告牌错误' },
      adNotFound: { code: this.adNotFound, message: '找不到这条广告' },
      getAdError: { code: this.getAdError, message: '获取广告错误' },
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
