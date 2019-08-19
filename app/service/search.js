'use strict';

const Service = require('egg').Service;
const elastic = require('@elastic/elasticsearch');
const moment = require('moment');

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
    let postQuery;
    const elasticClient = new elastic.Client({ node: this.config.elasticsearch.host });
    const searchProject = {
      index: 'posts',
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
            { bool: {
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

    const resultList = [];
    let matches = {};
    const count = postQuery.body.hits.total.value;
    // 加了多匹配之后， 没有匹配到的项目在highlight里面没有
    for (let hindex = 0; hindex < postQuery.body.hits.hits.length; hindex += 1) {
      matches = {};
      matches.postid = postQuery.body.hits.hits[hindex]._source.id;
      matches.uid = postQuery.body.hits.hits[hindex]._source.uid;
      matches.username = postQuery.body.hits.hits[hindex]._source.username;
      matches.create_time = postQuery.body.hits.hits[hindex]._source.create_time;
      matches.nickname = postQuery.body.hits.hits[hindex]._source.nickname;
      matches.channel_id = postQuery.body.hits.hits[hindex]._source.channel_id;

      // if (postQuery.body.hits.hits[hindex].highlight.nickname) {
      //   matches.nickname = postQuery.body.hits.hits[hindex].highlight.nickname[0];
      // } else {
      //   matches.nickname = postQuery.body.hits.hits[hindex]._source.nickname;
      // }

      if (postQuery.body.hits.hits[hindex].highlight.title) {
        matches.title = postQuery.body.hits.hits[hindex].highlight.title[0];
      } else {
        matches.title = postQuery.body.hits.hits[hindex]._source.title;
      }

      if (postQuery.body.hits.hits[hindex].highlight.content) {
        matches.content = postQuery.body.hits.hits[hindex].highlight.content;
      } else {
        matches.content = [];
      }

      matches.content.push(postQuery.body.hits.hits[hindex]._source.content.substring(0, 200));
      resultList.push(matches);
    }
    return { count, list: resultList };
  }

  async precisePost(postid) {
    const thePost = await this.app.mysql.query(
      'SELECT p.id AS postid, p.username, p.create_time, u.nickname, p.title, p.short_content '
      + 'FROM posts p LEFT JOIN users u ON p.uid = u.id WHERE p.id = ?;',
      [ postid ]
    );
    if (thePost.length === 0) {
      return { count: 0, list: [] };
    }
    const post = thePost[0];
    post.content = [];
    post.content.push(post.short_content);
    delete post.short_content;
    return { count: 1, list: [ post ] };
  }

  // 新建和更新文章， 都可以用这个
  async importPost(postid, userid, title, content) {
    const author = await this.app.mysql.query(
      'SELECT id, username, nickname FROM users WHERE id = ?;',
      [ userid ]
    );
    if (author.length === 0) {
      return null;
    }

    const elaClient = new elastic.Client({ node: this.config.elasticsearch.host });
    try {
      await elaClient.index({
        id: postid,
        index: 'posts',
        body: {
          id: postid,
          create_time: moment(),
          uid: author[0].id,
          username: author[0].username,
          nickname: author[0].nickname,
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
        index: 'posts',
      });
    } catch (err) {
      this.logger.error('SearchService:: deletePost: error ', err);
      return null;
    }
    return 1;
  }

}

module.exports = SearchService;

