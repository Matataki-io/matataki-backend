const Service = require('egg').Service;


class sendCloudService extends Service {
  // 发送验证码服务
  async sendCaptcha(email, captcha) {
    const API_USER = 'zxplus_test_qaVhTM';
    const API_KEY = 'AuLi5IfrQP2os8qf';
    const x_smtpapi = {
      to: [ email ],
      sub: {
        '%captcha%': [ captcha ],
      },
    };
    const responseStr = await this.ctx.curl('http://api.sendcloud.net/apiv2/mail/sendtemplate', {
      method: 'POST',
      // 通过 contentType 告诉 HttpClient 以 JSON 格式发送
      contentType: 'json',
      data: {
        apiUser: API_USER,
        apiKey: API_KEY,
        from: 'admin@smartsignature.io',
        to: email,
        templateInvokeName: 'matataki',
        fromName: '瞬Matataki官方',
        xsmtpapi: JSON.stringify(x_smtpapi),
      },
      // 明确告诉 HttpClient 以 JSON 格式处理返回的响应 body
      dataType: 'json',
    });
    this.ctx.logger.info('sendCloudService >> sendCaptcha', responseStr);
    return responseStr;
  }
}

module.exports = sendCloudService;
