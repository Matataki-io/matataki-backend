'use strict';
const moment = require('moment');
const Service = require('egg').Service;
const consts = require('../consts');

class MineTokenService extends Service {
  // 作者创建一个token
  async create(userId, name, symbol, decimals, logo) {
    let token = await this.getByUserId(userId);
    if (token) {
      return -1;
    }

    token = await this.getBySymbol(symbol);
    if (token) {
      return -2;
    }

    // 是否有权限发币
    if (!await this.hasCreatePermission(userId)) {
      return -3;
    }

    const sql = 'INSERT INTO minetokens(uid, name, symbol, decimals, total_supply, create_time, status, logo) '
      + 'SELECT ?,?,?,?,0,?,1,? FROM DUAL WHERE NOT EXISTS(SELECT 1 FROM minetokens WHERE uid=? OR symbol=?);';
    const result = await this.app.mysql.query(sql,
      [ userId, name, symbol, decimals, moment().format('YYYY-MM-DD HH:mm:ss'), logo, userId, symbol ]);
    return result.insertId;
  }

  async hasCreatePermission(userId) {
    const user = await this.service.user.get(userId);
    const hasMineTokenPermission = consts.userStatus.hasMineTokenPermission;
    // eslint-disable-next-line no-bitwise
    return (user.status & hasMineTokenPermission) === hasMineTokenPermission;
    /* if (user.level > 0) {
      return true;
    }
    return false; */
  }

  async hasMintPermission(tokenId, userId) {
    const sql = 'SELECT 1 FROM minetokens WHERE id=? AND uid=?;';
    const result = await this.app.mysql.query(sql, [ tokenId, userId ]);
    return result;
  }

  // 获取token信息
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

  // 是否可以发行
  async canMint(tokenId, amount, conn) {
    const result = await conn.query('SELECT total_supply FROM minetokens WHERE id=? FOR UPDATE;',
      [ tokenId ]);
    const token = result[0];
    // 上限1亿token
    if (1000000000000 - token.total_supply < amount) {
      return false;
    }
    return true;
  }

  // 铸币
  async mint(userId, to, amount, ip) {
    const token = await this.getByUserId(userId);
    if (!token) {
      return -2;
    }

    const tokenId = token.id;

    const conn = await this.app.mysql.beginTransaction();
    try {
      if (!await this.canMint(tokenId, amount, conn)) {
        await conn.rollback();
        return -3;
      }

      // 唯一索引`uid`, `token_id`
      await conn.query('INSERT INTO assets_minetokens(uid, token_id, amount) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?;',
        [ to, tokenId, amount, amount ]);

      await conn.query('UPDATE minetokens SET total_supply = total_supply + ? WHERE id = ?;',
        [ amount, tokenId ]);

      await conn.query('INSERT INTO assets_minetokens_log(from_uid, to_uid, token_id, amount, create_time, ip, type) VALUES(?,?,?,?,?,?,?);',
        [ 0, to, tokenId, amount, moment().format('YYYY-MM-DD HH:mm:ss'), ip, consts.mineTokenTransferTypes.mint ]);

      await conn.commit();
      return 0;
    } catch (e) {
      await conn.rollback();
      this.logger.error('MineTokenService.mint exception. %j', e);
      return -1;
    }
  }

  async transferFrom(tokenId, from, to, value, ip, type = '', conn) {
    // 有可能在其他事务中调用该方法，如果conn是传进来的，不要在此commit和rollback
    let isOutConn = false;
    if (conn) {
      isOutConn = true;
    } else {
      conn = await this.app.mysql.beginTransaction();
    }

    try {
      const amount = parseInt(value);
      // 减少from的token
      const result = await conn.query('UPDATE assets_minetokens SET amount = amount - ? WHERE uid = ? AND token_id = ? AND amount >= ?;',
        [ amount, from, tokenId, amount ]);
      // 减少from的token失败回滚
      if (result.affectedRows <= 0) {
        if (!isOutConn) {
          await conn.rollback();
        }
        return false;
      }

      // 增加to的token
      await conn.query('INSERT INTO assets_minetokens(uid, token_id, amount) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?;',
        [ to, tokenId, amount, amount ]);

      // 记录日志
      await conn.query('INSERT INTO assets_minetokens_log(from_uid, to_uid, token_id, amount, create_time, ip, type) VALUES(?,?,?,?,?,?,?);',
        [ from, to, tokenId, amount, moment().format('YYYY-MM-DD HH:mm:ss'), ip, type ]);

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

  async getTokenLogs(tokenId, page = 1, pagesize = 20) {
    const sql
      = `SELECT t.token_id, t.from_uid, t.to_uid, t.amount, t.create_time, t.type,
        m.name, m.symbol, m.decimals,
        u1.username AS from_username, u1.nickname AS from_nickname,u1.avatar AS from_avatar, 
        u2.username AS to_username, u2.nickname AS to_nickname,u2.avatar AS to_avatar
        FROM (
          SELECT * FROM assets_minetokens_log WHERE token_id = :tokenId ORDER BY id DESC LIMIT :offset, :limit
        ) t
        JOIN minetokens m ON m.id = t.token_id
        LEFT JOIN users u1 ON t.from_uid = u1.id
        LEFT JOIN users u2 ON t.to_uid = u2.id;
        SELECT count(1) AS count FROM assets_minetokens_log WHERE token_id = :tokenId;`;
    const result = await this.app.mysql.query(sql, {
      offset: (page - 1) * pagesize,
      limit: pagesize,
      tokenId,
    });
    return {
      count: result[1][0].count,
      list: result[0],
    };
  }

  // 查看用户的token日志
  async getUserLogs(userId, page = 1, pagesize = 20) {
    const sql
      = `SELECT t.token_id, t.from_uid, t.to_uid, t.amount, t.create_time, t.type,
        m.name, m.symbol, m.decimals,
        u1.username AS from_username, u1.nickname AS from_nickname,u1.avatar AS from_avatar, 
        u2.username AS to_username, u2.nickname AS to_nickname,u2.avatar AS to_avatar
        FROM (
          SELECT * FROM assets_minetokens_log WHERE from_uid = :userId OR to_uid = :userId ORDER BY id DESC LIMIT :offset, :limit
        ) t
        JOIN minetokens m ON m.id = t.token_id
        LEFT JOIN users u1 ON t.from_uid = u1.id
        LEFT JOIN users u2 ON t.to_uid = u2.id;
        SELECT count(1) AS count FROM assets_minetokens_log WHERE from_uid = :userId OR to_uid = :userId;`;
    const result = await this.app.mysql.query(sql, {
      offset: (page - 1) * pagesize,
      limit: pagesize,
      userId,
    });
    return {
      count: result[1][0].count,
      list: result[0],
    };
  }
}

module.exports = MineTokenService;
