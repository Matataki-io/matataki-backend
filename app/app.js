'use strict';

module.exports = app => {
    app.passport.verify(async (ctx,user) => {
        const { displayName,
            name,
            photo,
          } = user;
        return await ctx.service.auth.saveTwitterUser(displayName, name, photo, ctx.clientIP, 0, 'twitter');
    });
};