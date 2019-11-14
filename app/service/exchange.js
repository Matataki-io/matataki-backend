'use strict';
const Service = require('egg').Service;
const moment = require('moment');
const DEADLINE = 300; // 超时时间300秒

class ExchangeService extends Service {
  async createOrder(order) {
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    const deadline = parseInt(moment().format('X')) + DEADLINE; // 设置unix时间戳
    const result = await this.app.mysql.query(
      'INSERT INTO exchange_orders(uid, token_id, cny_amount, token_amount, type, trade_no, openid, status, create_time, deadline, min_liquidity, max_tokens, min_tokens, recipient, ip, pay_cny_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [ order.uid, order.token_id, order.cny_amount, order.token_amount, order.type, order.trade_no, order.openid, order.status, now, deadline, order.min_liquidity, order.max_tokens, order.min_tokens, order.recipient, order.ip, order.pay_cny_amount ]
    );
    const createSuccess = (result.affectedRows !== 0);
    return createSuccess;
  }
  // 根据订单号查询
  async getOrderBytradeNo(trade_no) {
    const order = await this.app.mysql.get('exchange_orders', { trade_no });
    return order;
  }
  async updateStatus(trade_no, status) {
    status = parseInt(status);
    const statusOptions = [ 0, 3, 6, 9 ];
    const index = statusOptions.indexOf(status);
    if (index <= 0) {
      return false;
    }
    const setStatus = status;
    const whereStatus = statusOptions[index - 1];
    const conn = await this.app.mysql.beginTransaction();
    try {
      const sql = 'UPDATE exchange_orders SET status = :setStatus WHERE status = :whereStatus AND trade_no = :trade_no;';
      const result = await this.app.mysql.query(sql, {
        setStatus,
        whereStatus,
        trade_no,
      });
      await conn.commit();
      const updateSuccess = (result.affectedRows !== 0);
      return updateSuccess;
    } catch (err) {
      this.ctx.logger.error(err);
      await conn.rollback();
      return false;
    }
  }
  async setStatusPending(trade_no) {
    const result = await this.updateStatus(trade_no, 3);
    return result;
  }
  async setStatusPayed(trade_no) {
    const result = await this.updateStatus(trade_no, 6);
    return result;
  }
  async setStatusComplete(trade_no) {
    const result = await this.updateStatus(trade_no, 9);
    return result;
  }
  // 用户持有的币
  async getTokenListByUser(id, page = 1, pagesize = 20) {
    const sql = 'SELECT a.token_id, a.amount, b.symbol, b.name, b.decimals, b.logo, b.uid, u.username, u.nickname, u.avatar '
      + 'FROM assets_minetokens AS a '
      + 'LEFT JOIN minetokens AS b ON a.token_id = b.id '
      + 'LEFT JOIN users u ON b.uid = u.id '
      + 'WHERE a.uid = :id AND a.amount > 0 ORDER BY b.create_time DESC LIMIT :offset, :limit;'
      + 'SELECT count(1) as count FROM assets_minetokens WHERE uid = :id AND amount > 0;';
    const result = await this.app.mysql.query(sql, {
      id,
      offset: (page - 1) * pagesize,
      limit: pagesize,
    });
    return {
      count: result[1][0].count,
      list: result[0],
    };
  }
  // 根据粉丝币获取持仓用户列表
  async getUserListByToken(id, page = 1, pagesize = 20) {
    id = parseInt(id);
    const sql = `SELECT a.*, b.total_supply, u.username, u.nickname, u.avatar
    FROM assets_minetokens AS a
    JOIN minetokens b ON b.id = a.token_id
    JOIN users u ON u.id = a.uid
    WHERE a.token_id = 16 AND a.amount > 0
    LIMIT :offset, :limit;
    SELECT count(1) as count FROM assets_minetokens WHERE token_id = :id AND amount > 0;`;
    const result = await this.app.mysql.query(sql, {
      id,
      offset: (page - 1) * pagesize,
      limit: pagesize,
    });
    return {
      count: result[1][0].count,
      list: result[0],
    };
  }
  async getTokenBySymbol(symbol) {
    const sql = `SELECT t1.*, t2.username, t2.nickname, t2.avatar, t4.amount
                FROM mineTokens AS t1
                Left JOIN users AS t2 ON t1.uid = t2.id
                LEFT JOIN exchanges as t3 ON t1.id = t3.token_id
                LEFT JOIN assets_minetokens as t4 ON t3.exchange_uid = t4.uid AND t3.token_id = t4.token_id
                WHERE LOWER(t1.symbol) = LOWER(:symbol)`;
    const result = await this.app.mysql.query(sql, {
      symbol,
    });
    return result[0] || null;
  }
  // 所有的token
  async getAllToken(page = 1, pagesize = 20, search = '', sort) {
    let sortArray = null;
    let sqlOrder = ' ORDER BY id DESC';
    if (sort) {
      sortArray = sort.split('-');
      if (sortArray[0] === 'id' && sortArray[1] === 'asc') {
        sqlOrder = ' ORDER BY id';
      } else if (sortArray[0] === 'symbol' && sortArray[1] === 'asc') {
        sqlOrder = ' ORDER BY symbol';
      } else if (sortArray[0] === 'symbol' && sortArray[1] === 'desc') {
        sqlOrder = ' ORDER BY symbol DESC';
      }
    }

    if (search === '') {
      const sql = `SELECT t1.*, t2.username, t2.nickname, t2.avatar, t4.amount
          FROM mineTokens AS t1
          Left JOIN users AS t2 ON t1.uid = t2.id
          LEFT JOIN exchanges as t3 ON t1.id = t3.token_id
          LEFT JOIN assets_minetokens as t4 ON t3.exchange_uid = t4.uid AND t3.token_id = t4.token_id `
        + sqlOrder
        + ' LIMIT :offset, :limit;'
        + 'SELECT count(1) as count FROM mineTokens;';
      const result = await this.app.mysql.query(sql, {
        offset: (page - 1) * pagesize,
        limit: pagesize,
      });
      return {
        count: result[1][0].count,
        list: result[0],
      };
    }

    const searchSql = `SELECT t1.*, t2.username, t2.nickname, t2.avatar, t4.amount
        FROM mineTokens AS t1
        Left JOIN users AS t2 ON t1.uid = t2.id
        LEFT JOIN exchanges as t3 ON t1.id = t3.token_id
        LEFT JOIN assets_minetokens as t4 ON t3.exchange_uid = t4.uid AND t3.token_id = t4.token_id
        WHERE Lower(t1.name) LIKE :search OR Lower(t1.symbol) LIKE :search `
      + sqlOrder
      + ' LIMIT :offset, :limit;'
      + 'SELECT count(1) as count FROM mineTokens WHERE Lower(name) LIKE :search OR Lower(symbol) LIKE :search;';
    const searchResult = await this.app.mysql.query(searchSql, {
      search: '%' + search.toLowerCase() + '%',
      offset: (page - 1) * pagesize,
      limit: pagesize,
    });
    return {
      count: searchResult[1][0].count,
      list: searchResult[0],
    };
  }
  async getFlowDetail(tokenId, page = 1, pagesize = 20) {
    console.log(tokenId);
    const sql = 'SELECT * from exchange_orders WHERE token_id = :tokenId LIMIT :offset, :limit;'
      + 'SELECT count(1) as count FROM exchange_orders WHERE token_id = :tokenId;';
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
  async getUserFlowDetail(userId, tokenId, page = 1, pagesize = 20) {
    const sql = 'SELECT * from exchange_orders WHERE token_id = :tokenId AND uid = :userId LIMIT :offset, :limit;'
      + 'SELECT count(1) as count FROM exchange_orders WHERE token_id = :tokenId AND uid = :userId;';
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
  async getUserBalance(userId, tokenId) {
    const sql = 'SELECT t1.*, t2.decimals FROM `assets_minetokens` as t1'
      + ' LEFT JOIN `minetokens` as t2 ON t1.token_id = t2.id '
      + 'WHERE t1.uid = :userId AND t1.token_id = :tokenId';
    const result = await this.app.mysql.query(sql, {
      userId,
      tokenId,
    });
    return result[0];
  }
}
module.exports = ExchangeService;
