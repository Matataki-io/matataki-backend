'use strict';

const Service = require('egg').Service;

class UtilsService extends Service {
  // ----------------------- 一些工具方法 ---------------
  // 请求方法
  // return [ err, result ]
  async facotryRequst(fn, ...args) {
    try {
      const res = await fn.apply(this, [ ...args ]);
      if (res.data.errcode) {
        return [ res.data, null ];
      }
      return [ null, res.data ];
    } catch (e) {
      this.logger.error('facotryRequst error', e);
      return [ e, null ];
    }
  }
}

module.exports = UtilsService;
