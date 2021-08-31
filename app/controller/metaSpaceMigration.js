'use strict';

const Controller = require('../core/base_controller');
// const nanoid = require('nanoid');

class MetaSpaceMigrationController extends Controller {
  async getPosts() {
    const { ctx } = this;
    const { uid } = ctx.query;
    const details = await this.service.user.getUserById(uid);

    // handle no such user
    if (details === null) {
      ctx.body = ctx.msg.userNotExist;
      ctx.status = 404;
      return;
    }

    // get posts metadata
    const posts = await this.service.metaSpaceMigration.getPostsDataOf(uid);

    const metadataRecords = await this.service.metaSpaceMigration.getAllMetadataHistoryOf(posts.map(p => p.id));
    const latestMetadata = this.service.metaSpaceMigration.getLatestFromIpfsHistory(metadataRecords);
    ctx.body = {
      posts,
      latestMetadata,
    };
  }
}

module.exports = MetaSpaceMigrationController;
