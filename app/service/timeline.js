const Service = require('egg').Service;
const codebird = require('../extend/codebird')

class TimelineService extends Service {
  /** twitter home timeline */
  async getTwitterTimeline(userId, page = 1, pagesize = 20) {
    const credential = await this.app.mysql.get('user_twitter_credential', { user_id: userId })
    if (!credential) return { code: 1 }
    
    const cb = new codebird()
    cb.setUseProxy(true)
    cb.setConsumerKey(this.config.twitterConsumerKey.key, this.config.twitterConsumerKey.secret)
    cb.setToken(credential.oauth_token, credential.oauth_token_secret)
  
    const reply = await new Promise((resolve, reject) => {
      cb.__call("statuses_homeTimeline", { count: pagesize, page }, function (reply, rate, err) {
        if (err) {
          reject('error response or timeout exceeded' + err.error)
          return
        }
        if (reply) {
          resolve(reply)
          return
        }
        reject('reply is empty')
      })
    })
  
    return reply.error ? { code: 2, reply } : { code: 0, reply }
  }

  /** twitter user timeline */
  async getTwitterUserTimeline(screenName, page = 1, pagesize = 20, maxId = 0, excludeReplies = true) {
    const cb = new codebird()
    cb.setUseProxy(true)
    cb.setConsumerKey(this.config.twitterConsumerKey.key, this.config.twitterConsumerKey.secret)
  
    const reply = await new Promise((resolve, reject) => {
      console.log('twitter screen name是:', screenName)
      const params = {
        screen_name: screenName,
        count: pagesize,
        page,
        exclude_replies: excludeReplies ? 1 : 0,
        maxId
      }
      cb.__call("statuses_userTimeline", params, function (reply, rate, err) {
        if (err) {
          reject('error response or timeout exceeded' + err.error)
          return
        }
        if (reply) {
          resolve(reply)
          return
        }
        reject('reply is empty')
      })
    })
  
    return reply.error ? { code: 2, reply } : { code: 0, reply }
  }

  /** get twitter user info */
  async getTwitterUserInfo(screenName) {
    const cb = new codebird()
    cb.setUseProxy(true)
    cb.setConsumerKey(this.config.twitterConsumerKey.key, this.config.twitterConsumerKey.secret)

    const reply = await new Promise((resolve, reject) => {
      console.log('screenName:', screenName)
      cb.__call("users_show", { screen_name: screenName }, function (reply, rate, err) {
        if (err) {
          reject('error response or timeout exceeded' + err.error)
          return
        }
        if (reply) {
          resolve(reply)
          return
        }
        reject('reply is empty')
      })
    })
  
    return reply.error ? { code: 2, reply } : { code: 0, reply }
  }

  /** 获取用户的推特授权状态和时间轴开关 */
  async getTwitterUserTimeLineSwitch(userId) {
    const sql = `
      SELECT
        t1.*,
        IFNULL(t2.timeline_switch, 0) as timeline_switch
      FROM
        user_accounts t1
      LEFT JOIN
        twitter_user_timeline_switch t2 ON t1.uid = t2.user_id
      WHERE
        t1.platform = 'twitter'
        AND t1.uid = :userId
    `
    const res = await this.app.mysql.query(sql, { userId })
    if (res && res.length > 0 && res[0].timeline_switch) return { code: 0, data: res[0] }
    else if (res && res.length > 0) return { code: 1 }
    else return { code: 2 }
  }

  /** 设定用户的 twitter 时间轴开关 */
  async setTwitterUserTimeLineSwitch(userId, timelineSwitch = 1) {
    const sql = `
      INSERT INTO twitter_user_timeline_switch
        (user_id, timeline_switch) VALUES (:userId, :timelineSwitch)
      ON DUPLICATE KEY UPDATE
      timeline_switch = :timelineSwitch;
    `
    const { affectedRows } = await this.app.mysql.query(sql, { userId, timelineSwitch: timelineSwitch ? 1 : 0 })
    return affectedRows === 1
  }
}

module.exports = TimelineService;
