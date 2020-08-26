const {
  MsgAdapter,
  InFollowEvent,
  InQrCodeEvent,
  OutTextMsg,
  // ApiConfigKit,
  // OutNewsMsg,
  OutImageMsg,
  OutCustomMsg,
} = require('tnwx');
const msg = require('./msg');

class MsgController extends MsgAdapter {
  // 处理文本消息
  processInTextMsg(inTextMsg) {

    console.log('inTextMsg', inTextMsg);
    console.log('inTextMsg.getContent', inTextMsg.getContent);

    let outMsg;
    // let content = 'IJPay 让支付触手可及 \n\nhttps://gitee.com/javen205/IJPay';
    let content = '';

    // if (inTextMsg.getContent === '极速开发微信公众号') {
    //   // 多公众号支持 分别给不同的公众号发送不同的消息
    //   if (ApiConfigKit.getApiConfig.getAppId === 'wx614c453e0d1dcd12') {
    //     content = '极速开发微信公众号 \n\nhttps://github.com/javen205/weixin_guide';
    //     outMsg = new OutTextMsg(inTextMsg);
    //     outMsg.setContent(content);
    //   } else {
    //     content = '极速开发微信公众号 \n\nhttps://github.com/javen205/TNWX';
    //     outMsg = new OutTextMsg(inTextMsg);
    //     outMsg.setContent(content);
    //   }
    // } else if (inTextMsg.getContent === '聚合支付') {
    //   // 最新规则：开发者只能回复1条图文消息；其余场景最多可回复8条图文消息
    //   outMsg = new OutNewsMsg(inTextMsg);
    //   outMsg.addArticle(
    //     '聚合支付了解下',
    //     'IJPay 让支付触手可及',
    //     'https://gitee.com/javen205/IJPay/raw/master/assets/img/IJPay-t.png',
    //     'https://gitee.com/javen205/IJPay'
    //   );
    //   outMsg.addArticle(
    //     'jfinal-weixin',
    //     '极速开发微信公众号',
    //     'https://gitee.com/javen205/IJPay/raw/master/assets/img/IJPay-t.png',
    //     'https://gitee.com/JFinal/jfinal-weixin'
    //   );
    // }

    const concatUs = [ '人工', '客服', '人工客服', '联系', '联系方式' ];

    // 明确关键词
    if (inTextMsg.getContent === '帮助') {
      content = msg.help;
      outMsg = new OutTextMsg(inTextMsg);
      outMsg.setContent(content);
    } else if (inTextMsg.getContent === '主页') {
      content = msg.homePage;
      outMsg = new OutTextMsg(inTextMsg);
      outMsg.setContent(content);
    } else if (concatUs.includes(inTextMsg.getContent)) {
      const outMsg = new OutImageMsg(inTextMsg);
      // media id is linke wechat qrcode
      outMsg.setMediaId = 'XMYLH__bL6vE6owOD80pYyaUz8txgFa9qsbV5R7e3H6GT9BNiavIBV74OU1jWpV1';
      return outMsg;

    } else {
      // outMsg = new OutTextMsg(inTextMsg);
      // outMsg.setContent(content);
      // 转发给多客服PC客户端
      outMsg = new OutCustomMsg(inTextMsg);
      console.log('转发给多客服PC客户端');
    }
    return outMsg;
  }
  // 处理图片消息
  processInImageMsg(inImageMsg) {

    console.log('inImageMsg', inImageMsg);
    const outMsg = new OutImageMsg(inImageMsg);

    console.log('outMsg', outMsg);
    console.log('inImageMsg.getMediaId', inImageMsg.getMediaId);

    outMsg.setMediaId = inImageMsg.getMediaId;
    return outMsg;
  }
  // 菜单事件
  processInMenuEvent(inMenuEvent) {

    console.log('inMenuEvent', inMenuEvent);

    // 菜单事件 联系我们
    if (inMenuEvent.getEventKey === 'CONTACT_US') {
      const outMsg = new OutImageMsg(inMenuEvent);
      // media id is linke wechat qrcode
      outMsg.setMediaId = 'XMYLH__bL6vE6owOD80pYyaUz8txgFa9qsbV5R7e3H6GT9BNiavIBV74OU1jWpV1';
      return outMsg;
    }

  }
  // 处理关注、取消关注事件
  processInFollowEvent(inFollowEvent) {
    console.log('processInFollowEvent inFollowEvent', inFollowEvent);

    // eslint-disable-next-line eqeqeq
    if (InFollowEvent.EVENT_INFOLLOW_SUBSCRIBE == inFollowEvent.getEvent) {
      return this.renderOutTextMsg(inFollowEvent, msg.followed);
    // eslint-disable-next-line eqeqeq
    } else if (InFollowEvent.EVENT_INFOLLOW_UNSUBSCRIBE == inFollowEvent.getEvent) {
      console.error('取消关注：' + inFollowEvent.getFromUserName);
      return this.renderOutTextMsg(inFollowEvent);
    }
    return this.renderOutTextMsg(inFollowEvent);

  }

  // 处理扫码事件
  processInQrCodeEvent(inQrCodeEvent) {
    console.log('processInQrCodeEvent inQrCodeEvent', inQrCodeEvent);
    if (InQrCodeEvent.EVENT_INQRCODE_SUBSCRIBE === inQrCodeEvent.getEvent) {
      console.debug('扫码未关注：' + inQrCodeEvent.getFromUserName);
      return this.renderOutTextMsg(
        inQrCodeEvent,
        msg.scanUnfollowed
      );
    } else if (InQrCodeEvent.EVENT_INQRCODE_SCAN === inQrCodeEvent.getEvent) {
      console.debug('扫码已关注：' + inQrCodeEvent.getFromUserName);
      return this.renderOutTextMsg(inQrCodeEvent, msg.scanFollowed);
    }
    return this.renderOutTextMsg(inQrCodeEvent);
  }
  renderOutTextMsg(inMsg, content) {
    const outMsg = new OutTextMsg(inMsg);
    outMsg.setContent(content ? content : ' ');
    return outMsg;
  }
}
module.exports = MsgController;
