'use strict';
const hCaptcha = require('hcaptcha');

module.exports = () => {
  return async function verify(ctx, next) {
    const { user } = ctx;
    const { privateKey } = ctx.app.config.hCaptcha;
    // @todo: fetch it from the db
    const ingoreUids = [];
    // 检测前面 middleware 有没有注入用户信息，且是否为可以无视验证码的白名单用户
    if (user && ingoreUids.indexOf(user.id) > -1) {
      // 白名单用户，直接无视
      return next();
    }
    // const privateKey = ctx.app.config.hCaptcha.privateKey;

    const { hCaptchaData } = ctx.request.body;
    try {
      if (!hCaptchaData.token) throw new Error('Bad Captcha');
      const verifiedCaptchaData = await hCaptcha.verify(privateKey, hCaptchaData.token);
      if (!verifiedCaptchaData.success) throw new Error('Bad Captcha');

      // If no error, then carry on
      await next();
    } catch (error) {
      ctx.status = 400;
      ctx.body = ctx.msg.hCaptchaVerifyFailed;
      return;
    }
  };
};
