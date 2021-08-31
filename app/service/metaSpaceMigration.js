'use strict';

const Service = require('egg').Service;


class MetaSpaceMigrationService extends Service {
  // constructor(ctx, app) {
  //   super(ctx, app);
  // }

  getPostsDataOf(uid) {
    return this.app.mysql.select('posts', {
      where: { uid },
      columns: [ 'id', 'title', 'uid', 'require_holdtokens', 'require_buy', 'create_time' ],
    });
  }

  getAllMetadataHistoryOf(listOfPostId) {
    if (listOfPostId.length === 0) return [];
    return this.app.mysql.select('post_ipfs', {
      where: { articleId: listOfPostId },
      columns: [ 'id', 'articleId', 'metadataHash', 'createdAt' ], // 要查询的表字段
      orders: [[ 'id', 'desc' ]],
    });
  }

  getLatestFromIpfsHistory(histories) {
    const articleIdToRecord = {};

    // eslint-disable-next-line no-unused-vars
    histories.forEach(({ articleId, id, ...record }) => {
      const rInMap = articleIdToRecord[articleId];
      // set record into articleIdToRecord[aid]
      // only if null or later than previous one
      if (!rInMap || record.id > rInMap.id) {
        articleIdToRecord[articleId] = record;
      }
    });
    return articleIdToRecord;
  }
}

module.exports = MetaSpaceMigrationService;
