'use strict';
const consts = require('./consts');

const Service = require('egg').Service;
const _ = require('lodash');
const moment = require('moment');
const fs = require('fs');
const removemd = require('remove-markdown');
// const IpfsHttpClientLite = require('ipfs-http-client-lite');

class PostService extends Service {

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

  // 洗去内容的md和html标签， 还有空格和换行等不显示字符
  async wash(rawContent) {
    let parsedContent = rawContent;
    // 去除markdown图片链接
    parsedContent = parsedContent.replace(/!\[.*?\]\((.*?)\)/gi, '');
    // 去除video标签
    parsedContent = parsedContent.replace(/<video.*?>\n*?.*?\n*?<\/video>/gi, '');
    parsedContent = parsedContent.replace(/<[^>]+>/gi, '');
    // parsedContent = parsedContent.substring(0, 600);
    // 去除markdown和html
    parsedContent = removemd(parsedContent);
    // 去除空格
    parsedContent = parsedContent.replace(/\s+/g, '');
    // parsedContent = parsedContent.substring(0, 300);
    return parsedContent;
  }

  async publish(data) {
    try {
      const result = await this.app.mysql.insert('posts', data);

      if (result.affectedRows === 1) {
        // 创建统计表栏目
        await this.app.mysql.query(
          'INSERT INTO post_read_count(post_id, real_read_count, sale_count, support_count, eos_value_count, ont_value_count)'
          + ' VALUES(?, 0, 0, 0 ,0, 0);',
          [ result.insertId ]
        );

        // 加积分
        await this.service.mining.publish(data.uid, result.insertId, ''); // todo；posts表增加ip，这里传进来ip

        return result.insertId;
      }
    } catch (err) {
      this.logger.error('PostService::publish error: %j', err);
    }

    return 0;
  }

  async create_tags(sid, tag_arr, replace) {
    try {
      // 重置文章的标签
      if (replace) {
        await this.app.mysql.delete('post_tag', { sid });
      }

      for (let i = 0; i < tag_arr.length; i++) {
        const id = tag_arr[i];
        const tag = await this.app.mysql.get('tags', { id });
        if (tag) {
          await this.app.mysql.insert('post_tag', { sid, tid: tag.id });
        }
      }
    } catch (err) {
      this.logger.error('PostService::create_tags error: %j', err);
    }
  }

  // 根据hash获取文章
  async getByHash(hash, userId) {
    // const post = await this.app.mysql.get('posts', { hash });
    const posts = await this.app.mysql.query(
      'SELECT id, username, author, title, short_content, hash, status, onchain_status, create_time, fission_factor, '
      + 'cover, is_original, channel_id, fission_rate, referral_rate, uid, is_recommend, category_id, comment_pay_point FROM posts WHERE hash = ?;',
      [ hash ]
    );
    const post = posts[0];
    return this.getPostProfile(post, userId);
  }

  // 根据id获取文章-简单版
  async get(id) {
    const posts = await this.app.mysql.select('posts', {
      where: { id },
      columns: [ 'id', 'uid', 'title', 'status', 'create_time', 'comment_pay_point', 'channel_id' ], // todo：需要再增加
    });
    if (posts && posts.length > 0) {
      return posts[0];
    }
    return null;
  }

  // 根据id获取文章
  async getById(id, userId) {
    // const post = await this.app.mysql.get('posts', { id });
    const posts = await this.app.mysql.query(
      'SELECT id, username, author, title, short_content, hash, status, onchain_status, create_time, fission_factor, '
      + 'cover, is_original, channel_id, fission_rate, referral_rate, uid, is_recommend, category_id, comment_pay_point FROM posts WHERE id = ?;',
      [ id ]
    );
    const post = posts[0];
    return this.getPostProfile(post, userId);
  }

  // 获取文章阅读数等属性
  async getPostProfile(post, userId) {
    if (post) {

      // 如果是商品，返回价格
      if (post.channel_id === consts.postChannels.product) {
        post.prices = await this.getPrices(post.id);
      }

      // 阅读次数
      const count = await this.app.mysql.query(
        'SELECT post_id AS id, real_read_count AS num, sale_count AS sale, support_count AS ups, eos_value_count AS eosvalue, ont_value_count AS ontvalue, likes, dislikes'
        + ' FROM post_read_count WHERE post_id = ?;',
        [ post.id ]
      );
      if (count.length) {
        post.read = count[0].num;
        post.sale = count[0].sale;
        post.ups = count[0].ups;
        post.value = count[0].eosvalue;
        post.ontvalue = count[0].ontvalue;
        post.likes = count[0].likes;
        post.dislikes = count[0].dislikes;
      } else {
        post.read = post.sale = post.ups = post.value = post.ontvalue = post.likes = post.dislikes = 0;
      }

      // tags
      const tags = await this.app.mysql.query(
        'select a.id, a.name from tags a left join post_tag b on a.id = b.tid where b.sid = ? ',
        [ post.id ]
      );

      post.tags = tags;

      // 当前用户是否已赞赏
      post.is_support = false;
      if (userId) {
        const support = await this.app.mysql.get('supports', { signid: post.id, uid: userId, status: 1 });
        if (support) {
          post.is_support = true;
        }
      }

      // 如果是商品，当前用户是否已购买
      if (userId && post.channel_id === consts.postChannels.product) {
        post.is_buy = false;
        const buy = await this.app.mysql.get('orders', { signid: post.id, uid: userId, status: 1 });
        if (buy) {
          post.is_buy = true;
        }
      }

      // nickname
      const name = post.username || post.author;
      const user = await this.app.mysql.get('users', { username: name });
      if (user) {
        post.nickname = user.nickname;
      }

      if (userId) {
        // 是否点过推荐/不推荐，每个人只能点一次推荐/不推荐
        post.is_liked = await this.service.mining.liked(userId, post.id);
        // 获取用户从单篇文章阅读获取的积分
        post.points = await this.service.mining.getPointslogBySignId(userId, post.id);

        // 判断3天内的文章是否领取过阅读新文章奖励，3天以上的就不查询了
        if ((Date.now() - post.create_time) / (24 * 3600 * 1000) <= 3) {
          post.is_readnew = await this.service.mining.getReadNew(userId, post.id);
        }
      }

      // update cahce
      // this.app.read_cache[post.id] = post.read;
      // this.app.value_cache[post.id] = post.value;
      // this.app.ups_cache[post.id] = post.ups;

      // this.app.post_cache[post.id] = post;
    }

    return post;
  }

  // 获取商品价格
  async getPrices(signId) {
    const prices = await this.app.mysql.select('product_prices', {
      where: { sign_id: signId, status: 1 },
      columns: [ 'platform', 'symbol', 'price', 'decimals', 'stock_quantity' ],
    });

    return prices;
  }

  // 获取我关注的作者的文章
  async followedPosts(page = 1, pagesize = 20, userid = null, channel = null, extra = null) {

    if (userid === null) {
      return 2;
    }

    const totalsql = 'SELECT COUNT(*) AS count FROM posts p INNER JOIN follows f ON f.fuid = p.uid AND f.status = 1 ';
    const listsql = 'SELECT p.id AS signid FROM posts p INNER JOIN follows f ON f.fuid = p.uid AND f.status = 1 ';
    const ordersql = 'ORDER BY p.id DESC LIMIT :start, :end';
    let wheresql = 'WHERE f.uid = :uid AND p.status = 0 ';

    const channelid = parseInt(channel);
    if (channel) {
      if (isNaN(channelid)) {
        return 2;
      }
      wheresql += 'AND p.channel_id = ' + channelid + ' ';
    }
    const sqlcode = totalsql + wheresql + ';' + listsql + wheresql + ordersql + ';';
    const queryResult = await this.app.mysql.query(
      sqlcode,
      { uid: userid, start: (page - 1) * pagesize, end: 1 * pagesize }
    );

    const amount = queryResult[0];
    const posts = queryResult[1];

    const postids = [];
    _.each(posts, row => {
      postids.push(row.signid);
    });

    const extraItem = {};
    if (extra) {
      const extraSplit = extra.split(',');
      _.each(extraSplit, row => {
        if (row === 'short_content') {
          extraItem.short_content = true;
        }
      });
    }


    if (postids.length === 0) {
      // return [];
      return { count: 0, list: [] };
    }

    const postList = await this.getPostList(postids, extraItem);

    return { count: amount[0].count, list: postList };

  }

  // 推荐分数排序(默认方法)(new format)(count-list格式)
  async scoreRank(page = 1, pagesize = 20, author = null, channel = null, extra = null) {

    // 获取文章列表, 分为商品文章和普通文章
    // 再分为带作者和不带作者的情况.

    const totalsql = 'SELECT COUNT(*) AS count FROM posts ';
    const listsql = 'SELECT id FROM posts ';
    let wheresql = 'WHERE status = 0 ';

    if (author) {
      wheresql += 'AND uid = :author ';
    }
    const channelid = parseInt(channel);
    if (channel !== null) {
      if (isNaN(channelid)) {
        return 2;
      }
      wheresql += 'AND channel_id = ' + channelid + ' ';
    }

    const ordersql = 'ORDER BY hot_score DESC, id DESC LIMIT :start, :end';
    const sqlcode = totalsql + wheresql + ';' + listsql + wheresql + ordersql + ';';
    const queryResult = await this.app.mysql.query(
      sqlcode,
      { author, start: (page - 1) * pagesize, end: 1 * pagesize }
    );

    const amount = queryResult[0];
    const posts = queryResult[1];

    // TBD: 有无文章接口都要改成一致！
    if (posts.length === 0) {
      // return [];
      return { count: 0, list: [] };
    }

    const postids = [];
    _.each(posts, row => {
      postids.push(row.id);
    });

    const extraItem = { hot_score: true };
    if (extra) {
      const extraSplit = extra.split(',');
      _.each(extraSplit, row => {
        if (row === 'short_content') {
          extraItem.short_content = true;
        }
      });
    }

    let postList = await this.getPostList(postids, extraItem);

    // 由赞赏次数进行排序
    // 还没加上时间降序
    postList = postList.sort((a, b) => {
      if (a.hot_score === b.hot_score) {
        return a.id > b.id ? -1 : 1;
      }
      return a.hot_score > b.hot_score ? -1 : 1;
    });

    // 必须删掉hot_score， 不随接口返回
    _.each(postList, row => {
      delete row.hot_score;
    });

    return { count: amount[0].count, list: postList };
  }

  // 发布时间排序()(new format)(count-list格式)
  async timeRank(page = 1, pagesize = 20, author = null, channel = null, extra = null) {

    // 获取文章列表, 分为商品文章和普通文章
    // 再分为带作者和不带作者的情况.

    const totalsql = 'SELECT COUNT(*) AS count FROM posts ';
    const listsql = 'SELECT id FROM posts ';
    let wheresql = 'WHERE status = 0 ';

    if (author) {
      wheresql += 'AND uid = :author ';
    }
    const channelid = parseInt(channel);
    if (channel !== null) {
      if (isNaN(channelid)) {
        return 2;
      }
      wheresql += 'AND channel_id = ' + channelid + ' ';
    }

    const ordersql = 'ORDER BY id DESC LIMIT :start, :end';
    const sqlcode = totalsql + wheresql + ';' + listsql + wheresql + ordersql + ';';
    const queryResult = await this.app.mysql.query(
      sqlcode,
      { author, start: (page - 1) * pagesize, end: 1 * pagesize }
    );

    const amount = queryResult[0];
    const posts = queryResult[1];

    // TBD: 有无文章接口都要改成一致！
    if (posts.length === 0) {
      // return [];
      return { count: 0, list: [] };
    }

    const postids = [];
    _.each(posts, row => {
      postids.push(row.id);
    });

    const extraItem = {};
    if (extra) {
      const extraSplit = extra.split(',');
      _.each(extraSplit, row => {
        if (row === 'short_content') {
          extraItem.short_content = true;
        }
      });
    }

    const postList = await this.getPostList(postids, extraItem);

    return { count: amount[0].count, list: postList };
  }

  // (new format)(count-list格式)
  async getPostByTag(page = 1, pagesize = 20, extra = null, tagid) {

    const totalsql = 'SELECT COUNT(*) AS count FROM post_tag a LEFT JOIN posts b ON a.sid = b.id ';
    const listsql = 'SELECT a.sid, a.tid, b.title FROM post_tag a LEFT JOIN posts b ON a.sid = b.id ';
    const wheresql = 'WHERE a.tid = :tid AND b.status = 0 ';
    const ordersql = 'ORDER BY b.id DESC LIMIT :start, :end';

    const sqlcode = totalsql + wheresql + ';' + listsql + wheresql + ordersql + ';';
    const queryResult = await this.app.mysql.query(
      sqlcode,
      { tid: tagid, start: (page - 1) * pagesize, end: 1 * pagesize }
    );

    const amount = queryResult[0];
    const posts = queryResult[1];

    // 将文章id转为Array
    const postids = [];
    _.each(posts, row => {
      postids.push(row.sid);
    });

    if (postids.length === 0) {
      // return [];
      return { count: 0, list: [] };
    }

    const extraItem = {};
    if (extra) {
      const extraSplit = extra.split(',');
      _.each(extraSplit, row => {
        if (row === 'short_content') {
          extraItem.short_content = true;
        }
      });
    }

    const postList = await this.getPostList(postids, extraItem);

    return { count: amount[0].count, list: postList };
  }

  // 赞赏次数排序(new format)(count-list格式)
  async supportRank(page = 1, pagesize = 20, channel = null, extra = null) {

    const totalsql = 'SELECT COUNT(*) AS count FROM posts p ';
    const listsql = 'SELECT p.id, c.support_count FROM posts p LEFT JOIN post_read_count c ON c.post_id = p.id ';
    let wheresql = 'WHERE p.status = 0 ';
    const ordersql = 'ORDER BY c.support_count DESC, p.id DESC LIMIT :start, :end';
    // 获取文章id列表, 按照统计表的赞赏次数排序
    const channelid = parseInt(channel);
    if (channel !== null) {
      if (isNaN(channelid)) {
        return 2;
      }
      wheresql += 'AND p.channel_id = ' + channelid + ' ';
    }
    const sqlcode = totalsql + wheresql + ';' + listsql + wheresql + ordersql + ';';
    // 在support表中, 由赞赏次数获得一个文章的排序, 并且已经确保文章是没有被删除的
    const queryResult = await this.app.mysql.query(
      sqlcode,
      { start: (page - 1) * pagesize, end: 1 * pagesize }
    );

    const amount = queryResult[0];
    const posts = queryResult[1];

    // 将文章id转为Array
    const postids = [];
    _.each(posts, row => {
      postids.push(row.id);
    });

    if (postids.length === 0) {
      // return [];
      return { count: 0, list: [] };
    }

    const extraItem = {};
    if (extra) {
      const extraSplit = extra.split(',');
      _.each(extraSplit, row => {
        if (row === 'short_content') {
          extraItem.short_content = true;
        }
      });
    }

    let postList = await this.getPostList(postids, extraItem);

    // 由赞赏次数进行排序
    // 还没加上时间降序
    postList = postList.sort((a, b) => {
      if (a.ups === b.ups) {
        return a.id > b.id ? -1 : 1;
      }
      return a.ups > b.ups ? -1 : 1;
    });

    return { count: amount[0].count, list: postList };
  }

  // 分币种的赞赏金额排序
  // 请注意因为"后筛选"导致的不满20条,进而前端无法加载的问题.
  // 暂时不使用， 因此没有维护
  async amountRank(page = 1, pagesize = 20, symbol = 'EOS', channel = null) {

    let posts = null;
    let sqlcode = '';

    // 获取文章id列表, 按照指定的币种赞赏金额排序
    if (symbol.toUpperCase() === 'EOS') {
      sqlcode = 'SELECT p.id, c.eos_value_count AS count ';
    } else {
      sqlcode = 'SELECT p.id, c.ont_value_count AS count ';
    }
    sqlcode += 'FROM posts p '
      + 'LEFT JOIN post_read_count c ON c.post_id = p.id '
      + 'WHERE p.status = 0 ';
    const channelid = parseInt(channel);
    if (channel !== null) {
      if (isNaN(channelid)) {
        return 2;
      }
      sqlcode += 'AND p.channel_id = ' + channelid + ' ';
    }
    sqlcode += 'ORDER BY count DESC, p.id DESC LIMIT :start, :end;';
    posts = await this.app.mysql.query(
      sqlcode,
      { start: (page - 1) * pagesize, end: 1 * pagesize, symbol: symbol.toUpperCase() }
    );

    // 将文章id转为Array
    const postids = [];
    _.each(posts, row => {
      postids.push(row.id);
    });

    if (postids.length === 0) {
      return [];
      // return { count: 0, list: [] };
    }

    // 调用getPostList函数获得文章的具体信息
    // 此时序列已经被打乱了
    let postList = await this.getPostList(postids);

    // 重新由赞赏金额进行排序
    // 还没加上时间降序
    switch (symbol.toUpperCase()) {
      case 'EOS':
        postList = postList.sort((a, b) => {
          if (a.eosvalue === b.eosvalue) {
            return a.id > b.id ? -1 : 1;
          }
          return a.eosvalue > b.eosvalue ? -1 : 1;
        });
        break;

      case 'ONT':
        postList = postList.sort((a, b) => {
          if (a.ontvalue === b.ontvalue) {
            return a.id > b.id ? -1 : 1;
          }
          return a.ontvalue > b.ontvalue ? -1 : 1;
        });
        break;
    }

    return postList;
  }

  // 获取用户赞赏过的文章(new format)(count-list格式)
  async supportedPosts(page = 1, pagesize = 20, userid = null, channel = null) {

    // 没写用户
    if (userid === null) {
      return 2;
    }

    const totalsql = 'SELECT COUNT(*) AS count FROM supports s INNER JOIN posts p ON s.signid = p.id ';
    const listsql = 'SELECT s.create_time, signid FROM supports s INNER JOIN posts p ON s.signid = p.id ';
    const ordersql = 'ORDER BY s.create_time DESC LIMIT :start, :end';
    let wheresql = 'WHERE s.status = 1 AND p.status = 0 AND s.uid = :uid ';

    const channelid = parseInt(channel);
    if (channel) {
      if (isNaN(channelid)) {
        return 2;
      }
      wheresql += 'AND p.channel_id = ' + channelid + ' ';
    }

    const sqlcode = totalsql + wheresql + ';' + listsql + wheresql + ordersql + ';';
    const queryResult = await this.app.mysql.query(
      sqlcode,
      { uid: userid, start: (page - 1) * pagesize, end: 1 * pagesize }
    );

    const amount = queryResult[0];
    const posts = queryResult[1];

    const postids = [];
    _.each(posts, row => {
      postids.push(row.signid);
    });

    if (postids.length === 0) {
      // return [];
      return { count: 0, list: [] };
    }

    let postList = await this.getPostList(postids);

    _.each(postList, row2 => {
      _.each(posts, row => {
        if (row.signid === row2.id) {
          row2.support_time = row.create_time;
        }
      });
    });

    postList = postList.sort((a, b) => {
      return b.id - a.id;
    });

    return { count: amount[0].count, list: postList };
  }

  async recommendPosts(channel = null, amount = 5) {

    let sqlcode = '';
    sqlcode = 'SELECT id FROM posts '
      + 'WHERE is_recommend = 1 AND status = 0 ';
    const channelid = parseInt(channel);
    if (channel !== null) {
      if (isNaN(channelid)) {
        return 2;
      }
      sqlcode += 'AND channel_id = ' + channelid + ' ';
    }
    sqlcode += 'ORDER BY id DESC LIMIT :amountnum;';
    const amountnum = parseInt(amount);
    if (isNaN(amountnum)) {
      return 2;
    }
    const posts = await this.app.mysql.query(
      sqlcode,
      { amountnum }
    );

    const postids = [];
    _.each(posts, row => {
      postids.push(row.id);
    });

    if (postids.length === 0) {
      return [];
      // return { count: 0, list: [] };
    }

    const postList = await this.getPostList(postids);

    return postList;
  }

  // 获取文章的列表, 用于成片展示文章时, 会被其他函数调用
  async getPostList(signids, extraItem = null) {

    let postList = [];

    if (signids.length === 0) {
      return postList;
    }
    // 查询文章和作者的信息, 结果是按照时间排序
    // 如果上层也需要按照时间排序的, 则无需再排, 需要其他排序方式则需再排
    let sqlcode = 'SELECT a.id, a.uid, a.author, a.title,';
    if (extraItem) {
      if (extraItem.short_content) {
        sqlcode += ' a.short_content,';
      }
      if (extraItem.hot_score) {
        sqlcode += ' a.hot_score,';
      }
    }

    sqlcode += ' a.hash, a.create_time, a.cover, b.nickname, b.avatar FROM posts a';
    sqlcode += ' LEFT JOIN users b ON a.uid = b.id WHERE a.id IN (?) AND a.status = 0 ORDER BY id DESC;';
    postList = await this.app.mysql.query(
      sqlcode,
      [ signids ]
    );

    const hashs = [];

    // 准备需要返回的数据
    _.each(postList, row => {
      row.read = 0;
      row.eosvalue = 0;
      row.ups = 0;
      row.ontvalue = 0;
      row.tags = [];
      hashs.push(row.hash);
    });

    // 有关阅读次数,赞赏金额,赞赏次数的统计
    // 还有产品信息， 标签
    const statsQuery = await this.app.mysql.query(
      'SELECT post_id AS id, real_read_count AS num, sale_count AS sale, support_count AS ups, eos_value_count AS eosvalue, ont_value_count AS ontvalue'
      + ' FROM post_read_count WHERE post_id IN (:signid);'
      + 'SELECT sign_id, symbol, price, decimals FROM product_prices WHERE sign_id IN (:signid);'
      + 'SELECT p.sid, p.tid, t.name, t.type FROM post_tag p LEFT JOIN tags t ON p.tid = t.id WHERE sid IN (:signid);',
      { signid: signids }
    );

    const stats = statsQuery[0];
    const products = statsQuery[1];
    const tags = statsQuery[2];

    // 分配数值到每篇文章
    _.each(postList, row => {
      // 基础统计数据
      _.each(stats, row2 => {
        if (row.id === row2.id) {
          row.read = row2.num;
          row.sale = row2.sale;
          row.eosvalue = row2.eosvalue;
          row.ups = row2.ups;
          row.ontvalue = row2.ontvalue;
        }
      });
      // 如果有标签的话，其标签数据
      _.each(tags, row4 => {
        if (row.id === row4.sid) {
          row.tags.push({ id: row4.tid, name: row4.name, type: row4.type });
        }
      });
    });

    // 如果是包括产品的话，其产品数据
    if (products.length) {
      _.each(postList, row => {
        _.each(products, row3 => {
          if (row.id === row3.sign_id) {
            if (row3.symbol === 'EOS') {
              row.eosprice = row3.price;
              row.eosdecimals = row3.decimals;
            } else if (row3.symbol === 'ONT') {
              row.ontprice = row3.price;
              row.ontdecimals = row3.decimals;
            }
          }
        });
      });
    }

    return postList;
  }

  // 删除文章
  async delete(id, userid) {
    try {
      const row = {
        status: 1,
      };

      const options = {
        where: {
          id,
          uid: userid, // 只能自己的文章
        },
      };

      // todo，待验证，修改不改变内容，影响行数应该为0
      const result = await this.app.mysql.update('posts', row, options);
      return result.affectedRows === 1;
    } catch (err) {
      this.logger.error('PostService::delete error: %j', err);
    }
    return false;
  }

  async getForEdit(id, current_user) {
    // const post = await this.app.mysql.get('posts', { id });
    const posts = await this.app.mysql.query(
      'SELECT id, username, author, title, short_content, hash, status, onchain_status, create_time, fission_factor, '
      + 'cover, is_original, channel_id, fission_rate, referral_rate, uid, is_recommend, category_id FROM posts WHERE id = ?;',
      [ id ]
    );
    const post = posts[0];
    return this.getPostProfile(post, current_user);
  }

  async transferOwner(uid, signid, current_uid) {
    const post = await this.app.mysql.get('posts', { id: signid });
    if (!post) {
      return 2;
    }

    if (post.uid !== current_uid) {
      return 3;
    }

    const user = await this.app.mysql.get('users', { id: uid });
    if (!user) {
      return 4;
    }

    if (!user.accept) {
      return 5;
    }

    const conn = await this.app.mysql.beginTransaction();
    try {
      await conn.update('posts', {
        username: user.username,
        author: user.username,
        uid,
        platform: user.platform,
      }, { where: { id: post.id } });

      await conn.insert('post_transfer_log', {
        postid: signid,
        fromuid: current_uid,
        touid: uid,
        type: 'post',
        create_time: moment().format('YYYY-MM-DD HH:mm:ss'),
      });

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      this.ctx.logger.error(err);
      return 6;
    }

    return 0;
  }

  async uploadImage(filename, filelocation) {
    const ctx = this.ctx;

    let result = null;
    try {
      result = await ctx.oss.put(filename, filelocation);
      await fs.unlinkSync(filelocation);
    } catch (err) {
      this.app.logger.error('PostService:: uploadImage error: %j', err);
      return 2;
    }

    if (!result) {
      return 3;
    }

    this.app.logger.info('PostService:: uploadImage success: ' + filename);
    return 0;
  }

  async ipfsUpload(data) {
    let add = null;
    try {
      // 建立连接并上传
      // const ipfs = IpfsHttpClientLite(this.config.ipfs_service.site);
      add = await this.service.ipfs.add(data);
    } catch (err) {
      this.logger.error('PostService:: ipfsUpload Error', err);
      return null;
    }
    return add; // add[0].hash
  }

  async ipfsCatch(hash) {
    let data = null;
    try {
      // 建立连接并获取
      // const ipfs = IpfsHttpClientLite(this.config.ipfs_service.site);
      data = await this.service.ipfs.cat(hash);
    } catch (err) {
      this.logger.error('PostService:: ipfsUpload Error', err);
      return null;
    }
    return data;
  }

  async stats() {
    const sql = `SELECT COUNT(1) as count FROM users; 
                  SELECT COUNT(1) as count FROM posts; 
                  SELECT SUM(amount) as amount FROM assets_points;`;

    const queryResult = await this.app.mysql.query(sql);

    return { users: queryResult[0][0].count, articles: queryResult[1][0].count, points: queryResult[2][0].amount };
  }
}

module.exports = PostService;
