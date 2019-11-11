'use strict';
const moment = require('moment');
const Service = require('egg').Service;
const consts = require('../consts');

class MineTokenService extends Service {

  constructor(ctx, app) {
    super(ctx, app);
    this.app.mysql.queryFromat = function(query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function(txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    };
  }

  // 作者创建一个token
  async create(userId, name, symbol, decimals, logo, brief, introduction) {
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

    // 与主流币种重名
    if (this.config.token.maintokens.indexOf(symbol.toUpperCase()) >= 0) {
      return -2;
    }

    const sql = 'INSERT INTO minetokens(uid, name, symbol, decimals, total_supply, create_time, status, logo, brief, introduction) '
      + 'SELECT ?,?,?,?,0,?,1,?,?,? FROM DUAL WHERE NOT EXISTS(SELECT 1 FROM minetokens WHERE uid=? OR symbol=?);';
    const result = await this.app.mysql.query(sql,
      [ userId, name, symbol, decimals, moment().format('YYYY-MM-DD HH:mm:ss'), logo, brief, introduction, userId, symbol ]);
    return result.insertId;
  }

  // 更新粉丝币信息
  async update(userId, tokenId, name, logo, brief, introduction) {
    const row = {};
    row.name = name;
    row.logo = logo;
    row.brief = brief;
    row.introduction = introduction;

    const options = {
      where: { uid: userId, id: tokenId },
    };

    const result = await this.app.mysql.update('minetokens', row, options);
    return result.affectedRows > 0;
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

  // 保存网址、社交媒体账号
  async saveResources(userId, tokenId, websites, socials) {
    const token = await this.getByUserId(userId);
    if (token.id !== tokenId) {
      return -1;
    }

    const conn = await this.app.mysql.beginTransaction();
    try {
      await conn.query('DELETE FROM minetoken_resources WHERE token_id = ?;', [ tokenId ]);

      for (const website of websites) {
        await conn.insert('minetoken_resources', {
          token_id: tokenId,
          type: 'website',
          content: website,
          create_time: moment().format('YYYY-MM-DD HH:mm:ss'),
        });
      }

      for (const social of socials) {
        if (consts.socialTypes.indexOf(social.type) >= 0) {
          await conn.insert('minetoken_resources', {
            token_id: tokenId,
            type: social.type,
            content: social.content,
            create_time: moment().format('YYYY-MM-DD HH:mm:ss'),
          });
        }
      }

      await conn.commit();
      return 0;
    } catch (e) {
      await conn.rollback();
      this.ctx.logger.error(e);
      return -1;
    }
  }

  // 获取网址、社交媒体账号
  async getResources(tokenId) {
    const result = await this.app.mysql.query('SELECT type, content FROM minetoken_resources WHERE token_id = ?;', [ tokenId ]);
    // const websites = result.filter(row => row.type === 'website');
    // const socials = result.filter(row => row.type !== 'website');;
    const websites = [];
    const socials = [];
    if (result) {
      for (const row of result) {
        if (row.type === 'website') {
          websites.push(row.content);
        } else {
          socials.push(row);
        }
      }
    }

    return {
      websites,
      socials,
    };
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
    if (from === to) {
      return false;
    }

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
  async getUserLogs(tokenId, userId, page = 1, pagesize = 20) {
    const sql
      = `SELECT t.token_id, t.from_uid, t.to_uid, t.amount, t.create_time, t.type,
        m.name, m.symbol, m.decimals,
        u1.username AS from_username, u1.nickname AS from_nickname,u1.avatar AS from_avatar,
        u2.username AS to_username, u2.nickname AS to_nickname,u2.avatar AS to_avatar
        FROM (
          SELECT * FROM assets_minetokens_log WHERE token_id = :tokenId AND (from_uid = :userId OR to_uid = :userId) ORDER BY id DESC LIMIT :offset, :limit
        ) t
        JOIN minetokens m ON m.id = t.token_id
        LEFT JOIN users u1 ON t.from_uid = u1.id
        LEFT JOIN users u2 ON t.to_uid = u2.id;
        SELECT count(1) AS count FROM assets_minetokens_log WHERE token_id = :tokenId AND (from_uid = :userId OR to_uid = :userId);`;
    const result = await this.app.mysql.query(sql, {
      offset: (page - 1) * pagesize,
      limit: pagesize,
      userId,
      tokenId,
    });
    return {
      count: result[1][0].count,
      list: result[0],
    };
  }

  async getHoldLiquidity(userId, page = 1, pagesize = 10) {
    const sql = `
      SELECT t1.token_id, t1.liquidity_balance, t1.create_time,
        t2.total_supply,
        t3.name, t3.symbol, decimals, t3.logo,
        t4.username, t4.nickname
      FROM exchange_balances AS t1
      JOIN exchanges AS t2 USING (token_id)
      JOIN minetokens AS t3 ON t1.token_id = t3.id
      JOIN users as t4 ON t3.uid = t4.id
      WHERE t1.uid = :userId
      LIMIT :offset, :limit;
      SELECT count(1) AS count FROM exchange_balances WHERE uid = :userId;`;
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

  async getLiquidityLogs(tokenId, userId = null, page = 1, pagesize = 10) {
    let sql = `
      SELECT t1.id, t1.uid, t1.token_id,t1.cny_amount,t1.token_amount,t1.liquidity,t1.create_time,
      t2.name,t2.symbol,t2.decimals,t2.total_supply,t2.logo,
      t3.username, t3.nickname
      FROM exchange_liquidity_logs AS t1
      JOIN minetokens AS t2 ON t1.token_id = t2.id
      JOIN users as t3 ON t2.uid = t3.id
      `;
    let params = {
      tokenId,
    };
    if (userId) {
      sql += `
        WHERE t1.uid = :userId AND t1.token_id = :tokenId
        ORDER BY t1.create_time DESC
        LIMIT :offset, :limit;
        SELECT count(1) AS count FROM exchange_liquidity_logs
        WHERE uid = :userId AND token_id = :tokenId;`;
      params = {
        ...params,
        userId,
      };
    } else {
      sql += `
        WHERE t1.token_id = :tokenId
        ORDER BY t1.create_time DESC
        LIMIT :offset, :limit;
        SELECT count(1) AS count FROM exchange_liquidity_logs
        WHERE token_id = :tokenId;`;
    }

    const result = await this.app.mysql.query(sql, {
      offset: (page - 1) * pagesize,
      limit: pagesize,
      ...params,
    });
    return {
      count: result[1][0].count,
      list: result[0],
    };
  }

  async getPurchaseLog(tokenId, userId = null, page = 1, pagesize = 100) {
    let sql = `
      SELECT t1.*,
      CASE WHEN t1.sold_token_id = :tokenId
      THEN 'sell' ELSE 'buy'
      END 'direction'
      FROM exchange_purchase_logs AS t1
      WHERE (t1.sold_token_id = :tokenId OR t1.bought_token_id = :tokenId)`;
    let params = {
      tokenId,
    };
    // 如果useId存在
    if (userId) {
      sql += `
        AND (uid = :userId OR recipient = :userId)
        ORDER BY create_time DESC LIMIT :offset, :limit;`;
      params = {
        ...params,
        userId,
      };
    } else {
      sql += ' ORDER BY create_time DESC LIMIT :offset, :limit;';
    }
    const result = await this.app.mysql.query(sql, {
      offset: (page - 1) * pagesize,
      limit: pagesize,
      ...params,
    });
    for (let i = 0; i < result.length; i++) {
      if (result[i].sold_token_id === 0) {
        result[i].cny_amount = result[i].sold_amount;
        result[i].token_amount = result[i].bought_amount;
      } else {
        result[i].cny_amount = result[i].bought_amount;
        result[i].token_amount = result[i].sold_amount;
      }
    }
    return result;
  }

  async getUserListOfLiquidity(tokenId, page = 1, pagesize = 10) {
    const sql = `
      SELECT t1.token_id, t1.liquidity_balance, t1.create_time,
        t2.total_supply,
        t3.name, t3.symbol, decimals, t3.logo,
        t4.username, t4.nickname
      FROM exchange_balances AS t1
      JOIN exchanges AS t2 USING (token_id)
      JOIN minetokens AS t3 ON t1.token_id = t3.id
      JOIN users as t4 ON t3.uid = t4.id
      WHERE token_id = :tokenId
      LIMIT :offset, :limit;
      SELECT count(1) AS count FROM exchange_balances WHERE token_id = :tokenId;`;
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
}

module.exports = MineTokenService;
