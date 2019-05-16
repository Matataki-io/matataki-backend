const Subscription = require('egg').Subscription;
const EOS = require('eosjs');
const ONT = require('ontology-ts-sdk');
const moment = require('moment');
const axios = require("axios");

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

    const results = await this.app.mysql.query(`select * from supports where status=0 and create_time>'${expire}' limit 10`);

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
      await this.passVerify(support);
      console.log("get table row err");
    }

  }

  async ont_verify(support) {
    // https://dev-docs.ont.io/#/docs-cn/ontology-cli/05-rpc-specification?id=getstorage
    // 根据本体文档说明 取合约中的值，需要传入两个参数： hex_contract_address：以十六进制字符串表示智能合约哈希地址 key：以十六进制字符串表示的存储键值
    // 所以，key 就用 （signId + uid or user address ）的 hex , 对应的value， 和eos版本类似，存储 转账代币合约、数量、符号，推荐人，供这里做二次验证和数据库中是否相符合。
    console.log("ont_verify ");
    let verifyPass = false;

    // 做本体合约数据验证
    const scriptHash = this.ctx.app.config.ont.scriptHash;
    const httpEndpoint = this.ctx.app.config.ont.httpEndpoint;

    let sponsor = await this.app.mysql.get('users', { id: support.uid });

    // let key_origin = `${sponsor.username}${support.signid}`;
    // let keyhex = "01" + Buffer.from(key_origin).toString('hex');

    let key_origin = `${sponsor.username}${support.signid + ""}`;
    let keyhex = "01" + Buffer.from(key_origin).toString('hex');


    const response = await axios.get(`${httpEndpoint}/api/v1/storage/${scriptHash}/${keyhex}`);


    if (response.data && response.data.Result) {

      // console.log(key_origin)
      // console.log(keyhex)
      // console.log(response.data)

      let ontMap = ONT.ScriptBuilder.deserializeItem(new ONT.utils.StringReader(response.data.Result));

      let entries = ontMap.entries()

      let obj = entries.next();
      let row = {}


      try {
        while (!obj.done) {
          let key = obj.value[0];
          let value = obj.value[1];
          if (typeof value === 'string') {
            value = ONT.utils.hexstr2str(value);
          }
          row[key] = value;
          obj = entries.next();
        }
      } catch (err) {
        console.log(err)
      }

      let reffer = 0;
      if (support.referreruid !== 0) {
        let user = await this.app.mysql.get('users', { id: support.referreruid });
        if (user) {
          reffer = user.username
        }
      }

      if (row.contract == support.contract &&
        row.symbol == support.symbol &&
        row.amount == support.amount &&
        row.sponsor == reffer
      ) {
        verifyPass = true;
      }

      console.log("contract,", row)
      console.log("mysql", support)
      console.log("verifyPass", verifyPass)

    }

    if (verifyPass) {
      await this.passVerify(support);
    }
  }

  async passVerify(support) {
    try {
      const conn = await this.app.mysql.beginTransaction();

      try {
        // 行为相关者: 作者，打赏人、推荐人

        let amount = support.amount;
        let refuid = support.referreruid;
        let now = moment().format('YYYY-MM-DD HH:mm:ss');

        const post = await this.app.mysql.get('posts', { id: support.signid });

        if (!post) {
          return;
        }

        let fission_factor = post.fission_factor;
        let quota = amount * fission_factor / 1000;

        await conn.query('INSERT INTO support_quota(uid, signid, contract, symbol, quota, create_time) VALUES (?, ?, ?, ?, ?, ?)',
          [support.uid, support.signid, support.contract, support.symbol, quota, now]
        );

        // 记录分享者资产变动log
        await conn.query('INSERT INTO assets_change_log(uid, signid, contract, symbol, amount, platform, type, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [support.uid, support.signid, support.contract, support.symbol, 0 - support.amount, support.platform, "support expenses", now]
        );

        // 处理推荐人
        let referrer_support_quota = await this.app.mysql.get('support_quota', { uid: refuid, signid: support.signid });

        if (referrer_support_quota && referrer_support_quota.quota > 0) {

          let delta = referrer_support_quota.quota < amount ? referrer_support_quota.quota : amount;

          amount -= delta;

          await conn.query('INSERT INTO assets(uid, contract, symbol, amount, platform) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?',
            [refuid, support.contract, support.symbol, delta, support.platform, delta]
          );

          // update quota
          let new_quota = referrer_support_quota.quota - delta;

          if (new_quota < 0) {
            new_quota = 0;
          }

          await conn.query('UPDATE support_quota SET quota = ? where id = ?',
            [new_quota, referrer_support_quota.id]
          );

          // 记录分享者资产变动log
          await conn.query('INSERT INTO assets_change_log(uid, signid, contract, symbol, amount, platform, type, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [refuid, support.signid, support.contract, support.symbol, delta, support.platform, "share income", now]
          );
        }

        // get author uid
        let author = await this.app.mysql.get('users', { username: post.username });

        // 处理文章作者
        const result = await conn.query(
          'INSERT INTO assets(uid, contract, symbol, amount, platform) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE amount = amount + ?',
          [author.id, support.contract, support.symbol, amount, support.platform, amount]
        );

        // 记录作者者资产变动log
        await conn.query('INSERT INTO assets_change_log(uid, signid, contract, symbol, amount, platform, type, create_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [author.id, support.signid, support.contract, support.symbol, amount, support.platform, "sign income", now]
        );

        // 把当前support 改为已处理状态
        await conn.update("supports", { status: 1 }, { where: { id: support.id } });

        // 提交事务
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