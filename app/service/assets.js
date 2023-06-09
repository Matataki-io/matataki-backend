'use strict';
const moment = require('moment');
const consts = require('./consts');
const Service = require('egg').Service;

// 其他公链token、人民币资产，老的代码先不整合，主要是处理人民币资产
class AssetsService extends Service {

  // 从外部充值进来
  async recharge(userId, symbol, amount, conn) {
    const platform = symbol.toLowerCase();
    // 2. 更新资产余额
    await conn.query(
      'INSERT INTO assets(uid, contract, symbol, amount, decimals, platform) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?',
      [ userId, '', symbol, amount, 4, platform, amount ]
    );
    // 记录log
    await conn.query('INSERT INTO assets_change_log(uid, signid, contract, symbol, amount, platform, type, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [ userId, 0, '', symbol, amount, platform,
        consts.assetTypes.recharge,
        moment().format('YYYY-MM-DD HH:mm:ss') ]
    );
  }

  // 转移资产
  async transferFrom(symbol, from, to, value, conn, memo = '') {
    if (from === to) {
      return false;
    }
    const checkToUser = await this.service.user.get(to);
    if (!checkToUser) return false;

    // 有可能在其他事务中调用该方法，如果conn是传进来的，不要此commit和rollback
    let isOutConn = false;
    if (conn) {
      isOutConn = true;
    } else {
      conn = await this.app.mysql.beginTransaction();
    }

    try {
      const amount = parseInt(value);
      const platform = symbol.toLowerCase();
      // 减少from的token
      const result = await conn.query('UPDATE assets SET amount = amount - ? WHERE uid = ? AND symbol = ? AND amount >= ?;',
        [ amount, from, symbol, amount ]);
      // 减少from的token失败回滚
      if (result.affectedRows <= 0) {
        if (!isOutConn) {
          await conn.rollback();
        }
        return false;
      }
      // 记录log
      const fromLogResult = await conn.query('INSERT INTO assets_change_log(uid, signid, contract, symbol, amount, platform, type, create_time, object_id, memo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [ from, 0, '', symbol, -amount, platform,
          consts.assetTypes.transferOut, // 'sign income'
          moment().format('YYYY-MM-DD HH:mm:ss'),
          to, memo,
        ]
      );

      // 增加to的token
      await conn.query(
        'INSERT INTO assets(uid, contract, symbol, amount, platform) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?',
        [ to, '', symbol, amount, platform, amount ]
      );
      // 记录log
      const toLogResult = await conn.query('INSERT INTO assets_change_log(uid, signid, contract, symbol, amount, platform, type, create_time, object_id, memo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [ to, 0, '', symbol, amount, platform,
          consts.assetTypes.transferIn, // 'sign income'
          moment().format('YYYY-MM-DD HH:mm:ss'),
          from, memo,
        ]
      );

      if (!isOutConn) {
        await conn.commit();
      }
      return {
        fromLogId: fromLogResult.insertId,
        toLogId: toLogResult.insertId,
      };
    } catch (e) {
      if (!isOutConn) {
        await conn.rollback();
      }
      this.logger.error('AssetsService.transferFrom exception. %j', e);
      return false;
    }
  }

  // 提现，从本系统提走
  async withdraw() {

  }

  async balanceOf(userId, symbol) {
    const balance = await this.app.mysql.get('assets', { uid: userId, symbol });

    if (!balance) {
      return 0;
    }

    return balance.amount;
  }

  /** 根据id列表获取转账内容 */
  async getByIdArray(idList) {
    const logs = await this.app.mysql.query(`
      SELECT
        a.id,
        a.contract,
        a.symbol,
        a.amount,
        a.type,
        a.create_time,
        a.signid,
        a.trx,
        a.toaddress,
        a.memo,
        a.status,
        b.title
      FROM
        assets_change_log a
        LEFT JOIN posts b ON a.signid = b.id
      WHERE a.id IN(:idList);
    `,
      { idList }
    );
    if (logs === null) return [];
    return logs;
  }

}

module.exports = AssetsService;
