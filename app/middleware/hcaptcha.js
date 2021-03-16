'use strict';
// const hCaptcha = require('hcaptcha');

module.exports = () => {
  return async function verify(ctx, next) {
    const { hCaptchaData } = ctx.request.body;

    const isCaptchaVerified = await ctx.service.hCaptcha.validate(hCaptchaData);


    // if return false then failed
    if (!isCaptchaVerified) {
      ctx.status = 400;
      ctx.body = ctx.msg.hCaptchaVerifyFailed;
      return;
    }


    // If no error then go
    await next();
  };
};
