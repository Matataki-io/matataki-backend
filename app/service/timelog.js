const Service = require('egg').Service;

class TimeLogService extends Service {
  /**
   * 显示时间
   * @param {string} pointName 时间点的名字
   * @param {number} startFrom 函数一开始的时间戳，直接用 `Date.now()`
   */
  log(pointName, startFrom) {
    this.logger.info(`${pointName}: ${Date.now() - startFrom} ms from the start`);
  }
}

module.exports = TimeLogService;
