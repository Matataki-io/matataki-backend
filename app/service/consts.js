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
    supportExpenses: 'support_expenses', // 赞赏/投资支出
    buyExpenses: 'buy_expenses', // 购买支出

    fissionIncome: 'fission_income', // 赞赏/投资裂变收入
    referralIncome: 'referral_income', // 推荐收入

    authorSaleIncome: 'author_sale_income', // 作者 销售收入
    authorSupportedIncome: 'author_supported_income', // 作者 被投资收入

    withdraw: 'withdraw', // 提现
  },

  commentTypes: {
    support: 1,
    order: 2,
  },

};
