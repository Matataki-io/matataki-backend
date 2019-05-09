const Subscription = require('egg').Subscription;
const EOS = require('eosjs');
const moment = require('moment');

class VerifySupport extends Subscription {

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
      interval: '5s',
      type: 'all',
    };
  }

  async subscribe() {
    let expire = moment().subtract(1, "day").format('YYYY-MM-DD HH:mm:ss');

    const results = await this.app.mysql.query(`select * from supports where status=0 and create_time>'${expire}' limit 1`);

    if (results.length === 0)
      return

    for (let i = 0; i < results.length; i++) {
      const support = results[i];
      if ("eos" === support.platform) {
        await this.eos_verify(support);
      } else if ("ont" === support.platform) {
        await this.ont_verify(support);
      }
    }
  }

  async eos_verify(support) {
    console.log("eos_verify ", support);

    // 根据 signid 去合约中取 table row，Limit 为username， 取到则继续验证 amount， contract ，symbol， referrer， 验证通过才进入结算
    try {
      let result = await this.eosClient.getTableRows({
        json: "true",
        code: this.ctx.app.config.eos.contract,
        scope: support.signid,
        table: "supports",
        limit: 1,
        // TODO change to username
        lower_bound: support.uid
      });

      if (result && result.rows && result.rows.length > 0) {
        let row = result.rows[0];
        console.log(row);

        let verifyPass = false;

        if (row.contract == support.contract &&
          row.symbol == support.symbol &&
          row.amount == support.amount &&
          row.reffer == support.referreruid
        ) {
          verifyPass = true;
        }

        if (verifyPass) {
          await this.passVerify(support);
        }

      } else {
        console.log("table row not found");
      }

    } catch (err) {
      console.log("get table row err");
    }

  }

  async ont_verify(support) {
    // https://dev-docs.ont.io/#/docs-cn/ontology-cli/05-rpc-specification?id=getstorage
    // 根据本体文档说明 取合约中的值，需要传入两个参数： hex_contract_address：以十六进制字符串表示智能合约哈希地址 key：以十六进制字符串表示的存储键值
    // 所以，key 就用 （signId + uid）的 hex , 对应的value， 和eos版本类似，存储 转账代币合约、数量、符号，推荐人，供这里做二次验证和数据库中是否相符合。
    console.log("ont_verify ", support);

    let verifyPass = false;

    // TODO 做本体合约数据验证

    if (verifyPass) {
      await this.passVerify(support);
    }
  }

  async passVerify(support) {
    try {
      const conn = await this.app.mysql.beginTransaction();

      try {

        // 1. 如果有推荐人，先看推荐人额度满了没。没满就给推荐人加钱。 额度 等于裂变参数 * 他自己的打赏额度。没打赏过 不获得推荐人奖励。

        const result = await conn.query(
          'INSERT INTO assets(uid, contract, symbol, amount, platform) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?',
          [support.uid, support.contract, support.symbol, support.amount, support.platform, support.amount]
        );

        // 2. 如果给推荐人加钱

        // await conn.update("posts", updateRow, { where: { id: signId } });

        await conn.commit();

      } catch (err) {
        await conn.rollback();
        console.log(err);
      }

    } catch (err) {
      console.log("passVerify err", err);
    }

  }

}

module.exports = VerifySupport;

