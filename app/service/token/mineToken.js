'use strict';
const moment = require('moment');
const Service = require('egg').Service;

class MineTokenService extends Service {
  // 作者创建一个token
  async create(userId, name, symbol, decimals) {
    let token = await this.getByUserId(userId);
    if (token) {
      return -1;
    }

    token = await this.getBySymbol(symbol);
    if (token) {
      return -2;
    }

    // todo: 查询是否有发币权限
    const sql = 'INSERT INTO minetokens(uid, name, symbol, decimals, total_supply, create_time, status) '
      + 'SELECT ?,?,?,?,0,?,1 FROM DUAL WHERE NOT EXISTS(SELECT 1 FROM minetokens WHERE uid=? OR symbol=?);';
    const result = await this.app.mysql.query(sql,
      [ userId, name, symbol, decimals, moment().format('YYYY-MM-DD HH:mm:ss'), userId, symbol ]);
    // if ( result.affectedRows > 0)
    return result.insertId;
  }

  async hasMintPermission(tokenId, userId) {
    const sql = 'SELECT 1 FROM minetokens WHERE id=? AND uid=?;';
    const result = await this.app.mysql.query(sql, [ tokenId, userId ]);
    return result;
  }

  // 获取token
  async get(tokenId) {
    const token = await this.app.mysql.get('minetokens', { id: tokenId });
    return token;
  }

  // 获取token
  async getBySymbol(symbol) {
    const token = await this.app.mysql.get('minetokens', { symbol });
    return token;
  }

  // 获取token
  async getByUserId(userId) {
    const token = await this.app.mysql.get('minetokens', { uid: userId });
    return token;
  }

  async canMint(tokenId) {
    // todo，token total_supply有上限等等条件
    return true;
  }

  // 铸币
  async mint(userId, to, amount, ip) {
    const token = await this.getByUserId(userId);
    if (!token) {
      return -2;
    }

    const tokenId = token.id;

    if (!this.canMint(tokenId)) {
      return -3;
    }

    const conn = await this.app.mysql.beginTransaction();
    try {
      // 唯一索引`uid`, `token_id`
      const sql = 'INSERT INTO assets_minetokens(uid, token_id, amount) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?;';
      await conn.query(sql, [ to, tokenId, amount, amount ]);

      const sqlTotal = 'UPDATE minetokens SET total_supply = total_supply + ? WHERE id = ?;';
      await conn.query(sqlTotal, [ amount, tokenId ]);

      const sqlLog = 'INSERT INTO assets_minetokens_log(from_uid, to_uid, token_id, amount, create_time, ip) VALUES(?,?,?,?,?,?);';
      await conn.query(sqlLog,
        [ 0, to, tokenId, amount, moment().format('YYYY-MM-DD HH:mm:ss'), ip ]);

      await conn.commit();
      return 0;
    } catch (e) {
      await conn.rollback();
      this.logger.error('MineTokenService.mint exception. %j', e);
      return -1;
    }
  }

  async transferFrom(tokenId, from, to, value, ip, conn) {
    // 有可能在其他事务中调用该方法，如果conn是传进来的，不要此commit和rollback
    let isOutConn = false;
    if (conn) {
      isOutConn = true;
    } else {
      conn = await this.app.mysql.beginTransaction();
    }

    try {
      // 减少from的token
      const sqlFrom = 'UPDATE assets_minetokens SET amount = amount - ? WHERE uid = ? AND token_id = ? AND amount >= ?;';
      const result = await conn.query(sqlFrom, [ value, from, tokenId, value ]);
      // 减少from的token失败回滚
      if (result.affectedRows <= 0) {
        if (!isOutConn) {
          await conn.rollback();
        }
        return false;
      }

      // 增加to的token
      await conn.query('INSERT INTO assets_minetokens(uid, token_id, amount) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?;',
        [ to, tokenId, value, value ]);

      // 记录日志
      await conn.query('INSERT INTO assets_minetokens_log(from_uid, to_uid, token_id, amount, create_time, ip) VALUES(?,?,?,?,?,?);',
        [ from, to, tokenId, value, moment().format('YYYY-MM-DD HH:mm:ss'), ip ]);

      if (!isOutConn) {
        await conn.commit();
      }
      return true;
    } catch (e) {
      if (!isOutConn) {
        await conn.rollback();
      }
      this.logger.error('MineTokenService.transferFrom exception. %j', e);
      return false;
    }
  }

  async burn(userId, value) {
    // todo
    return false;
  }

  async balanceOf(userId, tokenId) {
    const balance = await this.app.mysql.get('assets_minetokens', { uid: userId, token_id: tokenId });

    if (!balance) {
      return 0;
    }

    return balance.amount;
  }
}

module.exports = MineTokenService;
