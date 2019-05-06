const Service = require('egg').Service;
const EOS = require('eosjs');
var _ = require('lodash');

class BalanceService extends Service {
  constructor(ctx) {
    super(ctx);

    this.eosClient = EOS({
      chainId: ctx.app.config.eos.chainId,
      httpEndpoint: ctx.app.config.eos.httpEndpoint,
    });
  }

  // async find(userId) {
  //   this.ctx.logger.info('debug info, find user by id');
  //   const user = await this.app.mysql.get('ariticle', { id: userId });
  //   return { user };
  // }

  async share(uid, platform, amount, symbol, contract, shareid, share_uid) {
    this.ctx.logger.info('debug info, find user by id');
    const user = await this.app.mysql.get('ariticle', { id: userId });

    // 1. 拿到唯一id

    let isVerify = false;

    if ("eos" === platform) {
      isVerify = await this.eos_event_verify();
    } else if ("ont" === platform) {
      isVerify = await this.ont_event_verify();
    } else {
      throw new Error("platform currently not support")
    }

    if (!isVerify) {
      return;
    }

    // 2. 去合约里查证

    // 3. 结算

  }

  /***
   * eos验证流程： signId 为scope，eos account name 为pri key， tableRow 存储字段 eos account name, content(从服务的获取的加密字段), 金额，合约名、代币名，分享者
   */
  async eos_event_verify() {


    this.eosClient.getTableRows({
      json: "true",
      code: "pornhashbaby",
      scope: "pornhashbaby",
      table: "account",
      limit: 1,
      lower_bound: 'joetothemoon'
    }).then(data => {

      var datas = data.rows;
      if (datas.length > 0 && datas[0].account == account) {

      }
      console.log('xxx');

    });


    try {
      const conn = await this.app.mysql.beginTransaction();

      try {

        const result = await conn.query(
          'INSERT INTO assets(uid, contract, name, symbol, amount, decimals, platform) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE amount += ?',
          [post.id, 1]
        );


        await conn.update("posts", updateRow, { where: { id: signId } });

        await conn.commit();
      } catch (err) {
        await conn.rollback();
        throw err;
      }

      ctx.body = {
        msg: 'success',
      };
      ctx.status = 201;

    } catch (err) {
      ctx.logger.error(err.sqlMessage);
      ctx.body = {
        msg: 'edit error ' + err.sqlMessage,
      };
      ctx.status = 500;
    }


    return { user };



    return false;
  }

  async ont_event_verify() {
    return false;
  }


}

module.exports = BalanceService;
