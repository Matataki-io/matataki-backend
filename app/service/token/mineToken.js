'use strict';
const moment = require('moment');
const Service = require('egg').Service;

class mineTokenService extends Service {
  // 作者创建一个token
  async create(userId, name, symbol, decimals) {
    // todo: 查询是否有发币权限
    const sql = 'INSERT INTO users_minetoken(uid, name, symbol, decimals, total_supply, create_time, status) '
      + 'SELECT ?,?,?,?,0,?,1 FROM DUAL WHERE NOT EXISTS(SELECT 1 FROM users_minetoken WHERE uid=?);';
    const result = await this.app.mysql.query(sql,
      [ userId, name, symbol, decimals, moment().format('YYYY-MM-DD HH:mm:ss'), userId ]);
    // if ( result.affectedRows > 0)
    return result.insertId;
  }

  async hasMintPermission(tokenId, userId) {
    const sql = 'SELECT 1 FROM users_minetoken WHERE id=? AND uid=?;';
    const result = await this.app.mysql.query(sql, [ tokenId, userId ]);
    return result;
  }

  // 获取我的token
  async getMine(userId) {
    const token = await this.app.mysql.get('users_minetoken', { uid: userId });
    return token;
  }

  async canMint(tokenId) {
    // todo，token total_supply有上限等等条件
    return true;
  }

  // 铸币
  async mint(userId, to, amount, ip) {
    const token = await this.getMine(userId);
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
      const sql = 'INSERT INTO assets_minetoken(uid, token_id, amount) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?;';
      await conn.query(sql, [ to, tokenId, amount, amount ]);

      const sqlTotal = 'UPDATE users_minetoken SET total_supply = total_supply + ? WHERE id = ?;';
      await conn.query(sqlTotal, [ amount, tokenId ]);

      const sqlLog = 'INSERT INTO assets_minetoken_log(uid, token_id, amount, create_time, ip) VALUES(?,?,?,?,?);';
      await conn.query(sqlLog,
        [ to, tokenId, amount, moment().format('YYYY-MM-DD HH:mm:ss'), ip ]);

      await conn.commit();
      return 0;

    } catch (e) {
      await conn.rollback();
      this.logger.error('FungibleToken.mint exception. %j', e);
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
      const sqlFrom = 'UPDATE assets_minetoken SET amount = amount - ? WHERE uid = ? AND token_id = ?;';
      const result = await conn.query(sqlFrom, [ value, from, tokenId ]);
      // 减少from的token失败回滚
      if (result.affectedRows <= 0) {
        if (!isOutConn) {
          await conn.rollback();
        }
        return false;
      }
      await conn.query('INSERT INTO assets_minetoken_log(uid, token_id, amount, create_time, ip) VALUES(?,?,?,?,?);',
        [ from, tokenId, -value, moment().format('YYYY-MM-DD HH:mm:ss'), ip ]);

      // 增加to的token
      await conn.query('INSERT INTO assets_minetoken(uid, token_id, amount) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?;',
        [ to, tokenId, value, value ]);
      await conn.query('INSERT INTO assets_minetoken_log(uid, token_id, amount, create_time, ip) VALUES(?,?,?,?,?);',
        [ to, tokenId, value, moment().format('YYYY-MM-DD HH:mm:ss'), ip ]);

      if (!isOutConn) {
        await conn.commit();
      }
      return true;
    } catch (e) {
      if (!isOutConn) {
        await conn.rollback();
      }
      this.logger.error('mineToken.transferFrom exception. %j', e);
      return false;
    }
  }

  async burn(userId, value) {
    // todo
    return false;
  }
}

module.exports = mineTokenService;
