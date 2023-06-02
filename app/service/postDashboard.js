'use strict';
const Service = require('egg').Service;
const moment = require('moment');

// 访问的数据库先在这里写
const TABLE = {
  POST_ACTION_LOG: 'post_action_log',
  POSTS: 'posts',
  BOOKMARKS: 'post_bookmarks',
  COMMENTS: 'comments',
  ORDERS: 'orders',
  SUPPORTS: 'supports',
  ASSETS_TOKEN_LOG: 'assets_minetokens_log',
  TOKENS: 'minetokens',
  USERS: 'users',
};

// 行为的种类
const ACTION_TYPES = [
  'read', // 阅读
  'like', // 推荐
  'dislike', // 不推荐
  'share', // 分享
  'unlock', // 解锁
];

class PostDashboardService extends Service {
  /**
   * 获取全部统计数据
   * @param {Number} userId 用户 id
   * @param {Number} days 【选填】筛选多少天内的数据
   */
  async get(userId, days) {
    // 拿到 ACTION_TYPES 包括的那部分数据
    const actionRes = await this.getActionCountByUserId(userId, days);
    // 查询主体部分
    const select = {
      bookmark: `SELECT COUNT(*) AS count FROM ${TABLE.BOOKMARKS} WHERE pid IN (SELECT id FROM ${TABLE.POSTS} WHERE uid = :userId)`,
      comment: `SELECT COUNT(*) AS count FROM ${TABLE.COMMENTS} WHERE type = 3 AND sign_id IN (SELECT id FROM ${TABLE.POSTS} WHERE uid = :userId)`,
      sale: `SELECT COUNT(*) AS count FROM ${TABLE.ORDERS} WHERE status = 9 AND signid IN (SELECT id FROM ${TABLE.POSTS} WHERE uid = :userId)`,
      reward: `SELECT COUNT(*) AS count FROM ${TABLE.ASSETS_TOKEN_LOG} WHERE type = 'reward_article' AND to_uid = :userId`,
    };
    // 时间筛选部分
    const whereDate = days ? ' AND TO_DAYS(NOW()) - TO_DAYS(create_time) < :days' : '';
    // 拼接
    const sql = select.bookmark + whereDate + '; '
      + select.comment + whereDate + '; '
      + select.sale + whereDate + '; '
      + select.reward + whereDate + ';';
    // 查询
    const res = await this.app.mysql.query(sql, { userId, days });
    // 整理数据并返回
    return {
      ...actionRes,
      bookmarkCount: res[0][0].count,
      commentCount: res[1][0].count,
      saleCount: res[2][0].count,
      rewardCount: res[3][0].count,
    };
  }

  /**
   * 获取指定用户所有文章的行为日志统计。
   * @param {Number} userId 用户 id
   * @param {Number} days 【选填】筛选多少天内的数据
   */
  async getActionCountByUserId(userId, days) {
    const whereDate = 'AND TO_DAYS(NOW()) - TO_DAYS(create_time) < :days';
    const sql = `
      SELECT
        action, COUNT(*) AS count
      FROM
        ${TABLE.POST_ACTION_LOG}
      WHERE
        post_id IN (SELECT id FROM ${TABLE.POSTS} WHERE uid = :userId) ${days ? whereDate : ''}
      GROUP BY
        action;
    `;
    const res = await this.app.mysql.query(sql, { userId, days });
    // 整理数据。
    const result = {};
    ACTION_TYPES.forEach(type => {
      result[type + 'Count'] = { ...res.find(item => item.action === type) }.count || 0;
    });
    return result;
  }

  /**
   * 添加 post action 日志
   * @param {Number} userId 用户 id
   * @param {Number} postId 文章 id
   * @param {String} action 行为
   * @param {Boolean} notRepeat 不允许重复
   */
  async addActionLog(userId, postId, action, notRepeat) {
    if (!ACTION_TYPES.includes(action)) return;
    if (notRepeat && await this.getActionLog(userId, postId, action)) return -1;

    const res = await this.app.mysql.insert(TABLE.POST_ACTION_LOG, {
      uid: userId,
      post_id: postId,
      action,
      create_time: moment().format('YYYY-MM-DD HH:mm:ss'),
    });
    return res.affectedRows;
  }

  /**
   * 查询某条日志是否存在（用于判断是否重复）
   * @param {Number} userId 用户 id
   * @param {Number} postId 文章 id
   * @param {String} action 行为
   */
  async getActionLog(userId, postId, action) {
    return await this.app.mysql.get(TABLE.POST_ACTION_LOG, {
      uid: userId,
      post_id: postId,
      action,
    });
  }


  /** ******************
   *  阅览数据历史记录  *
   ********************/

  /**
   * 获取 给定行为的 post_action_log 表历史数据，时间跨度是天
   * @param {Number} userId 用户 id
   * @param {String} action 行为
   * @param {Number} days 【选填】筛选多少天内的数据
   */
  async getPostActionHistory(userId, action, days) {
    if (!ACTION_TYPES.includes(action)) return;
    const whereDate = 'AND TO_DAYS(NOW()) - TO_DAYS(create_time) < :days';
    const sql = `
      SELECT
        COUNT(*) AS count,
        DATE_FORMAT(create_time, '%Y-%m-%d') AS create_time
      FROM
        ${TABLE.POST_ACTION_LOG}
      WHERE
        action = :action
        AND post_id IN (SELECT id FROM ${TABLE.POSTS} WHERE uid = :userId)
        ${days ? whereDate : ''}
      GROUP
        BY post_action_log.create_time;
    `;
    const res = await this.app.mysql.query(sql, { userId, action, days });
    return res;
  }

  /**
   * 获取收藏量历史，单位时间：天
   * @param {Number} userId 用户 id
   * @param {Number} days 【选填】筛选多少天内的数据
   */
  async getBrowseBookmarkHistory(userId, days) {
    const whereDate = 'AND TO_DAYS(NOW()) - TO_DAYS(create_time) < :days';
    const sql = `
      SELECT
        COUNT(*) AS count,
        DATE_FORMAT(create_time, '%Y-%m-%d') AS create_time
      FROM
        ${TABLE.BOOKMARKS}
      WHERE
        pid IN (SELECT id FROM ${TABLE.POSTS} WHERE uid = :userId)
        ${days ? whereDate : ''}
      GROUP
        BY post_bookmarks.create_time;
    `;
    const res = await this.app.mysql.query(sql, { userId, days });
    return res;
  }

  /**
   * 获取评论量历史，单位时间：天
   * @param {Number} userId 用户 id
   * @param {Number} days 【选填】筛选多少天内的数据
   */
  async getBrowseCommentHistory(userId, days) {
    const whereDate = 'AND TO_DAYS(NOW()) - TO_DAYS(create_time) < :days';
    const sql = `
      SELECT
        COUNT(*) AS count,
        DATE_FORMAT(create_time, '%Y-%m-%d') AS create_time
      FROM
        ${TABLE.COMMENTS}
      WHERE
        type = 3
        AND sign_id IN (SELECT id FROM ${TABLE.POSTS} WHERE uid = :userId)
        ${days ? whereDate : ''}
      GROUP
        BY comments.create_time;
    `;
    const res = await this.app.mysql.query(sql, { userId, days });
    return res;
  }

  /**
   * 获取支付量历史，单位时间：天
   * @param {Number} userId 用户 id
   * @param {Number} days 【选填】筛选多少天内的数据
   */
  async getBrowseSaleHistory(userId, days) {
    const whereDate = 'AND TO_DAYS(NOW()) - TO_DAYS(create_time) < :days';
    const sql = `
      SELECT
        COUNT(*) AS count,
        DATE_FORMAT(create_time, '%Y-%m-%d') AS create_time
      FROM
        ${TABLE.ORDERS}
      WHERE
        status = 9
        AND signid IN (SELECT id FROM ${TABLE.POSTS} WHERE uid = :userId)
        ${days ? whereDate : ''}
      GROUP
        BY orders.create_time;
    `;
    const res = await this.app.mysql.query(sql, { userId, days });
    return res;
  }

  /**
   * 获取赞赏量历史，单位时间：天
   * @param {Number} userId 用户 id
   * @param {Number} days 【选填】筛选多少天内的数据
   */
  async getBrowseRewardHistory(userId, days) {
    const whereDate = 'AND TO_DAYS(NOW()) - TO_DAYS(create_time) < :days';
    const sql = `
      SELECT
        COUNT(*) AS count,
        DATE_FORMAT(create_time, '%Y-%m-%d') AS create_time
      FROM
        ${TABLE.ASSETS_TOKEN_LOG}
      WHERE
        type = 'reward_article' AND to_uid = :userId
        ${days ? whereDate : ''}
      GROUP
        BY assets_minetokens_log.create_time;
    `;
    const res = await this.app.mysql.query(sql, { userId, days });
    return res;
  }

  /** ******************
   *  阅览数据文章排名  *
   ********************/

  /**
   * 获取 给定行为的 post_action_log 表文章排名。
   * @param {Number} userId 用户 id
   * @param {String} action 行为。请参考 ACTION_TYPES
   * @param {Number} days 【可选】筛选 N 天内的数据
   * @param {Number} page 【可选】分页：页码
   * @param {Number} pagesize 【可选】分页：每页条目数
   */
  async getBrowsePostActionRank(userId, action, days, page = 1, pagesize = 10) {
    const whereDate = 'AND TO_DAYS(NOW()) - TO_DAYS(a.create_time) < :days';
    const sql = `
      SELECT
        p.id,
        p.title,
        COUNT(*) AS count,
        p.create_time
      FROM
        ${TABLE.POSTS} p
      JOIN
        ${TABLE.POST_ACTION_LOG} a ON a.post_id = p.id
      WHERE
        a.action = :action
        AND p.uid = :userId
        ${days ? whereDate : ''}
      GROUP BY
        p.id
      ORDER BY
        count DESC, p.create_time
      LIMIT :offset, :limit;

      SELECT
        COUNT(*) AS count
      FROM (
        SELECT
          1 AS count
        FROM
          ${TABLE.POSTS} p
        JOIN
          ${TABLE.POST_ACTION_LOG} a ON a.post_id = p.id
        WHERE
          a.action = :action
          AND p.uid = :userId
          ${days ? whereDate : ''}
        GROUP BY
          p.id
      ) t1;
    `;
    const res = await this.app.mysql.query(sql, {
      userId,
      action,
      days,
      offset: (page - 1) * pagesize,
      limit: pagesize,
    });
    return {
      count: res[1][0].count,
      list: res[0],
    };
  }

  /**
   * 获取指定用户的文章收藏量排名。
   * @param {Number} userId 用户 id
   * @param {Number} days 【可选】依据 N 天内的数据排，默认依据所有历史数据进行排名。
   * @param {Number} page 【可选】分页：页码
   * @param {Number} pagesize 【可选】分页：每页条目数
   */
  async getBrowseBookmarkRank(userId, days, page = 1, pagesize = 10) {
    const whereDate = 'AND TO_DAYS(NOW()) - TO_DAYS(b.create_time) < :days';
    const sql = `
      SELECT
        p.id,
        p.title,
        COUNT(*) AS count,
        p.create_time
      FROM
        ${TABLE.POSTS} p
      JOIN
        ${TABLE.BOOKMARKS} b ON b.pid = p.id
      WHERE
        p.uid = :userId
        ${days ? whereDate : ''}
      GROUP BY
        p.id
      ORDER BY
        count DESC, p.create_time
      LIMIT :offset, :limit;

      SELECT
        COUNT(*) AS count
      FROM (
        SELECT
          1 AS count
        FROM
          ${TABLE.POSTS} p
        JOIN
          ${TABLE.BOOKMARKS} b ON b.pid = p.id
        WHERE
          p.uid = :userId
          ${days ? whereDate : ''}
        GROUP BY
          p.id
      ) t1;
    `;
    const res = await this.app.mysql.query(sql, {
      userId,
      days,
      offset: (page - 1) * pagesize,
      limit: pagesize,
    });
    return {
      count: res[1][0].count,
      list: res[0],
    };
  }

  /**
   * 获取指定用户的文章评论量排名。
   * @param {Number} userId 用户 id
   * @param {Number} days 【可选】依据 N 天内的数据排，默认依据所有历史数据进行排名。
   * @param {Number} page 【可选】分页：页码
   * @param {Number} pagesize 【可选】分页：每页条目数
   */
  async getBrowseCommentRank(userId, days, page = 1, pagesize = 10) {
    const whereDate = 'AND TO_DAYS(NOW()) - TO_DAYS(c.create_time) < :days';
    const sql = `
      SELECT
        p.id,
        p.title,
        COUNT(*) AS count,
        p.create_time
      FROM
        ${TABLE.POSTS} p
      JOIN
        ${TABLE.COMMENTS} c ON c.sign_id = p.id
      WHERE
        c.type = 3
        AND p.uid = :userId
        ${days ? whereDate : ''}
      GROUP BY
        p.id
      ORDER BY
        count DESC, p.create_time
      LIMIT :offset, :limit;

      SELECT
        COUNT(*) AS count
      FROM (
        SELECT
          1 AS count
        FROM
          ${TABLE.POSTS} p
        JOIN
          ${TABLE.COMMENTS} c ON c.sign_id = p.id
        WHERE
          c.type = 3
          AND p.uid = :userId
          ${days ? whereDate : ''}
        GROUP BY
          p.id
      ) t1;
    `;
    const res = await this.app.mysql.query(sql, {
      userId,
      days,
      offset: (page - 1) * pagesize,
      limit: pagesize,
    });
    return {
      count: res[1][0].count,
      list: res[0],
    };
  }

  /**
   * 获取指定用户的文章支付（购买文章）量排名。
   * @param {Number} userId 用户 id
   * @param {Number} days 【可选】依据 N 天内的数据排，默认依据所有历史数据进行排名。
   * @param {Number} page 【可选】分页：页码
   * @param {Number} pagesize 【可选】分页：每页条目数
   */
  async getBrowseSaleRank(userId, days, page = 1, pagesize = 10) {
    const whereDate = 'AND TO_DAYS(NOW()) - TO_DAYS(o.create_time) < :days';
    const sql = `
      SELECT
        p.id,
        p.title,
        COUNT(*) AS count,
        p.create_time
      FROM
        ${TABLE.POSTS} p
      JOIN
        ${TABLE.ORDERS} o ON o.signid = p.id
      WHERE
        o.status = 9
        AND p.uid = :userId
        ${days ? whereDate : ''}
      GROUP BY
        p.id
      ORDER BY
        count DESC, p.create_time
      LIMIT :offset, :limit;

      SELECT
        COUNT(*) AS count
      FROM (
        SELECT
          1 AS count
        FROM
          ${TABLE.POSTS} p
        JOIN
          ${TABLE.ORDERS} o ON o.signid = p.id
        WHERE
          o.status = 9
          AND p.uid = :userId
          ${days ? whereDate : ''}
        GROUP BY
          p.id
      ) t1;
    `;
    const res = await this.app.mysql.query(sql, {
      userId,
      days,
      offset: (page - 1) * pagesize,
      limit: pagesize,
    });
    return {
      count: res[1][0].count,
      list: res[0],
    };
  }

  /**
   * 获取指定用户的文章赞赏量排名。
   * @param {Number} userId 用户 id
   * @param {Number} days 【可选】依据 N 天内的数据排，默认依据所有历史数据进行排名。
   * @param {Number} page 【可选】分页：页码
   * @param {Number} pagesize 【可选】分页：每页条目数
   */
  async getBrowseRewardRank(userId, days, page = 1, pagesize = 10) {
    const whereDate = 'AND TO_DAYS(NOW()) - TO_DAYS(t.create_time) < :days';
    const sql = `
      SELECT
        p.id,
        p.title,
        COUNT(*) AS count,
        p.create_time
      FROM
        ${TABLE.POSTS} p
      JOIN
        ${TABLE.ASSETS_TOKEN_LOG} t ON t.post_id = p.id
      WHERE
        t.type = 'reward_article'
        AND p.uid = :userId
        ${days ? whereDate : ''}
      GROUP BY
        p.id
      ORDER BY
        count DESC, p.create_time
      LIMIT :offset, :limit;

      SELECT
        COUNT(*) AS count
      FROM (
        SELECT
          1 AS count
        FROM
          ${TABLE.POSTS} p
        JOIN
          ${TABLE.ASSETS_TOKEN_LOG} t ON t.post_id = p.id
        WHERE
          t.type = 'reward_article'
          AND p.uid = :userId
          ${days ? whereDate : ''}
        GROUP BY
          p.id
      ) t1;
    `;
    const res = await this.app.mysql.query(sql, {
      userId,
      days,
      offset: (page - 1) * pagesize,
      limit: pagesize,
    });
    return {
      count: res[1][0].count,
      list: res[0],
    };
  }

  /** ***********
   *  收益数据  *
   *************/

  /**
   * 获取用户的收益历史（该用户所有文章的付费解锁和打赏收益）。
   * @param {Number} userId 用户 id
   * @param {Number} tokenId 【可选】Fan票 id。筛选特定Fan票，0表示 CNY, undefined 表示不筛选。
   * @param {Number} page 【可选】分页：页码
   * @param {Number} pagesize 【可选】分页：每页条目数
   */
  async getIncomeHistory(userId, tokenId, page = 1, pagesize = 10) {
    // 售出历史查询
    const saleSql = `
      SELECT
        o.id,
        'sale' AS type,
        o.uid AS user_id,
        o.signid AS post_id,
        p.title AS post_title,
        IFNULL(t.id, 0) AS token_id,
        o.amount,
        o.decimals,
        o.symbol,
        o.create_time
      FROM
        ${TABLE.ORDERS} o
      JOIN
        ${TABLE.POSTS} p ON p.id = o.signid
      LEFT JOIN
        ${TABLE.TOKENS} t ON t.symbol = o.symbol
      WHERE
        o.status = 9
        AND p.uid = :userId
    `;
    // 打赏历史查询
    const rewardSql = `
      SELECT
        a.id,
        'reward' AS type,
        a.from_uid AS user_id,
        a.post_id,
        p.title AS post_title,
        IFNULL(a.token_id, 0) AS token_id,
        a.amount,
        t.decimals,
        t.symbol,
        a.create_time
      FROM
        ${TABLE.ASSETS_TOKEN_LOG} a
      JOIN
        ${TABLE.POSTS} p ON p.id = a.post_id
      LEFT JOIN
        ${TABLE.TOKENS} t ON t.id = a.token_id
      WHERE
        a.type = 'reward_article'
        AND p.uid = :userId
    `;
    // 筛选特定的 token 类型
    const whereToken = tokenId || tokenId === 0 ? 'WHERE t1.token_id = :tokenId' : '';
    // 连接两种 list 数据，并且查询 user 信息
    const listSql = `
      SELECT
        t1.*,
        u.username,
        u.nickname
      FROM (
        ${saleSql}
        UNION ALL
        ${rewardSql}
      ) t1
      LEFT JOIN
        ${TABLE.USERS} u ON u.id = t1.user_id
      ${whereToken}
      ORDER BY
        t1.create_time DESC
      LIMIT :offset, :limit;
    `;
    // 总条目数 count 查询
    const countSql = `
      SELECT
        COUNT(*) AS count
      FROM (
        ${rewardSql}
        UNION ALL
        ${saleSql}
      ) t1
      ${whereToken};
    `;
    const res = await this.app.mysql.query(listSql + countSql, {
      userId,
      tokenId,
      offset: (page - 1) * pagesize,
      limit: pagesize,
    });
    res[0].forEach(value => { value.username = this.ctx.helper.emailMask(value.username); });
    return {
      count: res[1][0].count,
      list: res[0],
    };
  }

  /**
   * 获取用户所有文章的总收益
   * @param {Number} userId 用户 id
   * @param {Number} days 【可选】筛选 N 天内的收益，留空则不筛选。
   */
  async getSumIncome(userId, days) {
    // 时间筛选
    const whereDate = days ? 'AND TO_DAYS(NOW()) - TO_DAYS(t1.create_time) < :days' : '';
    // 售出总收益查询
    const saleSql = `
      SELECT
        IFNULL(t.id, 0) AS token_id,
        SUM(t1.amount) AS amount,
        t1.decimals,
        t1.symbol
      FROM
        ${TABLE.ORDERS} t1
      JOIN
        ${TABLE.POSTS} p ON p.id = t1.signid
      LEFT JOIN
        ${TABLE.TOKENS} t ON t.symbol = t1.symbol
      WHERE
        t1.status = 9
        AND p.uid = :userId
        ${whereDate}
      GROUP BY
        token_id, t1.decimals, t1.symbol
    `;
    // 打赏总收益查询
    const rewardSql = `
      SELECT
        IFNULL(t1.token_id, 0) AS token_id,
        SUM(t1.amount) AS amount,
        t.decimals,
        t.symbol
      FROM
        ${TABLE.ASSETS_TOKEN_LOG} t1
      JOIN
        ${TABLE.POSTS} p ON p.id = t1.post_id
      LEFT JOIN
        ${TABLE.TOKENS} t ON t.id = t1.token_id
      WHERE
        t1.type = 'reward_article'
        AND p.uid = :userId
        ${whereDate}
      GROUP BY
        token_id
    `;
    // 合并两个表的数据
    const sql = `
      SELECT
        t2.token_id,
        t2.symbol,
        SUM(t2.amount) AS amount,
        t2.decimals
      FROM (
        ${saleSql}
        UNION ALL
        ${rewardSql}
      ) t2
      GROUP BY
        t2.token_id, t2.symbol, t2.decimals
      ORDER BY
        t2.symbol;
    `;
    const res = await this.app.mysql.query(sql, { userId, days });
    return res;
  }

  /**
   * 获取用户某个 token 的售出收益来源于哪些文章。
   * @param {Number} userId 用户 id
   * @param {Number} tokenId Fan票 id
   * @param {Number} days 【可选】筛选 N 天内的数据
   * @param {Number} page 【可选】分页：页码
   * @param {Number} pagesize 【可选】分页：每页条目数
   */
  async getSaleIncomeSource(userId, tokenId, days, page = 1, pagesize = 10) {
    const whereDate = 'AND TO_DAYS(NOW()) - TO_DAYS(o.create_time) < :days';
    const listSql = `
      SELECT
        p.id AS post_id,
        p.title AS post_title,
        IFNULL(t.id, 0) AS token_id,
        SUM(o.amount) AS amount,
        o.decimals,
        o.symbol,
        p.create_time
      FROM
        ${TABLE.ORDERS} o
      JOIN
        ${TABLE.POSTS} p ON p.id = o.signid
      LEFT JOIN
        ${TABLE.TOKENS} t ON t.symbol = o.symbol
      WHERE
        o.status = 9
        AND p.uid = :userId
        AND IFNULL(t.id, 0) = :tokenId
        ${days ? whereDate : ''}
      GROUP BY
        p.id
      ORDER BY
        amount DESC, p.create_time
      LIMIT :offset, :limit;
    `;
    const countSql = `
      SELECT
        COUNT(*) AS count
      FROM (
        SELECT
          1 AS count
        FROM
          ${TABLE.ORDERS} o
        JOIN
          ${TABLE.POSTS} p ON p.id = o.signid
        LEFT JOIN
          ${TABLE.TOKENS} t ON t.symbol = o.symbol
        WHERE
          o.status = 9
          AND p.uid = :userId
          AND IFNULL(t.id, 0) = :tokenId
          ${days ? whereDate : ''}
        GROUP BY
          p.id
      ) t1;
    `;
    const res = await this.app.mysql.query(listSql + countSql, {
      userId,
      tokenId,
      days,
      offset: (page - 1) * pagesize,
      limit: pagesize,
    });
    return {
      count: res[1][0].count,
      list: res[0],
    };
  }

  /**
   * 获取用户某个 token 的打赏收益来源于哪些文章，并以金额倒序。
   * @param {Number} userId 用户 id
   * @param {Number} tokenId Fan票 id
   * @param {Number} days 【可选】筛选 N 天内的数据
   * @param {Number} page 【可选】分页：页码
   * @param {Number} pagesize 【可选】分页：每页条目数
   */
  async getRewardIncomeSource(userId, tokenId, days, page = 1, pagesize = 10) {
    const whereDate = 'AND TO_DAYS(NOW()) - TO_DAYS(a.create_time) < :days';
    const listSql = `
      SELECT
        p.id AS post_id,
        p.title AS post_title,
        IFNULL(a.token_id, 0) AS token_id,
        SUM(a.amount) AS amount,
        t.decimals,
        t.symbol,
        p.create_time
      FROM
        ${TABLE.ASSETS_TOKEN_LOG} a
      JOIN
        ${TABLE.POSTS} p ON p.id = a.post_id
      LEFT JOIN
        ${TABLE.TOKENS} t ON t.id = a.token_id
      WHERE
        a.type = 'reward_article'
        AND p.uid = :userId
        AND IFNULL(a.token_id, 0) = :tokenId
        ${days ? whereDate : ''}
      GROUP BY
        p.id
      ORDER BY
        amount DESC, p.create_time
      LIMIT :offset, :limit;
    `;
    const countSql = `
      SELECT
        COUNT(*) AS count
      FROM (
        SELECT
          1 AS count
        FROM
          ${TABLE.ASSETS_TOKEN_LOG} a
        JOIN
          ${TABLE.POSTS} p ON p.id = a.post_id
        WHERE
          a.type = 'reward_article'
          AND p.uid = :userId
          AND IFNULL(a.token_id, 0) = :tokenId
          ${days ? whereDate : ''}
        GROUP BY
          p.id
      ) t1;
    `;
    const res = await this.app.mysql.query(listSql + countSql, {
      userId,
      tokenId,
      days,
      offset: (page - 1) * pagesize,
      limit: pagesize,
    });
    return {
      count: res[1][0].count,
      list: res[0],
    };
  }
}

module.exports = PostDashboardService;
