'use strict';

const Service = require('egg').Service;
const elastic = require('@elastic/elasticsearch');

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

  async searchPost(keyword) {
    let postQuery;
    const elasticClient = new elastic.Client({ node: this.config.elasticsearch.host });
    try {
      // const elasticClient = create(this.config.elasticsearch.host);
      postQuery = await elasticClient.search({
        index: 'posts',
        body: {
          query: {
            // match: {
            //   content: keyword,
            // },
            multi_match: {
              query: keyword,
              fields: [ 'nickname', 'title', 'content' ],
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
    const result = [];
    let matches = {};
    // 加了多匹配之后， 没有匹配到的项目在highlight里面没有
    for (let hindex = 0; hindex < postQuery.body.hits.hits.length; hindex += 1) {
      matches = {};
      matches.postid = postQuery.body.hits.hits[hindex]._source.inner_id;
      matches.username = postQuery.body.hits.hits[hindex]._source.username;

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
}

module.exports = SearchService;
