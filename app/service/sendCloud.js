const Service = require('egg').Service;


class sendCloudService extends Service {
  // 发送验证码服务
  async sendCaptcha(email, captcha) {
    const API_USER = this.config.sendCloud.API_USER;
    const API_KEY = this.config.sendCloud.API_KEY;
    const x_smtpapi = {
      to: [ email ],
      sub: {
        '%captcha%': [ captcha ],
      },
    };
    let params = {
      apiUser: API_USER,
      apiKey: API_KEY,
      from: 'admin@smartsignature.io',
      to: email,
      templateInvokeName: 'matataki',
      fromName: '瞬Matataki官方',
      xsmtpapi: JSON.stringify(x_smtpapi),
    }
    const querystringParams = require('querystring').stringify(params);
    let result = null;
    try {
      const responseStr = await this.ctx.curl(`http://api.sendcloud.net/apiv2/mail/sendtemplate?${querystringParams}`, {
        method: 'POST'
      });
      if (responseStr.status === 200) {
        result =  responseStr
      } else {
        this.logger.error('sendCloudService:: sendCaptcha error: %j', responseStr);
      }
    } catch(err) {
      this.logger.error('sendCloudService:: sendCaptcha error: %j', err);
      return null;
    }
    return result;
  }
}

module.exports = sendCloudService;
