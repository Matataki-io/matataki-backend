'use strict';
const Service = require('egg').Service;
const moment = require('moment');

class MineTokenApplicationService extends Service {

  // 创建一条申请
  async create(data) {
    const { app } = this;
    const conn = await app.mysql.beginTransaction();

    try {

      const result = await conn.insert('minetokens_application', data);
      await conn.commit();
      return (result.affectedRows === 1) ? { code: 0 } : { code: -1 };

    } catch (err) {
      console.log('minetoken application create error', err);
      await conn.rollback();
      return { code: -1 };
    }
  }

  // 更新一条申请
  async update(data) {
    const { app } = this;
    const conn = await app.mysql.beginTransaction();

    try {

      const result = await conn.update('minetokens_application', data);
      await conn.commit();
      return (result.affectedRows === 1) ? { code: 0 } : { code: -1 };

    } catch (err) {
      console.log('minetoken application create error', err);
      await conn.rollback();
      return { code: -1 };
    }
  }

  // fan票申请
  async index(type, logo, name, symbol, tag) {
    const { ctx } = this;
    const uid = ctx.user.id;
    const time = moment().format('YYYY-MM-DD HH:mm:ss');
    try {

      const applicationResult = await this.app.mysql.get('minetokens_application', { uid });
      console.log('applicationResult', applicationResult);

      // 除开创建以外 提交 取消 重新申请没有记录数据直接返回
      if (type !== 'draft' && !applicationResult) {
        return { code: -1 };
      }

      if (type === 'draft') {

        if (applicationResult) {

          // 如果已经提交 申请中||申请成功||申请失败 就不能再修改了
          if (applicationResult.status !== 1) {
            const errorMsg = {
              0: '申请成功',
              2: '申请中',
              3: '申请失败',
            };
            return { code: -1, message: errorMsg[applicationResult.status] || '失败' };
          }

          const data = {
            id: applicationResult.id,
            logo,
            name,
            symbol,
            tag: tag.join(','),
            update_time: time,
          };
          return await this.update(data);
        }


        const data = {
          uid,
          logo,
          name,
          symbol,
          tag: tag.join(','),
          decimals: 4,
          total_supply: 1000 * (10 ** 4),
          status: 1,
          create_time: time,
          update_time: time,
        };
        return await this.create(data);

      } else if (type === 'submit') {

        const data = {
          id: applicationResult.id,
          logo,
          name,
          symbol,
          tag: tag.join(','),
          status: 2,
          update_time: time,
        };
        return await this.update(data);

      } else if (type === 'reset') {
        const data = {
          id: applicationResult.id,
          logo,
          name,
          symbol,
          tag: tag.join(','),
          status: 1,
          update_time: time,
        };
        return await this.update(data);
      }
      return { code: -1, message: '非法参数' };

    } catch (e) {
      console.log('minetoken application error', e);
      return { code: -1 };
    }


  }

  // 调研表单提交
  async survey(
    introduction, age, number,
    career, field, platform,
    nickname, link, interview,
    know, publish, info,
    promote
  ) {
    const { ctx, app } = this;
    const uid = ctx.user.id;
    const time = moment().format('YYYY-MM-DD HH:mm:ss');
    const conn = await app.mysql.beginTransaction();

    try {

      const applicationResult = await conn.get('minetokens_survey', { uid });
      console.log('applicationResult', applicationResult);

      const data = {
        uid,
        introduction,
        age,
        number,
        career,
        field,
        platform,
        nickname,
        link,
        interview,
        know,
        publish,
        info,
        promote,
      };

      if (applicationResult) {

        data.id = applicationResult.id;
        data.update_time = time;

        const result = await conn.update('minetokens_survey', data);
        await conn.commit();

        return (result.affectedRows === 1) ? { code: 0 } : { code: -1 };
      }

      data.create_time = time;
      data.update_time = time;

      const result = await conn.insert('minetokens_survey', data);
      await conn.commit();

      return (result.affectedRows === 1) ? { code: 0 } : { code: -1 };

    } catch (e) {
      console.log('minetoken survey error', e);
      await conn.rollback();
      return { code: -1 };
    }

  }
}
module.exports = MineTokenApplicationService;
