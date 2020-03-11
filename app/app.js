'use strict';

module.exports = app => {
    app.passport.verify(async (ctx,user) => {
        const { screen_name,
            name,
            profile_image_url,
          } = user;
        return await ctx.service.auth.saveTwitterUser(screen_name, name, profile_image_url, ctx.clientIP, 0, 'twitter');
    });
};