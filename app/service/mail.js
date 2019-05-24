'use strict';
const Service = require('egg').Service;
const nodemailer = require('nodemailer');

class MailService extends Service {

  async sendMail(supportid) {

    // 获取赞赏信息
    const support = await this.app.mysql.get('supports', { id: supportid });
    if (support === null) {
      return null;
    }
    // 获取库存信息
    const stock = await this.app.mysql.get('product_stocks', { support_id: support.id, status: 0 });
    if (stock === null) {
      return null;
    }
    // 获取用户信息
    const user = await this.app.mysql.get('users', { id: support.uid });
    if (user === null) {
      return null;
    }

    const mailContent = '<h2>Your Steam Key</h2>'
      + `<p>[ ${stock.digital_copy} ] -by Smart Signature Project</p>`;
    const mailOptions = {
    //   from: this.config.mail.auth.user,
      from: 'Andoromeda Official',
      to: user.email,
      subject: 'Your Steam Key',
      html: mailContent,
    };
    let result = null;

    try {
      // 配置以及发送邮件
      const transpoter = await nodemailer.createTransport(this.config.mail);
      result = await transpoter.sendMail(mailOptions);
    } catch (err) {
      this.logger.error('MailService:: sendMail error: %j', err);
      return null;
    }
    return result;
  }

}

module.exports = MailService;
