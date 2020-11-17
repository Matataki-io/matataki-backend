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
  // 编辑收藏夹
  // TODO
  async edit({ fid, name, brief, status }) {
    try {
      this.logger.info('favorites update start', fid, name, brief, status);
      if (!name || !fid) throw new Error('name or fid not empty');

      const { ctx } = this;
      const uid = ctx.user.id;
      const time = moment().format('YYYY-MM-DD HH:mm:ss');

      const row = {
        name,
        brief,
        status,
        update_time: time,
      };

      const options = {
        where: {
          id: fid,
          uid,
        },
      };
      const result = await this.app.mysql.update('favorites', row, options);
      const updateSuccess = result.affectedRows === 1;
      if (updateSuccess) {
        return {
          code: 0,
        };
      }
      throw new Error('favorites update faild', JSON.stringify(result));

    } catch (error) {
      this.logger.error('FavoritesService update error. %j', error.toString());
      return {
        code: -1,
        message: error.toString(),
      };
    }
  }
  // 删除收藏夹
  // TODO
  async delete({ fid }) {
    this.logger.info('favorites delete start', fid);
    if (!fid) throw new Error('fid not empty');

    const { ctx, app } = this;
    const uid = ctx.user.id;
    const conn = await app.mysql.beginTransaction();
    try {
      await app.mysql.delete('favorites_list', { fid });
      await app.mysql.delete('favorites', { id: fid, uid });
      await conn.commit();
      return {
        code: 0,
      };
    } catch (error) {
      await conn.rollback();
      this.logger.error('FavoritesService update error. %j', error.toString());
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
  async cancelSave({ fid, pid }) {
    try {
      this.logger.info('favorites cancalSave start', fid, pid);

      if (!(fid && pid)) throw new Error('fid and pid not empty');

      const data = {
        fid,
        pid,
      };
      const result = await this.app.mysql.delete('favorites_list', data);
      // console.log('result', result);
      if (result) {
        return {
          code: 0,
        };
      }
      throw new Error(`favorites list delete faild ${JSON.stringify(result)}`);

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
          orders: [[ 'create_time', 'asc' ]],
        });
      } else { // 查询别人的收藏夹 只能看共有的
        results = await this.app.mysql.select('favorites', {
          where: { uid: userId, status: 0 },
          columns: [ 'id', 'name', 'brief', 'status' ],
          orders: [[ 'create_time', 'asc' ]],
        });
      }

      // 有收藏夹才执行 counts sql
      if (results.length) {
        // 生成count sql
        let countSql = '';
        results.forEach(result => {
          countSql += `SELECT COUNT(1) AS count from favorites_list WHERE fid = ${result.id};`;
        });
        const counts = await this.app.mysql.query(countSql);

        // loop set count
        // 只有一条数据的时候 counts 为一维数组，多条的时候 counts 为二维数组
        if (results.length <= 1) {
          results[0].count = counts[0].count || 0;
        } else {
          results.forEach((result, i) => {
            result.count = counts[i][0].count || 0;
          });
        }
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
  // 获取自己的收藏夹列表文章
  async post({ userId, fid }) {
    try {
      this.logger.info('favorites get post start');
      const { ctx } = this;

      if (!userId) {
        throw new Error('favorites post not userId');
      }
      if (!fid) {
        throw new Error('favorites post not fid');
      }

      const uid = ctx.user.id;

      // 查询有没有文件夹
      const favoritesResult = await this.app.mysql.get('favorites', { id: fid, uid: userId });
      if (!favoritesResult) {
        throw new Error(`favorites doesn't exist ${fid} ${userId}`);
      }

      // console.log('favoritesResult', favoritesResult);
      // 不是公开文章并且没有登陆
      if (favoritesResult !== 0 && !uid) {
        throw new Error('favorites Permission denied');
      }

      // 查询用户信息
      const userResult = await this.app.mysql.select('users', { // 搜索 post 表
        where: { id: userId },
        columns: [ 'username', 'nickname' ],
        limit: 1,
        offset: 0,
      });
      // console.log('userResult', userResult);

      // 查询文章列表
      const postsSql = 'SELECT f.fid, f.pid, f.create_time, p.title, p.short_content, p.cover from favorites_list f LEFT JOIN posts p ON f.pid = p.id  WHERE f.fid = ? ORDER BY create_time DESC;';
      const postsResults = await this.app.mysql.query(postsSql, fid);
      // console.log('postsResults', postsResults);

      // 处理邮箱昵称
      const emailMask = this.ctx.helper.emailMask;

      //  查询数量
      const countSql = 'SELECT COUNT(1) AS count from favorites_list WHERE fid = ?;';
      const count = await this.app.mysql.query(countSql, fid);
      // console.log('count', count);

      const info = {
        id: favoritesResult.id,
        uid: favoritesResult.uid,
        name: favoritesResult.name,
        brief: favoritesResult.brief,
        status: favoritesResult.status,
        username: emailMask(userResult[0].username),
        nickname: userResult[0].nickname,
      };

      return {
        code: 0,
        data: {
          info,
          count: count[0].count || 0,
          list: postsResults,
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
  // 获取文章和自己的收藏夹关系
  // TODO
  async related({ pid }) {
    try {
      this.logger.info('favorites related start', pid);
      // 需要文章 id
      if (!pid) {
        throw new Error('pid not empty');
      }

      const { ctx } = this;
      const uid = ctx.user.id;
      // 需要用户 id
      if (!uid) {
        throw new Error('favorites related not uid');
      }

      // 查询所有收藏夹
      const favResults = await this.app.mysql.select('favorites', {
        where: { uid },
        columns: [ 'id', 'name', 'status' ],
        orders: [[ 'create_time', 'asc' ]],
      });

      // 有收藏夹才执行
      if (favResults.length) {
        // 生成count sql
        let countSql = '';
        favResults.forEach(result => {
          countSql += `SELECT COUNT(1) AS count from favorites_list WHERE fid = ${result.id};`;
        });
        const counts = await this.app.mysql.query(countSql);

        // loop set count
        // 只有一条数据的时候 counts 为一维数组，多条的时候 counts 为二维数组
        if (favResults.length <= 1) {
          favResults[0].count = counts[0].count || 0;
        } else {
          favResults.forEach((result, i) => {
            result.count = counts[i][0].count || 0;
          });
        }

        // 查询文章在收藏夹的数量来判断是否收藏
        let countsSql = '';
        favResults.forEach(fav => {
          countsSql += `SELECT COUNT(1) AS count FROM favorites_list WHERE fid = ${fav.id} AND pid = ${pid};`;
        });
        const countsResult = await this.app.mysql.query(countsSql);

        // console.log('favResults', favResults);
        // console.log('countsResult', countsResult);

        // 只有一条数据的时候 counts 为一维数组，多条的时候 counts 为二维数组
        if (favResults.length <= 1) {
          favResults[0].related = countsResult[0].count >= 1 ? 1 : 0;
        } else {
          favResults.forEach((fav, i) => {
            // 0 没有收藏
            // 1 收藏了
            fav.related = countsResult[i][0].count >= 1 ? 1 : 0;
          });
        }
      }

      return {
        code: 0,
        data: {
          list: favResults,
        },
      };
    } catch (error) {
      this.logger.error('FavoritesService related error. %j', error.toString());
      return {
        code: -1,
        message: error.toString(),
      };
    }
  }
}

module.exports = FavoritesService;
