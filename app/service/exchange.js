'use strict';
const Service = require('egg').Service;
const moment = require('moment');
const DEADLINE = 300; // 超时时间300秒
const typeOptions = {
  add: 'add',
  buy_token: 'buy_token',
  sale_token: 'sale_token',
};


class ExchangeService extends Service {
  async createOrder(order) {
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    const deadline = parseInt(moment().format('X')) + DEADLINE; // 设置unix时间戳
    const result = await this.app.mysql.query(
      'INSERT INTO exchange_orders(uid, token_id, cny_amount, token_amount, type, trade_no, openid, status, create_time, deadline, min_liquidity, max_tokens, min_tokens, recipient, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [ order.uid, order.token_id, order.cny_amount, order.token_amount, order.type, order.trade_no, order.openid, order.status, now, deadline, order.min_liquidity, order.max_tokens, order.min_tokens, order.recipient, order.ip ]
    );
    const createSuccess = (result.affectedRows !== 0);
    return createSuccess;
  }
  async createOrderByInput(order) {
    /* const { ctx } = this;
    // 创建订单，status为0
    const createSuccess = await this.createOrder({
      uid: ctx.user.id, // 用户id
      token_id, // 购买的token id
      cny_amount: total,
      token_amount: '',
      type: typeOptions[type], // 类型：add，buy_token，sale_token
      trade_no: order.out_trade_no, // 订单号
      openid: '',
      status: 0, // 状态，0初始，3支付中，6支付成功，9处理完成
      min_liquidity: 0, // 资金池pool最小流动性
      max_tokens: 0, // output为准，最多获得CNY
      min_tokens: 0, // input为准时，最少获得Token
      recipient: ctx.user.id, // 接收者
      ip: order.spbill_create_ip, // ip
    });
    if (!createSuccess) {
      return false;
    }
    const payargs = await this.app.wxpay.getBrandWCPayRequestParams(order);
    ctx.logger.info('controller wxpay pay result', payargs);
    if (payargs.code_url) {
      // 更新订单状态为‘支付中’：3
      await this.setStatusPending(order.out_trade_no);
      return payargs;
    }
    return false; */
  }
  async createOrderByOutput(order) {

  }
  async createOrderByPool(order) {

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
    const sql = 'UPDATE exchange_orders SET status = :setStatus WHERE status = :whereStatus AND trade_no = :trade_no;';
    const result = await this.app.mysql.query(sql, {
      setStatus,
      whereStatus,
      trade_no,
    });
    const updateSuccess = (result.affectedRows !== 0);
    return updateSuccess;
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
    const sql = 'SELECT a.*, b.username, b.email, b.nickname, b.avatar FROM assets_minetokens AS a LEFT JOIN users AS b ON a.uid = b.id WHERE a.token_id = :id AND a.amount > 0 LIMIT :offset, :limit;'
      + 'SELECT count(1) as count FROM assets_minetokens WHERE token_id = :id AND amount > 0;';
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
  // 所有的token
  async getAllToken(page = 1, pagesize = 20, search = '') {
    if (search === '') {
      const sql = 'SELECT * FROM mineTokens LIMIT :offset, :limit;'
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
    const searchSql = 'SELECT * FROM mineTokens WHERE Lower(name) LIKE :search OR Lower(symbol) LIKE :search LIMIT :offset, :limit;'
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
}
module.exports = ExchangeService;
