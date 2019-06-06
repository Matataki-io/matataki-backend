'use strict';
const consts = require('./consts');

const Service = require('egg').Service;
const _ = require('lodash');

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
        return result.insertId;
      }
    } catch (err) {
      this.logger.error('PostService::publish error: %j', err);
    }

    return 0;
  }

  async create_tags(sid, tag_arr) {
    try {
      for (let i = 0; i < tag_arr.length; i++) {
        let id = tag_arr[i];
        let tag = await this.app.mysql.get('tags', { id });
        if (tag) {
          await this.app.mysql.insert("post_tag", { sid: sid, tid: tag.id });
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
      if (post.channel_id === consts.channels.product) {
        const prices = await this.app.mysql.select('product_prices', {
          where: { sign_id: post.id, status: 1 },
          columns: ['platform', 'symbol', 'price', 'decimals', 'stock_quantity'],
        });

        post.prices = prices;
      }

      // 阅读次数
      const read = await this.app.mysql.query(
        'select real_read_count num from post_read_count where post_id = ? ',
        [post.id]
      );
      post.read = read[0] ? read[0].num : 0;

      // 被赞次数
      const ups = await this.app.mysql.query(
        'select count(*) as ups from supports where signid = ? and status = 1 ',
        [post.id]
      );
      post.ups = ups[0].ups;

      // tags 
      const tags = await this.app.mysql.query(
        'select a.id, a.name from tags a left join post_tag b on a.id = b.tid where b.sid = ? ',
        [post.id]
      );

      post.tags = tags;

      // 当前用户是否已赞赏
      post.support = false;
      if (userId) {
        const support = await this.app.mysql.get('supports', { signid: post.id, uid: userId, status: 1 });
        if (support) {
          post.support = true;
        }
      }

      // 如果是商品，并且已经赞过查询出digital_copy，todo：适用数字copy类的商品，posts表还需要增加商品分类
      if (post.channel_id === consts.channels.product && post.support) {
        const product = await this.app.mysql.query(
          'select pp.title,digital_copy from product_stock_keys ps '
          + 'inner join supports s on s.id = ps.support_id '
          + 'inner join product_prices pp on pp.sign_id = ps.sign_id and pp.platform = s.platform and pp.symbol = s.symbol '
          + 'where s.uid=? and ps.sign_id=?;',
          [userId, post.id]
        );

        post.product = product;
      }

      // 被赞总金额
      const value = await this.app.mysql.query(
        'select sum(amount) as value from supports where signid = ? and symbol = ? and status = 1 ',
        [post.id, 'EOS']
      );
      post.value = value[0].value || 0;

      // ONT value
      const ont_value = await this.app.mysql.query(
        'select signid, sum(amount) as value from supports where signid = ? and symbol = ? and status=1  ',
        [post.id, 'ONT']
      );
      post.ontvalue = ont_value[0].value || 0;

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

  // 发布时间排序(默认方法)
  async timeRank(page = 1, pagesize = 20, author = null, channel = null) {
    this.app.mysql.queryFromat = function (query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function (txt, key) {
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
    if (author) {
      sqlcode = 'SELECT p.id FROM posts p WHERE p.status = 0 AND author = :author ';
      if (channel) {
        if (isNaN(channel)) {
          return 2;
        }
        sqlcode += 'AND p.channel_id = ' + channel + ' ';
      }
      sqlcode += 'GROUP BY p.id ORDER BY p.create_time DESC LIMIT :start, :end;';
      posts = await this.app.mysql.query(
        sqlcode,
        { author, start: (page - 1) * pagesize, end: 1 * pagesize }
      );
    } else {
      sqlcode = 'SELECT p.id FROM posts p WHERE p.status = 0 ';
      if (channel) {
        if (isNaN(channel)) {
          return 2;
        }
        sqlcode += 'AND p.channel_id = ' + channel + ' ';
      }
      sqlcode += 'GROUP BY p.id ORDER BY p.create_time DESC LIMIT :start, :end;';
      posts = await this.app.mysql.query(
        sqlcode,
        { start: (page - 1) * pagesize, end: 1 * pagesize }
      );
    }

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

  // 赞赏次数排序
  async supportRank(page = 1, pagesize = 20, channel = null) {
    this.app.mysql.queryFromat = function (query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function (txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    };

    let posts = null;
    let sqlcode = '';
    sqlcode = 'SELECT p.id, count(*) AS total FROM posts p '
      + 'LEFT JOIN supports s ON s.signid = p.id AND s.status = 1 '
      + 'WHERE p.status = 0 ';
    if (channel) {
      if (isNaN(channel)) {
        return 2;
      }
      sqlcode += 'AND p.channel_id = ' + channel + ' ';
    }
    sqlcode += 'GROUP BY p.id ORDER BY total DESC LIMIT :start, :end;';
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
      return a.ups > b.ups ? -1 : 1;
    });

    return postList;
  }

  // 分币种的赞赏金额排序
  // 请注意因为"后筛选"导致的不满20条,进而前端无法加载的问题.
  async amountRank(page = 1, pagesize = 20, symbol = 'EOS', channel = null) {
    this.app.mysql.queryFromat = function (query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function (txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    };

    let posts = null;
    let sqlcode = '';
    sqlcode = 'SELECT p.id, sum(amount) AS total FROM posts p '
      + 'LEFT JOIN supports s ON s.signid = p.id AND s.symbol = :symbol '
      + 'WHERE p.status = 0 ';
    if (channel) {
      if (isNaN(channel)) {
        return 2;
      }
      sqlcode += 'AND p.channel_id = ' + channel + ' ';
    }
    sqlcode += 'GROUP BY p.id ORDER BY total DESC LIMIT :start, :end;';
    // 在support表中, 由币种赞赏总量获得一个文章的排序, 并且已经确保文章是没有被删除的
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
          return a.eosvalue > b.eosvalue ? -1 : 1;
        });
        break;

      case 'ONT':
        postList = postList.sort((a, b) => {
          return a.ontvalue > b.ontvalue ? -1 : 1;
        });
        break;
    }

    return postList;
  }

  // 获取用户赞赏过的文章
  async supportedPosts(page = 1, pagesize = 20, username = null) {
    this.app.mysql.queryFromat = function (query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function (txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    };

    // 没写用户
    if (username === null) {
      return 2;
    }

    const user = await this.app.mysql.get('users', { username });

    // 不存在的用户
    if (!user) {
      return 3;
    }

    const posts = await this.app.mysql.query(
      'SELECT s.create_time, signid FROM supports s INNER JOIN posts p ON s.signid = p.id'
      + ' WHERE s.status = 1 AND p.status = 0 AND s.uid = :uid ORDER BY s.create_time DESC LIMIT :start, :end;',
      { uid: user.id, start: (page - 1) * pagesize, end: pagesize }
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
      return b.support_time - a.support_time;
    });

    return postList;
  }

  // 获取文章的列表, 用于成片展示文章时, 会被其他函数调用
  async getPostList(signids) {

    this.app.mysql.queryFromat = function (query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function (txt, key) {
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
    postList = await this.app.mysql.query(
      'SELECT a.id, a.author, a.title, a.short_content, a.hash, a.create_time, a.cover, b.nickname FROM posts a '
      + ' LEFT JOIN users b ON a.username = b.username WHERE a.id IN (?) AND a.status = 0 ORDER BY create_time DESC;',
      [signids]
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
      'SELECT post_id AS id, real_read_count AS num FROM post_read_count WHERE post_id IN (:signid);'
      + 'SELECT signid, sum(amount) AS value FROM supports WHERE signid IN (:signid) AND symbol = \'EOS\' AND status = 1 GROUP BY signid;'
      + 'SELECT signid, sum(amount) AS value FROM supports WHERE signid IN (:signid) AND symbol = \'ONT\' AND status = 1 GROUP BY signid;'
      + 'SELECT signid, count(*) AS ups FROM supports WHERE status=1 AND signid IN (:signid) GROUP BY signid;',
      { signid: signids }
    );

    // 分门类填充
    const read = stats[0];
    const eosvalue = stats[1];
    const ontvalue = stats[2];
    const ups = stats[3];

    // 分配数值到每篇文章
    _.each(postList, row => {
      _.each(read, row2 => {
        if (row.id === row2.id) {
          row.read = row2.num;
        }
      });
      _.each(eosvalue, row2 => {
        if (row.id === row2.signid) {
          row.eosvalue = row2.value;
        }
      });
      _.each(ups, row2 => {
        if (row.id === row2.signid) {
          row.ups = row2.ups;
        }
      });
      _.each(ontvalue, row2 => {
        if (row.id === row2.signid) {
          row.ontvalue = row2.value;
        }
      });
    });
    return postList;
  }

  // 删除文章
  async delete(id, username) {
    try {
      const row = {
        status: 1,
      };

      const options = {
        where: {
          id,
          username, // 只能自己的文章
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
    const post = await this.app.mysql.get('posts', { id, username: current_user });
    return post;
  }

}

module.exports = PostService;
