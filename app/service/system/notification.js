'use strict';

const axios = require('axios').default;
const Service = require('egg').Service;

/**
 * NotificationService 系统的提醒
 * 用于向 IM 推送信息给工程师的根据
 */
class NotificationService extends Service {
  /**
   * 推送到钉钉机器人 pushToDingTalk
   * @param {string} botName 机器人名字（this.config.dingtalkBots的object key）
   * @param {string} msgType 消息类型
   * @param {object} params 其他参数，详情参考钉钉开发文档 https://ding-doc.dingtalk.com/doc#/serverapi2/qf2nxq
   * @param {Array<string>}} atMobiles at 谁（的手机号码），**必须是 string 而不是数字**
   * @param {boolean} isAtAll 是否 at 整个群，可选项，默认为 false
   */
  pushToDingTalk(botName, msgType, params, atMobiles, isAtAll = false) {
    const access_token = this.config.dingtalkBots[botName];
    if (!access_token) throw new Error("You don't have such a dingtalk bot in config.");
    return axios.post('https://oapi.dingtalk.com/robot/send', {
      msgtype: msgType,
      ...params,
      at: {
        atMobiles,
        isAtAll,
      },
    }, {
      headers: { 'Content-Type': 'application/json' },
      params: { access_token },
    });
  }

  pushTextToDingTalk(botName, content, atMobiles = [], isAtAll = false) {
    return this.pushToDingTalk(botName, 'text', { text: { content } }, atMobiles, isAtAll);
  }

  pushMarkdownToDingtalk(botName, title, text, atMobiles = [], isAtAll = false) {
    return this.pushToDingTalk(botName, 'markdown', { markdown: { title, text } }, atMobiles, isAtAll);
  }

}

module.exports = NotificationService;
