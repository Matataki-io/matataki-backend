const {
  MsgAdapter,
  InFollowEvent,
  InQrCodeEvent,
  OutTextMsg,
  ApiConfigKit,
  OutNewsMsg,
  OutCustomMsg,
} = require('tnwx');

class MsgController extends MsgAdapter {
  constructor(_this) {
    super(_this);
    this._this = _this;
  }
  processInTextMsg(inTextMsg) {
    let outMsg;
    let content = 'IJPay 让支付触手可及 \n\nhttps://gitee.com/javen205/IJPay';
    if (inTextMsg.getContent === '极速开发微信公众号') {
      // 多公众号支持 分别给不同的公众号发送不同的消息
      if (ApiConfigKit.getApiConfig.getAppId === 'wx614c453e0d1dcd12') {
        content = '极速开发微信公众号 \n\nhttps://github.com/javen205/weixin_guide';
        outMsg = new OutTextMsg(inTextMsg);
        outMsg.setContent(content);
      } else {
        content = '极速开发微信公众号 \n\nhttps://github.com/javen205/TNWX';
        outMsg = new OutTextMsg(inTextMsg);
        outMsg.setContent(content);
      }
    } else if (inTextMsg.getContent === '聚合支付') {
      // 最新规则：开发者只能回复1条图文消息；其余场景最多可回复8条图文消息
      outMsg = new OutNewsMsg(inTextMsg);
      outMsg.addArticle(
        '聚合支付了解下',
        'IJPay 让支付触手可及',
        'https://gitee.com/javen205/IJPay/raw/master/assets/img/IJPay-t.png',
        'https://gitee.com/javen205/IJPay'
      );
      outMsg.addArticle(
        'jfinal-weixin',
        '极速开发微信公众号',
        'https://gitee.com/javen205/IJPay/raw/master/assets/img/IJPay-t.png',
        'https://gitee.com/JFinal/jfinal-weixin'
      );
    } else {
      // outMsg = new OutTextMsg(inTextMsg);
      // outMsg.setContent(content);
      // 转发给多客服PC客户端
      outMsg = new OutCustomMsg(inTextMsg);
      console.log('转发给多客服PC客户端');
    }
    return outMsg;
  }
  // 处理关注、取消关注事件
  processInFollowEvent(inFollowEvent) {
    console.log('processInFollowEvent inFollowEvent', inFollowEvent);
    // console.log('_this', global.WechatService);


    // eslint-disable-next-line eqeqeq
    if (InFollowEvent.EVENT_INFOLLOW_SUBSCRIBE == inFollowEvent.getEvent) {

      // 自定义方法
      try {
        // console.log('Service', this.wechat.followEvent);
        // this.wechat.followEvent(inFollowEvent);

      } catch (e) {
        console.log(e);
      }

      return this.renderOutTextMsg(inFollowEvent,
        '感谢你的关注 么么哒 \n\n交流群：114196246');
    // eslint-disable-next-line eqeqeq
    } else if (InFollowEvent.EVENT_INFOLLOW_UNSUBSCRIBE == inFollowEvent.getEvent) {
      console.error('取消关注：' + inFollowEvent.getFromUserName);
      return this.renderOutTextMsg(inFollowEvent);
    }
    return this.renderOutTextMsg(inFollowEvent);

  }

  processInQrCodeEvent(inQrCodeEvent) {
    console.log('processInQrCodeEvent inQrCodeEvent', inQrCodeEvent);

    if (InQrCodeEvent.EVENT_INQRCODE_SUBSCRIBE === inQrCodeEvent.getEvent) {
      console.debug('扫码未关注：' + inQrCodeEvent.getFromUserName);
      return this.renderOutTextMsg(
        inQrCodeEvent,
        '感谢您的关注，二维码内容：' + inQrCodeEvent.getEventKey
      );
    } else if (InQrCodeEvent.EVENT_INQRCODE_SCAN === inQrCodeEvent.getEvent) {
      console.debug('扫码已关注：' + inQrCodeEvent.getFromUserName);
      return this.renderOutTextMsg(inQrCodeEvent);
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
