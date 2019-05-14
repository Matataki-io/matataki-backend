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

  // post相关
  postNotFound: 10100,
  postDeleteError: 10101,
  postPublishParamsError: 10102,
  postPublishSignVerifyError: 10103,
  postPublishError: 10104,



  returnObj(lang) {

    const en = {
      lang: 'en',
      success: { code: this.success, message: 'success' },
      failure: { code: this.failure, message: 'failure' },
      paramsError: { code: this.paramsError, message: 'parameter error' },
      unauthorized: { code: this.unauthorized, message: 'unauthorized' },
      serverError: { code: this.exception, message: 'internal server error' },

      userIntroductionInvalid: { code: this.userIntroductionInvalid, message: 'introduction too long or empty' },
      userNotExist: { code: this.userNotExist, message: 'user does not exist' },
      emailDuplicated: { code: this.emailDuplicated, message: 'same email already exists' },
      nicknameDuplicated: { code: this.nicknameDuplicated, message: 'same nickname already exists' },

      postNotFound: { code: this.postNotFound, message: 'post not found' },
      postDeleteError: { code: this.postDeleteError, message: 'delete post error' },
      postPublishParamsError: { code: this.postPublishParamsError, message: 'parameters error' },
      postPublishSignVerifyError: { code: this.postPublishSignVerifyError, message: 'signature error' },
      postPublishError: { code: this.postPublishError, message: 'publish error' },
    };

    const zh = {
      lang: 'zh',
      success: { code: this.success, message: '成功' },
      failure: { code: this.failure, message: '失败' },
      paramsError: { code: this.paramsError, message: '参数错误' },
      unauthorized: { code: this.unauthorized, message: '未授权' },
      serverError: { code: this.exception, message: 'internal server error' },

      userIntroductionInvalid: { code: this.userIntroductionInvalid, message: '请求设置的用户个性签名不在5-20位' },
      userNotExist: { code: this.userNotExist, message: '所请求的用户不存在' },
      emailDuplicated: { code: this.emailDuplicated, message: '已经有相同的email地址存在' },
      nicknameDuplicated: { code: this.nicknameDuplicated, message: '已经有相同的昵称存在' },

      postNotFound: { code: this.postNotFound, message: '帖子不存在' },
      postDeleteError: { code: this.postDeleteError, message: '该文章不存在，或者你无权限删除' },
      postPublishParamsError: { code: this.postPublishParamsError, message: '参数错误' },
      postPublishSignVerifyError: { code: this.postPublishSignVerifyError, message: '签名验证失败' },
      postPublishError: { code: this.postPublishError, message: '发布失败' },
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

    return message;
  },

};
