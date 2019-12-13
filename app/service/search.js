'use strict';

const Service = require('egg').Service;
const elastic = require('@elastic/elasticsearch');
const moment = require('moment');
const consts = require('./consts');

class SearchService extends Service {
  constructor(ctx, app) {
    super(ctx, app);
    // const elaClient = new elastic.Client({ node: this.config.elasticsearch.host });
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

  async searchPost(keyword, channelId = null, page = 1, pagesize = 10) {
    this.logger.info('SearchService:: Search for', keyword);
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
      this.logger.error('SearchService:: SearchPost: error: ', err);
      return null;
    }
    // const postQuery = await elasticClient.search(searchProject);

    // const resultList = [];
    const postids = [];
    // let matches = {};
    const count = postQuery.body.hits.total.value;
    // 加了多匹配之后， 没有匹配到的项目在highlight里面没有
    for (let hindex = 0; hindex < postQuery.body.hits.hits.length; hindex += 1) {
      postids.push(postQuery.body.hits.hits[hindex]._source.id);
    }

    // 传统的获取文章列表方法
    let postList = await this.service.post.getPostList(postids, { short_content: true });

    // 再度排序
    postList = postList.sort((a, b) => {
      return postids.indexOf(a.id) - postids.indexOf(b.id);
    });

    // 填充高亮匹配信息
    for (let pindex = 0; pindex < postList.length; pindex += 1) {
      if (postQuery.body.hits.hits[pindex].highlight.title) {
        postList[pindex].title = postQuery.body.hits.hits[pindex].highlight.title[0];
      } else {
        postList[pindex].title = postQuery.body.hits.hits[pindex]._source.title;
      }

      if (postQuery.body.hits.hits[pindex].highlight.content) {
        let new_content = '';
        for (let cindex = 0; cindex < postQuery.body.hits.hits[pindex].highlight.content.length; cindex += 1) {
          new_content += (postQuery.body.hits.hits[pindex].highlight.content[cindex] + '...');
        }
        postList[pindex].short_content = new_content;
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
              { match: { nickname: keyword } },
              { match: { username: keyword } },
            ],
          },
        },
        highlight: {
          fields: {
            nickname: {},
            username: {},
          },
        },
      },
    };

    try {
      userQuery = await elasticClient.search(searchProject);
    } catch (err) {
      this.logger.error('SearchService:: SearchUser: error: ', err);
      return null;
    }

    const userids = [];
    const count = userQuery.body.hits.total.value;

    // 生成userid列表
    for (let uindex = 0; uindex < userQuery.body.hits.hits.length; uindex += 1) {
      userids.push(userQuery.body.hits.hits[uindex]._source.id);
    }

    // 获取详情
    let userList = await this.service.user.getUserList(userids, current_user);

    // 重排序
    userList = userList.sort((a, b) => {
      return userids.indexOf(a.id) - userids.indexOf(b.id);
    });

    // 填充高亮匹配信息
    for (let uindex = 0; uindex < userQuery.body.hits.hits.length; uindex += 1) {
      if (userQuery.body.hits.hits[uindex].highlight.nickname) {
        userList[uindex].nickname = userQuery.body.hits.hits[uindex].highlight.nickname[0];
      }

      if (userQuery.body.hits.hits[uindex].highlight.username) {
        userList[uindex].username = userQuery.body.hits.hits[uindex].highlight.username[0];
      }
    }

    return { count, list: userList };
  }

  async precisePost(postid) {
    // const thePost = await this.app.mysql.query(
    //   'SELECT p.id AS postid, p.username, p.create_time, u.nickname, p.title, p.short_content '
    //   + 'FROM posts p LEFT JOIN users u ON p.uid = u.id WHERE p.id = ?;',
    //   [ postid ]
    // );

    const postList = await this.service.post.getPostList([ postid ], { short_content: true });

    if (postList.length === 0) {
      return { count: 0, list: [] };
    }
    return { count: 1, list: postList };
  }

  // 新建和更新文章， 都可以用这个
  async importPost(postid, userid, title, content) {
    const author = await this.service.user.get(userid);

    if (author.length === 0) {
      return null;
    }

    const elaClient = new elastic.Client({ node: this.config.elasticsearch.host });
    try {
      await elaClient.index({
        id: postid,
        index: this.config.elasticsearch.indexPosts,
        body: {
          id: postid,
          create_time: moment(),
          // uid: author[0].id,
          // username: author[0].username,
          // nickname: author[0].nickname,
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

  async deletePost(postid) {
    const elaClient = new elastic.Client({ node: this.config.elasticsearch.host });

    try {
      await elaClient.delete({
        id: postid,
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
    const user = await this.app.mysql.query(
      'SELECT id, username, nickname, platform FROM users WHERE id = ?;',
      [ userid ]
    );
    if (user.length === 0) {
      return null;
    }

    // 交易所虚拟账号不要插入ES
    if (user[0].platform === consts.platforms.cny) {
      return null;
    }

    const elaClient = new elastic.Client({ node: this.config.elasticsearch.host });
    try {
      elaClient.index({
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
      this.logger.error('SearchService:: deletePost: error ', err);
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
  async recommandWord(amount = 5, area = 1) {
    let result = [];
    try {
      result = await this.app.mysql.query(
        'SELECT word FROM search_count WHERE search_area = :area ORDER BY search_count DESC, update_time DESC LIMIT :amount;',
        { area, amount }
      );
    } catch (err) {
      this.logger.error('SearchService:: RecommandWord: error ', err);
      return null;
    }
    return result;
  }

}

module.exports = SearchService;

