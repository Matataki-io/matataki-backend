const Subscription = require('egg').Subscription;

var _ = require('lodash');

/**
 * write action into db 
 */
class ActionUpdater extends Subscription {

    static get schedule() {
        return {
            interval: '1s',
            type: 'all',
        };
    }

    async subscribe() {
        //debug不执行
        if (this.ctx.app.config.isDebug) return;

        if (this.app.sqls && this.app.sqls.length > 0) {
            var sub_arr = this.app.sqls.splice(0, 100);
            _.each(sub_arr, (sql) => {
                try {
                    this.app.mysql.query(sql);
                    console.log("insert success, remind", this.app.sqls.length);
                } catch (err) {
                    console.log("insert error", err);
                    this.app.sqls.push(sql);
                }
            })
        }
    }
}

module.exports = ActionUpdater;
