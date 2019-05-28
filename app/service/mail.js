'use strict';
const Service = require('egg').Service;
const nodemailer = require('nodemailer');

class MailService extends Service {

  async sendMail(supportid) {

    this.app.mysql.queryFromat = function (query, values) {
      if (!values) return query;
      return query.replace(/\:(\w+)/g, function (txt, key) {
        if (values.hasOwnProperty(key)) {
          return this.escape(values[key]);
        }
        return txt;
      }.bind(this));
    };

    const product = await this.app.mysql.query(
      'SELECT u.username, u.email FROM supports s INNER JOIN users u ON s.uid = u.id WHERE s.id = :supportid;'
      + 'SELECT s.digital_copy, p.title FROM product_stock_keys s INNER JOIN product_prices p ON s.sign_id = p.sign_id WHERE s.support_id = :supportid LIMIT 1;',
      { supportid }
    );
    const user = product[0];
    const stock = product[1];
    if (user.length === 0 || stock.length === 0) {
      return null;
    }

    let result = null;
    try {
      // 配置以及发送邮件
      const mailData = { user: user[0].username, stockName: stock[0].title, key: stock[0].digital_copy };
      const mailContent = await this.ctx.renderView('mail.tpl', mailData, { viewEngine: 'nunjucks' });
      const mailOptions = {
        //   from: this.config.mail.auth.user,
        from: `Smart Signature<${this.config.mail.auth.user}>`,
        to: user[0].email,
        subject: '智能签名:您购买的商品',
        html: mailContent,
      };

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
