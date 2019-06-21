'use strict';

module.exports = {
  // posts的频道
  postChannels: {
    article: 1, // 普通文章
    product: 2, // 商品
  },

  payActions: {
    support: 1, // 赞赏
    buy: 2, // 购买
  },

  assetTypes: {
    buy: 'buy expenses', // 购买消费
    support: 'support expenses', // 赞赏消费
    income: 'sign income', // 作者收入???
    sale: 'sale income', // 销售收入
    fissionShare: 'fission income', // 裂变分享收入
    referralShare: 'referral income', // 推荐分享收入
    withdraw: 'withdraw', // 提现
  },

};
