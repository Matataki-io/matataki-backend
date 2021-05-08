const Service = require('egg').Service;
const axios = require('axios').default;

class CacheAsyncService extends Service {
  async post(id, uid, timestamp) {
    try {
      await axios.post(this.config.cacheAPI.uri + '/sync/post/add', { id, uid, timestamp }, { headers: { Authorization: `Bearer ${this.config.cacheAPI.apiToken}` } });
    } catch (e) {
      await axios.post(this.config.cacheAPI.uri + '/report/error', { code: 1105, message: e }, { headers: { Authorization: `Bearer ${this.config.cacheAPI.apiToken}` } }).catch(err => { return; });
    }
  }

  async delete(id) {
    try {
      await axios.post(this.config.cacheAPI.uri + '/sync/post/delete', { id }, { headers: { Authorization: `Bearer ${this.config.cacheAPI.apiToken}` } });
    } catch (e) {
      await axios.post(this.config.cacheAPI.uri + '/report/error', { code: 1105, message: e }, { headers: { Authorization: `Bearer ${this.config.cacheAPI.apiToken}` } }).catch(err => { return; });
    }
  }
}

module.exports = CacheAsyncService;