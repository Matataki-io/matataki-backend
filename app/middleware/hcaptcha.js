'use strict';
const hCaptcha = require('hcaptcha');

module.exports = () => {
  return async function verify(ctx, next) {
    const hCaptchaKey = ctx.app.config.hCaptcha.privateKey;

    const { hCaptchaData } = ctx.request.body;
    try {
      if (!hCaptchaData.token) throw new Error('Bad Captcha');
      const verifiedCaptchaData = await hCaptcha.verify(hCaptchaKey, hCaptchaData.token);
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
