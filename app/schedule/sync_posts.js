const Subscription = require('egg').Subscription;
const EOS = require('eosjs');

class SyncPosts extends Subscription {

  constructor(ctx) {
    super(ctx);
    this.eosClient = EOS({
      broadcast: true,
      sign: true,
      chainId: ctx.app.config.eos.chainId,
      keyProvider: [ctx.app.config.eos.keyProvider],
      httpEndpoint: ctx.app.config.eos.httpEndpoint,
    });
  }

  static get schedule() {
    return {
      interval: '2s',
      type: 'all',
    };
  }

  async subscribe() {
    //debug不执行
    if (this.ctx.app.config.isDebug) return;

    console.log("sync posts..");

    const results = await this.app.mysql.select('posts', {
      where: { onchain_status: 0, platform: "eos" }, // WHERE 条件
      limit: 10, // 返回数据量
      offset: 0, // 数据偏移量
    });

    if (results.length > 0) {
      const ids = [];
      this.ctx.logger.info('new posts need to sync to contract..', results.length);

      const actions = [];

      for (let i = 0; i < results.length; i++) {

        const post = results[i];
        ids.push(post.id);
        actions.push(
          {
            account: this.ctx.app.config.eos.contract,
            name: 'publish',
            authorization: [{
              actor: this.ctx.app.config.eos.actor,
              permission: 'active',
            }],
            data: {
              sign: {
                id: post.id,
                author: post.username || post.author,
                fission_factor: post.fission_factor,
                ipfs_hash: post.hash,
                public_key: post.public_key,
                signature: post.sign,
              },
            },
          }
        );
      }

      this.eosClient.transaction({
        actions,
      }).then(data => {
        this.ctx.logger.info('sync success..', data.transaction_id);

        const row = {
          onchain_status: 1,
        };

        const options = {
          where: {
            id: ids,
          },
        };

        this.app.mysql.update('posts', row, options);
      }).catch(err => {
        this.ctx.logger.info('sync err..', err);
      });
    } else {
      // this.ctx.logger.info('new posts need to sync to contract..', results.length);
    }
  }
}

module.exports = SyncPosts;

