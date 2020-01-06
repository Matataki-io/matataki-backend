const axios = require('axios');
const Service = require('egg').Service;

class ServerChanService extends Service {
  sendNotification(text, desp) {
    // ServerChan 仅信息推送给开发人员（指Frank），不涉及机密信息，我直接写死了
    // 要更换的自己换掉吧
    const SCKEY = 'SCU1037T5e6491f27c4afa52219bd05d9eb879055e09c8322e93c';
    const ApiEndPoint = `https://sc.ftqq.com/${SCKEY}.send`;
    return axios.get(ApiEndPoint, {
      params: { text, desp },
    });
  }
}

module.exports = ServerChanService;
