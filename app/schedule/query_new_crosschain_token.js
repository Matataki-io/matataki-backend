const { Subscription } = require('egg');

class QueryNewCrossChainToken extends Subscription {
  static get schedule() {
    return {
      interval: '10m',
      type: 'worker',
      immediate: true,
    };
  }

  // Disable CrossChain feature
  async subscribe() {
    // if (this.ctx.app.config.isDebug) return;

    // this.logger.info('Running QueryNewCrossChainToken at: ', new Date().toLocaleString());
    // await this.checkForChain('bsc');
    // await this.checkForChain('matic');
  }

  async checkForChain(chain) {
    const { mysql } = this.ctx.app;
    const { data: newCrossCreatedEvents } = await this.service.token.crosschain.getRecentNewTokens(chain);

    if (newCrossCreatedEvents.length === 0) {
      return;
    }
    this.logger.info(chain, newCrossCreatedEvents);


    const crossChainedTokensInDB = await mysql.select('pegged_assets', { where: { chain } });
    // toLowerCase 是因为有些是没大小写的，不要移除！！！！
    const existedCrosschainTokenAddresses = crossChainedTokensInDB.map(t => t.contractAddress.toLowerCase());

    // toLowerCase 是因为有些是没大小写的，不要移除！！！！
    const noEntrieInDB = newCrossCreatedEvents.filter(({ token }) => existedCrosschainTokenAddresses.indexOf(token.toLowerCase()) === -1);
    if (noEntrieInDB.length === 0) return; // skip
    const symbolToAddress = {};
    noEntrieInDB.forEach(event => {
      symbolToAddress[event.symbol] = event.token;
    });

    const symbolInNotEntriedEventList = noEntrieInDB.map(t => t.symbol);

    const hittedTokens = await mysql.select('minetokens', { where: { symbol: symbolInNotEntriedEventList } });

    if (hittedTokens.length === 0) return;// skip
    await Promise.all(hittedTokens.map(token =>
      mysql.insert('pegged_assets',
        { chain, tokenId: token.id, contractAddress: symbolToAddress[token.symbol] }
      ))
    );

  }
}


module.exports = QueryNewCrossChainToken;
