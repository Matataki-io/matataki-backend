'use strict';

const Service = require('egg').Service;
const elastic = require('@elastic/elasticsearch');
const moment = require('moment');

class SearchService extends Service {
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

  async searchPost(keyword, uid = null) {
    let postQuery;
    const elasticClient = new elastic.Client({ node: this.config.elasticsearch.host });
    // TBD 指定用户查询
    if (uid) {
      try {
        // const elasticClient = create(this.config.elasticsearch.host);
        postQuery = await elasticClient.search({
          index: 'posts',
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
                  multi_match: {
                    query: keyword,
                    fields: [ 'title', 'content' ],
                  },
                },
              },
            },
            highlight: {
              fields: {
                // content: {},
                nickname: {},
                title: {},
                content: {},
              },
            },
          },
        });
      } catch (err) {
        this.logger.error('Search Service: searchPost error', err);
        return null;
      }
    } else {
      try {
        // const elasticClient = create(this.config.elasticsearch.host);
        postQuery = await elasticClient.search({
          index: 'posts',
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
                  multi_match: {
                    query: keyword,
                    fields: [ 'title', 'content' ],
                  },
                },
              },
            },
            highlight: {
              fields: {
                // content: {},
                nickname: {},
                title: {},
                content: {},
              },
            },
          },
        });
      } catch (err) {
        this.logger.error('Search Service: searchPost error', err);
        return null;
      }
    }
    const result = [];
    let matches = {};
    // 加了多匹配之后， 没有匹配到的项目在highlight里面没有
    for (let hindex = 0; hindex < postQuery.body.hits.hits.length; hindex += 1) {
      matches = {};
      matches.postid = postQuery.body.hits.hits[hindex]._source.id;
      matches.uid = postQuery.body.hits.hits[hindex]._source.uid;
      matches.username = postQuery.body.hits.hits[hindex]._source.username;
      matches.create_time = postQuery.body.hits.hits[hindex]._source.create_time;

      if (postQuery.body.hits.hits[hindex].highlight.nickname) {
        matches.nickname = postQuery.body.hits.hits[hindex].highlight.nickname[0];
      } else {
        matches.nickname = postQuery.body.hits.hits[hindex]._source.nickname;
      }

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
      result.push(matches);
    }
    return result;
  }

  async precisePost(postid) {
    const thePost = await this.app.mysql.query(
      'SELECT p.id AS postid, p.username, p.create_time, u.nickname, p.title, p.short_content '
      + 'FROM posts p LEFT JOIN users u ON p.uid = u.id WHERE p.id = ?;',
      [ postid ]
    );
    if (thePost.length > 0) {
      return thePost[0];
    }
    return [];
  }

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
        index: 'posts',
        body: {
          id: postid,
          create_time: moment(),
          uid: author[0].id,
          username: author[0].username,
          nickname: author[0].nickname,
          title,
          content,
        },
      });
    } catch (err) {
      this.logger.error('SearchService:: importPost: error ', err);
      return null;
    }

  }
}

module.exports = SearchService;

// 时间加权方案：
// {
//   "query": {
//   	"function_score": {
//   	  "functions": [
//   	  	{
//     	  "exp": {
//   	  		"create_time": {
//   	  		  "origin": "now",
//   	  		  "offset": "0d",
//   	  		  "scale": "30d"
//   	  		}
//   	  	  }
//   	  	}
//       ],
//       "query": {
//       	"bool": {
//   	      "must": [
//   	  	    { "match": { "content": "价格" } }
// 		  ]
//   		}
//       }
//   	}
//   },
//   "highlight": {
//     "fields" : {
//       "content" : {}
//         }
// 	}
// }
