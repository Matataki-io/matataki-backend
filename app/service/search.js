'use strict';

const Service = require('egg').Service;
const elastic = require('@elastic/elasticsearch');
const moment = require('moment');
const consts = require('./consts');

class SearchService extends Service {
  constructor(ctx, app) {
    super(ctx, app);
    // const elaClient = new elastic.Client({ node: this.config.elasticsearch.host });
    this.app.mysql.queryFormat = function(query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function(txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    };
  }

  async searchPost(keyword, channelId = null, page = 1, pagesize = 10) {
    this.logger.info('SearchService:: SearchPost for', keyword);
    let postQuery;
    const elasticClient = new elastic.Client({ node: this.config.elasticsearch.host });
    const searchProject = {
      index: this.config.elasticsearch.indexPosts,
      from: pagesize * (page - 1),
      size: 1 * pagesize,
      body: {
        query: {
          // match: {
          //   content: keyword,
          // },
          // multi_match: {
          //   query: keyword,
          //   fields: [ 'nickname', 'title', 'content' ],
          // },

          // 时间影响评分
          function_score: {
            functions: [
              {
                exp: {
                  create_time: {
                    origin: 'now',
                    offset: '0d',
                    scale: '30d',
                  },
                },
              },
            ],
            query: {
              // 接下来会被填充
            },
          },
        },
        // 高亮设置
        highlight: {
          fields: {
            // content: {},
            // nickname: {},
            title: {},
            content: {},
          },
        },
      },
    };
    // 指定category查询
    if (channelId) {
      // searchProject.body.query.function_score.query.push({ term: { channel_id: channelId } });
      searchProject.body.query.function_score.query = {
        bool: {
          must: [
            { term: { channel_id: channelId } },
            {
              bool: {
                // 匹配标题和内容其中一个
                should: [
                  { match: { title: keyword } },
                  { match: { content: keyword } },
                ],
              },
            },
          ],
        },
      };
    } else {
      searchProject.body.query.function_score.query = {
        bool: {
          should: [
            { match: { title: keyword } },
            { match: { content: keyword } },
          ],
        },
      };
    }

    try {
      postQuery = await elasticClient.search(searchProject);
    } catch (err) {
      this.logger.error('SearchService:: SearchPost: error: ', err.message);
      return null;
    }
    // const postQuery = await elasticClient.search(searchProject);

    // const resultList = [];
    const postIds = [];
    // let matches = {};
    const count = postQuery.body.hits.total.value;
    // 加了多匹配之后， 没有匹配到的项目在highlight里面没有
    for (let hIndex = 0; hIndex < postQuery.body.hits.hits.length; hIndex += 1) {
      postIds.push(postQuery.body.hits.hits[hIndex]._source.id);
    }
    this.logger.info('SearchService:: SearchPost ids', postIds);

    // 传统的获取文章列表方法
    let postList = await this.service.post.getPostList(postIds, { short_content: true });

    this.logger.info('SearchService:: SearchPost postList.length', postList.length);

    // 再度排序
    postList = postList.sort((a, b) => {
      return postIds.indexOf(a.id) - postIds.indexOf(b.id);
    });

    // 填充高亮匹配信息
    for (let pIndex = 0; pIndex < postList.length; pIndex += 1) {
      if (postQuery.body.hits.hits[pIndex].highlight.title) {
        postList[pIndex].title = postQuery.body.hits.hits[pIndex].highlight.title[0];
      } else {
        postList[pIndex].title = postQuery.body.hits.hits[pIndex]._source.title;
      }

      if (postQuery.body.hits.hits[pIndex].highlight.content) {
        let new_content = '';
        for (let cIndex = 0; cIndex < postQuery.body.hits.hits[pIndex].highlight.content.length; cIndex += 1) {
          new_content += (postQuery.body.hits.hits[pIndex].highlight.content[cIndex] + '...');
        }
        postList[pIndex].short_content = new_content;
      }
    }

    return { count, list: postList };
  }

  async searchUser(keyword, page = 1, pagesize = 10, current_user = null) {
    let userQuery;
    const elasticClient = new elastic.Client({ node: this.config.elasticsearch.host });
    const searchProject = {
      index: this.config.elasticsearch.indexUsers,
      from: pagesize * (page - 1),
      size: 1 * pagesize,
      body: {
        query: {
          bool: {
            should: [
              // { match: { nickname: keyword } },
              {
                multi_match: {
                  query: keyword,
                  fields: [ 'nickname', 'nickname.english' ],
                  type: 'most_fields',
                },
              },
              { match: { username: keyword } },
            ],
          },
        },
        highlight: {
          fields: {
            nickname: {},
            'nickname.english': {},
            username: {},
          },
        },
      },
    };

    try {
      userQuery = await elasticClient.search(searchProject);
    } catch (err) {
      this.logger.error('SearchService:: SearchUser: error: ', err.message);
      return null;
    }
    // return userQuery;

    const userIds = [];
    const count = userQuery.body.hits.total.value;
    const list = userQuery.body.hits.hits;

    // 生成userid列表
    for (let i = 0; i < list.length; i++) {
      userIds.push(list[i]._source.id);
    }

    if (userIds.length === 0) {
      return { count: 0, list: [] };
    }

    // 获取详情
    let userList = await this.service.user.getUserList(userIds, current_user);

    // 重排序
    userList = userList.sort((a, b) => {
      return userIds.indexOf(a.id) - userIds.indexOf(b.id);
    });

    // 填充高亮匹配信息
    for (let i = 0; i < list.length; i += 1) {
      if (list[i].highlight['nickname.english']) userList[i].nickname = list[i].highlight['nickname.english'][0];
      if (list[i].highlight.nickname) userList[i].nickname = list[i].highlight.nickname[0];

      if (list[i].highlight.username) userList[i].username = list[i].highlight.username[0];
    }

    return { count, list: userList };
  }

  async precisePost(postId) {
    // const thePost = await this.app.mysql.query(
    //   'SELECT p.id AS postid, p.username, p.create_time, u.nickname, p.title, p.short_content '
    //   + 'FROM posts p LEFT JOIN users u ON p.uid = u.id WHERE p.id = ?;',
    //   [ postId ]
    // );

    const postList = await this.service.post.getPostList([ postId ], { short_content: true });

    if (postList.length === 0) {
      return { count: 0, list: [] };
    }
    return { count: 1, list: postList };
  }

  // 新建和更新文章， 都可以用这个
  async importPost(postId, userid, title, content) {
    const author = await this.service.user.get(userid);

    if (author.length === 0) {
      return null;
    }
    // const post = await this.app.mysql.get('posts', { id: postId });

    const elaClient = new elastic.Client({ node: this.config.elasticsearch.host });
    try {
      await elaClient.index({
        id: postId,
        index: this.config.elasticsearch.indexPosts,
        body: {
          id: postId,
          create_time: moment(),
          title,
          content,
          channel_id: 1,
        },
      });
    } catch (err) {
      this.logger.error('SearchService:: importPost: error ', err);
      return null;
    }
  }

  async deletePost(postId) {
    const elaClient = new elastic.Client({ node: this.config.elasticsearch.host });

    try {
      await elaClient.delete({
        id: postId,
        index: this.config.elasticsearch.indexPosts,
      });
    } catch (err) {
      this.logger.error('SearchService:: deletePost: error ', err);
      return null;
    }
    return 1;
  }

  // todo：增加一种方式直接传入user对象
  async importUser(userid) {
    this.logger.info('searchService importUser uid', userid);
    const user = await this.app.mysql.query(
      'SELECT id, username, nickname, platform FROM users WHERE id = ?;',
      [ userid ]
    );
    this.logger.info('searchService importUser user', user);
    if (user.length === 0) {
      return null;
    }

    // 交易所虚拟账号不要插入ES
    if (user[0].platform === consts.platforms.cny) {
      return null;
    }

    const elaClient = new elastic.Client({ node: this.config.elasticsearch.host });
    try {
      await elaClient.index({
        id: userid,
        index: this.config.elasticsearch.indexUsers,
        body: {
          id: userid,
          create_time: user[0].create_time,
          username: user[0].username,
          nickname: user[0].nickname,
        },
      });
    } catch (err) {
      this.logger.error('SearchService:: importUser index: error ', err);
      return null;
    }
    return 1;
  }

  // 每搜索一次，次数+1
  async writeLog(word, area) {
    const now = moment().format('YYYY-MM-DD HH:mm:ss');
    try {
      await this.app.mysql.query(
        'INSERT INTO search_count (word, create_time, update_time, search_count, search_area) VALUES (:word, :now, :now, 1, :area)'
        + ' ON DUPLICATE KEY UPDATE search_count = search_count + 1, update_time = :now;',
        { word, now, area }
      );
    } catch (err) {
      this.ctx.logger.error('SearchService:: writeLog: error: ', err);
      return 1;
    }
    return 0;
  }

  // 返回次数最多的几条搜索
  async recommendWord(amount = 5, area = 1) {
    let result = [];
    try {
      result = await this.app.mysql.query(
        'SELECT word FROM search_count WHERE search_area = :area ORDER BY search_count DESC, update_time DESC LIMIT :amount;',
        { area, amount }
      );
    } catch (err) {
      this.logger.error('SearchService:: RecommendWord: error ', err);
      return null;
    }
    return result;
  }
  async searchShare(keyword, page = 1, pagesize = 10) {
    this.logger.info('SearchService:: Search share for', keyword);
    let shareQuery;
    const elasticClient = new elastic.Client({ node: this.config.elasticsearch.host });
    const searchProject = {
      index: this.config.elasticsearch.indexShares,
      from: pagesize * (page - 1),
      size: 1 * pagesize,
      body: {
        query: {
          // 时间影响评分
          function_score: {
            functions: [
              {
                exp: {
                  create_time: {
                    origin: 'now',
                    offset: '0d',
                    scale: '30d',
                  },
                },
              },
            ],
            query: {
              bool: {
                should: [
                  { match: { content: keyword } },
                ],
              },
            },
          },
        },
        // 高亮设置
        highlight: {
          fields: {
            content: {},
          },
        },
      },
    };
    try {
      shareQuery = await elasticClient.search(searchProject);
    } catch (err) {
      this.logger.error('SearchService:: SearchShare: error: ', err);
      return null;
    }
    const shareIds = [];
    const count = shareQuery.body.hits.total.value;
    const list = shareQuery.body.hits.hits;

    // 生成 shareIds 列表
    for (let i = 0; i < list.length; i++) {
      shareIds.push(list[i]._source.id);
    }
    if (shareIds.length === 0) {
      return { count: 0, list: [] };
    }

    // 获取详情
    const shareList = await this.app.mysql.query(
      `SELECT a.id, a.uid, a.author, a.title, a.hash, a.create_time, a.cover, a.require_holdtokens, a.require_buy, a.short_content,
      b.nickname, b.avatar,
      c.real_read_count AS \`read\`, c.likes
      FROM posts a
      LEFT JOIN users b ON a.uid = b.id
      LEFT JOIN post_read_count c ON a.id = c.post_id
      WHERE a.id IN (:shareIds)
      ORDER BY FIELD(a.id, :shareIds);`,
      { shareIds }
    );

    // 填充高亮匹配信息
    for (let i = 0; i < list.length; i++) {
      if (list[i].highlight.content) shareList[i].short_content = list[i].highlight.content[0];
    }

    return { count, list: shareList };
  }
  async searchToken(keyword, page = 1, pagesize = 10) {
    let tokenQuery;
    const elasticClient = new elastic.Client({ node: this.config.elasticsearch.host });
    const searchProject = {
      index: this.config.elasticsearch.indexTokens,
      from: pagesize * (page - 1),
      size: 1 * pagesize,
      body: {
        query: {
          bool: {
            // name, symbol, brief, introduction, contract_address
            should: [
              { match: { name: keyword } },
              { match: { symbol: keyword } },
              { match: { brief: keyword } },
              { match: { introduction: keyword } },
              { match: { contract_address: keyword } },
            ],
          },
        },
        highlight: {
          fields: {
            name: {},
            symbol: {},
            brief: {},
            introduction: {},
            contract_address: {},
          },
        },
      },
    };

    try {
      tokenQuery = await elasticClient.search(searchProject);
    } catch (err) {
      this.logger.error('SearchService:: SearchUser: error: ', err.message);
      return null;
    }

    const tokenIds = [];
    const count = tokenQuery.body.hits.total.value;
    const list = tokenQuery.body.hits.hits;

    // 生成 tokenIds 列表
    for (let i = 0; i < list.length; i++) {
      tokenIds.push(list[i]._source.id);
    }

    if (tokenIds.length === 0) {
      return { count: 0, list: [] };
    }

    // 获取详情
    const tokenList = await this.app.mysql.query(
      `SELECT id, uid, \`name\`, symbol, decimals, total_supply, create_time, logo, brief, introduction, contract_address
      FROM minetokens
      WHERE id IN (:tokenIds)
      ORDER BY FIELD(id, :tokenIds);`,
      { tokenIds }
    );

    // 填充高亮匹配信息
    for (let i = 0; i < list.length; i++) {
      if (list[i].highlight.name) tokenList[i].name = list[i].highlight.name[0];
      if (list[i].highlight.symbol) tokenList[i].symbol = list[i].highlight.symbol[0];
      if (list[i].highlight.brief) tokenList[i].brief = list[i].highlight.brief[0];
      if (list[i].highlight.introduction) tokenList[i].introduction = list[i].highlight.introduction[0];
      if (list[i].highlight.contract_address) tokenList[i].contract_address = list[i].highlight.contract_address[0];
    }

    return { count, list: tokenList };
  }
  async searchDbToken(keyword, page = 1, pagesize = 10) {
    const pi = parseInt(page);
    const pz = parseInt(pagesize);
    const wd = keyword.toLowerCase();
    const whereSql = 'WHERE LOWER(name) REGEXP :wd OR LOWER(symbol) REGEXP :wd';
    const result = await this.app.mysql.query(`
    SELECT uid, name, symbol, logo FROM minetokens ${whereSql} LIMIT :start, :end;
    SELECT count(1) as count FROM minetokens ${whereSql};
    `, {
      wd,
      start: (pi - 1) * pz, end: pz,
    });
    const list = result[0];
    const count = result[1][0].count;

    return {
      list,
      count,
    };
  }
  async searchDbTokenByUser(keyword, page = 1, pagesize = 10) {
    const pi = parseInt(page);
    const pz = parseInt(pagesize);
    const wd = keyword.toLowerCase();
    const uid = this.ctx.user.id;
    const whereSql = 'WHERE (am.uid = :uid AND am.amount > 0) AND (LOWER(m.name) REGEXP :wd OR LOWER(m.symbol) REGEXP :wd)';
    const result = await this.app.mysql.query(`
    SELECT m.id, m.name, m.symbol, m.logo FROM assets_minetokens AS am LEFT JOIN minetokens AS m ON am.token_id = m.id ${whereSql} LIMIT :start, :end;
    SELECT COUNT(1) AS count FROM assets_minetokens AS am LEFT JOIN minetokens AS m ON am.token_id = m.id ${whereSql};
    `, {
      uid,
      wd,
      start: (pi - 1) * pz, end: pz,
    });
    const list = result[0];
    const count = result[1][0].count;

    return {
      list,
      count,
    };
  }
  async searchDbTag(keyword, page, pagesize) {
    const pi = parseInt(page);
    const pz = parseInt(pagesize);
    const wd = keyword.toLowerCase();
    const whereSql = 'WHERE LOWER(name) REGEXP :wd';
    const _sql = `SELECT id, name FROM tags ${whereSql} LIMIT :start, :end;
                  SELECT COUNT(1) AS count FROM tags ${whereSql};`;
    try {
      const result = await this.app.mysql.query(_sql, { wd, start: (pi - 1) * pz, end: pz });
      const list = result[0];
      const count = result[1][0].count;
      return {
        list,
        count,
      };
    } catch (e) {
      this.logger.error('searchDbTag error', e.toString());
      return {
        list: [],
        count: 0,
      };
    }
  }
  async importShare({ id, content }) {
    this.logger.error('SearchService:: importShare: start ', { id, content });

    const elaClient = new elastic.Client({ node: this.config.elasticsearch.host });
    try {
      await elaClient.index({
        id,
        index: this.config.elasticsearch.indexShares,
        body: {
          id,
          create_time: moment(),
          channel_id: 3,
          content,
        },
      });
    } catch (err) {
      this.logger.error('SearchService:: importPost: error ', err);
      return null;
    }
  }
  async importToken({ id, name, symbol, brief, introduction, contract_address }) {
    this.logger.error('SearchService:: importToken: start ', { id, name, symbol, brief, introduction, contract_address });

    const elaClient = new elastic.Client({ node: this.config.elasticsearch.host });
    try {
      await elaClient.index({
        id,
        index: this.config.elasticsearch.indexTokens,
        body: {
          id,
          create_time: moment(),
          name,
          symbol,
          brief,
          introduction,
          contract_address,
        },
      });
    } catch (err) {
      this.logger.error('SearchService:: importToken: error ', err);
      return null;
    }
  }
  async importTag({ id, name }) {
    this.logger.info('SearchService:: importTag: start ', { id, name });

    const elaClient = new elastic.Client({ node: this.config.elasticsearch.host });
    try {
      await elaClient.index({
        id,
        index: this.config.elasticsearch.indexTags,
        body: {
          id,
          create_time: moment(),
          name,
        },
      });
    } catch (err) {
      this.logger.error('SearchService:: importToken: error ', err);
      return null;
    }
  }
  async searchTag(keyword, page = 1, pagesize = 10) {
    let tagQuery;
    const elasticClient = new elastic.Client({ node: this.config.elasticsearch.host });
    const searchProject = {
      index: this.config.elasticsearch.indexTags,
      from: pagesize * (page - 1),
      size: 1 * pagesize,
      body: {
        query: {
          bool: {
            should: [
              { match: { name: keyword } },
            ],
          },
        },
        highlight: {
          fields: {
            name: {},
          },
        },
      },
    };

    try {
      tagQuery = await elasticClient.search(searchProject);
    } catch (err) {
      this.logger.error('SearchService:: searchTag: keyword: ', keyword, 'error ', err.message);
      return null;
    }

    const tagIds = [];
    const count = tagQuery.body.hits.total.value;
    const list = tagQuery.body.hits.hits;

    // 生成tagIds列表
    for (let i = 0; i < list.length; i++) {
      tagIds.push(list[i]._source.id);
    }

    if (tagIds.length === 0) {
      return { count: 0, list: [] };
    }

    // 获取详情
    const tagList = await this.app.mysql.query(
      `SELECT COUNT(DISTINCT sid) AS num, t.id, t.name, t.create_time, t.type FROM post_tag pt
      LEFT JOIN tags t ON pt.tid = t.id
      LEFT JOIN posts p ON p.id = pt.sid
      WHERE p.status = 0 AND p.channel_id = 1 AND t.id IN (:tagIds)
      GROUP BY pt.tid, t.id, t.name, t.create_time, t.type
      ORDER BY FIELD(t.id, :tagIds);`,
      { tagIds }
    );

    // 填充高亮匹配信息
    for (let i = 0; i < list.length; i++) {
      if (list[i].highlight.name) tagList[i].name = list[i].highlight.name[0];
    }

    return { count, list: tagList };
  }
  async searchUser2DB(keyword, page = 1, pagesize = 10, current_user = null) {
    const pi = parseInt(page);
    const pz = parseInt(pagesize);
    const whereSql = `
    WHERE (username REGEXP :keyword OR nickname REGEXP :keyword) AND platform != 'cny'
    `;
    const result = await this.app.mysql.query(`
    SELECT id FROM users ${whereSql} LIMIT :start, :end;
    SELECT count(*) as count FROM users ${whereSql};
    `, {
      keyword,
      start: (pi - 1) * pz, end: pz,
    });
    const list = result[0];
    const count = result[1][0].count;

    const userIds = [];
    // 生成userid列表
    for (let i = 0; i < list.length; i++) {
      userIds.push(list[i].id);
    }

    if (userIds.length === 0) {
      return { count: 0, list: [] };
    }

    // 获取详情
    const userList = await this.service.user.getUserList(userIds, current_user);

    return {
      list: userList,
      count,
    };
  }
}

module.exports = SearchService;
