'use strict';
const consts = require('./consts');

const Service = require('egg').Service;
const _ = require('lodash');
const moment = require('moment');

class PostService extends Service {

  // constructor(ctx, app) {
  //   super(ctx, app);
  //   app.mysql.queryFromat = function(query, values) {
  //     if (!values) return query;
  //     return query.replace(/\:(\w+)/g, function(txt, key) {
  //       if (values.hasOwnProperty(key)) {
  //         return this.escape(values[key]);
  //       }
  //       return txt;
  //     }.bind(this));
  //   };
  // }

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
    const post = await this.app.mysql.get('posts', { hash });
    return this.getPostProfile(post, userId);
  }

  // 根据id获取文章
  async getById(id, userId) {
    const post = await this.app.mysql.get('posts', { id });
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
        'SELECT post_id AS id, real_read_count AS num, sale_count AS sale, support_count AS ups, eos_value_count AS eosvalue, ont_value_count AS ontvalue'
        + ' FROM post_read_count WHERE post_id = ?;',
        [ post.id ]
      );
      if (count.length) {
        post.read = count[0].num;
        post.sale = count[0].sale;
        post.ups = count[0].ups;
        post.value = count[0].eosvalue;
        post.ontvalue = count[0].ontvalue;
      } else {
        post.read = post.sale = post.ups = post.value = post.ontvalue = 0;
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

  // 发布时间排序(默认方法)
  async timeRank(page = 1, pagesize = 20, author = null, channel = null) {
    this.app.mysql.queryFromat = function(query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function(txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    };

    // 获取文章列表, 分为商品文章和普通文章
    // 再分为带作者和不带作者的情况.
    let posts = [];
    let sqlcode = '';
    sqlcode = 'SELECT p.id FROM posts p WHERE p.status = 0 ';
    if (author) {
      sqlcode += 'AND uid = :author ';
    }
    const channelid = parseInt(channel);
    if (channel !== null) {
      if (isNaN(channelid)) {
        return 2;
      }
      sqlcode += 'AND p.channel_id = ' + channelid + ' ';
    }
    sqlcode += 'ORDER BY p.id DESC LIMIT :start, :end;';
    posts = await this.app.mysql.query(
      sqlcode,
      { author, start: (page - 1) * pagesize, end: 1 * pagesize }
    );

    if (posts.length === 0) {
      return [];
    }

    const postids = [];
    _.each(posts, row => {
      postids.push(row.id);
    });

    const postList = await this.getPostList(postids);

    return postList;
  }

  async getPostByTag(page = 1, pagesize = 20, tagid) {
    const posts = await this.app.mysql.query(
      'select a.sid, a.tid, b.title from post_tag a left join posts b on a.sid=b.id where a.tid = ? limit ?,?',
      [ tagid, (page - 1) * pagesize, pagesize ]
    );

    // 将文章id转为Array
    const postids = [];
    _.each(posts, row => {
      postids.push(row.sid);
    });

    if (postids.length === 0) {
      return [];
    }

    const postList = await this.getPostList(postids);

    return postList;
  }

  // 赞赏次数排序
  async supportRank(page = 1, pagesize = 20, channel = null) {
    this.app.mysql.queryFromat = function(query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function(txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    };

    let posts = null;
    let sqlcode = '';

    // 获取文章id列表, 按照统计表的赞赏次数排序
    sqlcode = 'SELECT p.id, c.support_count FROM posts p '
      + 'LEFT JOIN post_read_count c ON c.post_id = p.id '
      + 'WHERE p.status = 0 ';
    const channelid = parseInt(channel);
    if (channel !== null) {
      if (isNaN(channelid)) {
        return 2;
      }
      sqlcode += 'AND p.channel_id = ' + channelid + ' ';
    }
    sqlcode += 'ORDER BY c.support_count DESC, p.id DESC LIMIT :start, :end;';
    // 在support表中, 由赞赏次数获得一个文章的排序, 并且已经确保文章是没有被删除的
    posts = await this.app.mysql.query(
      sqlcode,
      { start: (page - 1) * pagesize, end: 1 * pagesize }
    );

    // 将文章id转为Array
    const postids = [];
    _.each(posts, row => {
      postids.push(row.id);
    });

    if (postids.length === 0) {
      return [];
    }

    let postList = await this.getPostList(postids);

    // 由赞赏次数进行排序
    // 还没加上时间降序
    postList = postList.sort((a, b) => {
      if (a.ups === b.ups) {
        return a.id > b.id ? -1 : 1;
      }
      return a.ups > b.ups ? -1 : 1;
    });

    return postList;
  }

  // 分币种的赞赏金额排序
  // 请注意因为"后筛选"导致的不满20条,进而前端无法加载的问题.
  async amountRank(page = 1, pagesize = 20, symbol = 'EOS', channel = null) {
    this.app.mysql.queryFromat = function(query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function(txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    };

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

  // 获取用户赞赏过的文章
  async supportedPosts(page = 1, pagesize = 20, userid = null, channel = null) {
    this.app.mysql.queryFromat = function(query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function(txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    };

    // 没写用户
    if (userid === null) {
      return 2;
    }

    let sqlcode = 'SELECT s.create_time, signid FROM supports s INNER JOIN posts p ON s.signid = p.id'
      + ' WHERE s.status = 1 AND p.status = 0 AND s.uid = :uid ';

    const channelid = parseInt(channel);
    if (channel) {
      if (isNaN(channelid)) {
        return 2;
      }
      sqlcode += 'AND p.channel_id = ' + channelid;
    }

    sqlcode += ' ORDER BY s.create_time DESC LIMIT :start, :end;';

    const posts = await this.app.mysql.query(
      sqlcode,
      { uid: userid, start: (page - 1) * pagesize, end: pagesize }
    );

    const postids = [];
    _.each(posts, row => {
      postids.push(row.signid);
    });

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

    return postList;
  }

  async recommendPosts(channel = null, amount = 5) {
    this.app.mysql.queryFromat = function(query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function(txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    };

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
    }

    const postList = await this.getPostList(postids);

    return postList;
  }

  // 获取文章的列表, 用于成片展示文章时, 会被其他函数调用
  async getPostList(signids) {

    this.app.mysql.queryFromat = function(query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function(txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    };

    let postList = [];

    if (signids.length === 0) {
      return postList;
    }
    // 查询文章和作者的信息, 结果是按照时间排序
    // 如果上层也需要按照时间排序的, 则无需再排, 需要其他排序方式则需再排
    postList = await this.app.mysql.query(
      'SELECT a.id, a.uid, a.author, a.title, a.short_content, a.hash, a.create_time, a.cover, b.nickname, b.avatar FROM posts a '
      + ' LEFT JOIN users b ON a.uid = b.id WHERE a.id IN (?) AND a.status = 0 ORDER BY id DESC;',
      [ signids ]
    );

    const hashs = [];

    // 准备需要返回的数据
    _.each(postList, row => {
      row.read = 0;
      row.eosvalue = 0;
      row.ups = 0;
      row.ontvalue = 0;
      hashs.push(row.hash);
    });

    // 有关阅读次数,赞赏金额,赞赏次数的统计
    const stats = await this.app.mysql.query(
      'SELECT post_id AS id, real_read_count AS num, sale_count AS sale, support_count AS ups, eos_value_count AS eosvalue, ont_value_count AS ontvalue'
      + ' FROM post_read_count WHERE post_id IN (:signid);',
      { signid: signids }
    );

    // 分配数值到每篇文章
    _.each(postList, row => {
      _.each(stats, row2 => {
        if (row.id === row2.id) {
          row.read = row2.num;
          row.sale = row2.sale;
          row.eosvalue = row2.eosvalue;
          row.ups = row2.ups;
          row.ontvalue = row2.ontvalue;
        }
      });
    });
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
    const post = await this.app.mysql.get('posts', { id });
    return this.getPostProfile(post, current_user);
  }

  async transferOwner(uid, signid, current_uid) {
    const post = await this.app.mysql.get('posts', { id: signid });
    if (!post) {
      throw new Error('post not found');
    }

    if (post.uid !== current_uid) {
      throw new Error('not your post');
    }

    const user = await this.app.mysql.get('users', { id: uid });
    if (!user) {
      throw new Error('user not found');
    }

    if (!user.accept) {
      throw new Error('target user not accept owner transfer');
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
      return false;
    }

    return true;
  }

}

module.exports = PostService;
