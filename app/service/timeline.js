const Service = require('egg').Service;
const codebird = require('../extend/codebird')

class TimelineService extends Service {
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
        resolve()
      })
    })
  
    return { code: 0, reply }
  }
}

module.exports = TimelineService;
