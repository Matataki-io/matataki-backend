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
  // 参数格式错误（由用户引起）
  paramsFormatInvalid: 21,

  // 没有权限
  unauthorized: 401,
  // 内部服务器错误
  serverError: 500,

  // 用户、登录相关
  loginError: 10000,

  // post相关
  postNotFound: 10100,
  postDeleteError: 10101,


  returnObj(lang) {

    const en = {
      lang: 'en',
      success: { code: this.success, message: 'success' },
      failure: { code: this.failure, message: 'failure' },
      paramsError: { code: this.paramsError, message: 'parameter error' },
      paramsFormatInvalid: { code: this.paramsFormatInvalid, message: 'invalid parameter type or length' },
      unauthorized: { code: this.unauthorized, message: 'unauthorized' },
      serverError: { code: this.exception, message: 'internal server error' },

      postNotFound: { code: this.postNotFound, message: 'post not found' },
      postDeleteError: { code: this.postDeleteError, message: 'delete post error' },
    };

    const zh = {
      lang: 'zh',
      success: { code: this.success, message: '成功' },
      failure: { code: this.failure, message: '失败' },
      paramsError: { code: this.paramsError, message: '参数错误' },
      paramsFormatInvalid: { code: this.paramsFormatInvalid, message: '参数的类型或者长度不合法' },
      unauthorized: { code: this.unauthorized, message: '未授权' },
      serverError: { code: this.exception, message: 'internal server error' },

      postNotFound: { code: this.postNotFound, message: '帖子不存在' },
      postDeleteError: { code: this.postDeleteError, message: '该文章不存在，或者你无权限删除' },
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
