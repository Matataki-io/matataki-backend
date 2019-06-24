'use strict';
const Service = require('egg').Service;
const nodemailer = require('nodemailer');

class MailService extends Service {

  async sendMail(orderid) {

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
      'SELECT u.username, u.email, o.amount, o.symbol, o.create_time FROM orders o INNER JOIN users u ON o.uid = u.id WHERE o.id = :orderid;'
      + 'SELECT s.digital_copy, p.title FROM product_stock_keys s INNER JOIN product_prices p ON s.sign_id = p.sign_id AND p.platform = \'eos\' WHERE s.order_id = :orderid;'
      + 'SELECT p.category_id FROM posts p INNER JOIN orders o ON p.id = o.signid WHERE o.id = :orderid;',
      { orderid }
    );

    const user = product[0];
    const stock = product[1];
    const category = product[2];
    if (user.length === 0 || stock.length === 0) {
      return null;
    }

    let result = null;
    try {
      // 配置以及发送邮件
      const mailData = { username: user[0].username,
        productname: stock[0].title,
        productamount: stock.length,
        stocks: stock,
        totalprice: (user[0].amount / 10000),
        time: user[0].create_time.toLocaleString(),
        symbol: user[0].symbol,
        category: category[0].category_id };
      const mailContent = await this.ctx.renderView('mail.tpl', mailData, { viewEngine: 'nunjucks' });
      // 不发送邮件, 只返回预览
      // if (this.ctx.app.config.mailPreview === true) {
      //   return mailContent;
      // }
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
