'use strict';
const Service = require('egg').Service;
const moment = require('moment');

/**
 * 收藏夹
 * @class FavoritesService
 * @extends {Service}
 */
class FavoritesService extends Service {

  // 创建收藏夹
  // TODO
  async create({ name, brief, status }) {
    try {
      this.logger.info('favorites create start', name, brief, status);

      if (!name) throw new Error('name not empty');

      const { ctx } = this;
      const uid = ctx.user.id;
      const time = moment().format('YYYY-MM-DD HH:mm:ss');
      const data = {
        uid,
        name,
        brief,
        status,
        create_time: time,
        update_time: time,
      };
      const result = await this.app.mysql.insert('favorites', data);
      const insertSuccess = result.affectedRows === 1;
      if (insertSuccess) {
        return {
          code: 0,
        };
      }
      throw new Error('favorites insert faild', JSON.stringify(result));

    } catch (error) {
      this.logger.error('FavoritesService create error. %j', error.toString());
      return {
        code: -1,
        message: error.toString(),
      };
    }
  }

  // 保存到收藏夹
  // TODO
  async save({ fid, pid }) {
    try {
      this.logger.info('favorites save start', fid, pid);

      if (!(fid && pid)) throw new Error('fid and pid not empty');

      const favoritesResult = await this.app.mysql.get('favorites_list', { fid, pid });
      if (favoritesResult) {
        throw new Error(`favorites list existed ${fid} ${pid}`);
      }

      const time = moment().format('YYYY-MM-DD HH:mm:ss');
      const data = {
        fid,
        pid,
        create_time: time,
      };
      const result = await this.app.mysql.insert('favorites_list', data);
      const insertSuccess = result.affectedRows === 1;
      if (insertSuccess) {
        return {
          code: 0,
        };
      }
      throw new Error(`favorites list insert faild ${JSON.stringify(result)}`);

    } catch (error) {
      this.logger.error('FavoritesService save error. %j', error.toString());
      return {
        code: -1,
        message: error.toString(),
      };
    }
  }

  // 获取自己的收藏夹列表
  // TODO
  // 1. 查询收藏数量
  async list({ userId }) {
    try {
      this.logger.info('favorites get list start');
      const { ctx } = this;

      if (!userId) {
        throw new Error('favorites list not userId');
      }

      let results = [];
      const uid = ctx.user.id;

      // 查询自己的
      if (uid) {
        results = await this.app.mysql.select('favorites', {
          where: { uid },
          columns: [ 'id', 'name', 'brief', 'status' ],
          orders: [[ 'create_time', 'desc' ]],
        });
      } else { // 查询别人的收藏夹 只能看共有的
        results = await this.app.mysql.select('favorites', {
          where: { uid: userId, status: 0 },
          columns: [ 'id', 'name', 'brief', 'status' ],
          orders: [[ 'create_time', 'desc' ]],
        });
      }

      return {
        code: 0,
        data: {
          list: results,
        },
      };

    } catch (error) {
      this.logger.error('FavoritesService list error. %j', error.toString());
      return {
        code: -1,
        message: error.toString(),
      };
    }
  }
}

module.exports = FavoritesService;
