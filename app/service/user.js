'use strict';

const Service = require('egg').Service;
const introductionLengthInvalid = 4;

class UserService extends Service {

  //
  async setUserIntroduction(introduction, current_user) {

    //
    if (introduction.length > 20 || introduction.length < 1) {
      return introductionLengthInvalid;
    }

    try {
      // to be updated.
      const row = {
        introduction,
      };

      const options = {
        where: {
          username: current_user,
        },
      };

      //
      const result = await this.app.mysql.update('users', row, options);
      return result.affectedRows === 1;
    } catch (err) {
      this.logger.error('UserService::delete error: %j', err);
    }
    return false;
  }

}

module.exports = UserService;
