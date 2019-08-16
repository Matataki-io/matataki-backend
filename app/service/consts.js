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
    buyad: 'buyad', // 橙皮书买广告
    earn: 'earn', // 橙皮书收入
  },

  commentTypes: {
    support: 1,
    order: 2,
  },

  // 积分系统
  pointTypes: {
    reading: 'reading', // 用户阅读
    beread: 'beread', // 读者的文章被阅读
    publish: 'publish', // 发布文章
    readingNew: 'reading_new', // 用户阅读新文章，额外获得的
    bereadNew: 'beread_new', // 读者的新文章被阅读，额外获得的
    like: 'reading_like', // 点赞
    dislike: 'reading_dislike', // 点踩
  },

};
