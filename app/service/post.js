'use strict';

const Service = require('egg').Service;

class PostService extends Service {
  // async publish() {

  // }

  //根据hash获取文章
  async getByHash(hash, current_user) {
    const post = await this.app.mysql.get('posts', { hash });
    return this.getPostProfile(post, current_user);
  }

  //根据id获取文章
  async getById(id, current_user) {
    const post = await this.app.mysql.get('posts', { id });
    return this.getPostProfile(post, current_user);
  }

  //获取文章阅读数等属性
  async getPostProfile(post, current_user) {
    if (post) {
      // 阅读次数
      const read = await this.app.mysql.query(
        'select real_read_count num from post_read_count where post_id = ? ',
        [post.id]
      );
      post.read = read[0] ? read[0].num : 0

      // 被赞次数
      const ups = await this.app.mysql.query(
        'select count(*) as ups from actions where sign_id = ? and type = ? ',
        [post.id, "share"]
      );
      post.ups = ups[0].ups;

      // 当前用户是否已赞赏
      post.support = false;
      if (current_user) {
        let support = await this.app.mysql.get('actions', { sign_id: post.id, author: current_user, type: 'share' });
        if (support) {
          post.support = true;
        }
      }

      // 被赞总金额
      const value = await this.app.mysql.query(
        'select sum(amount) as value from actions where sign_id = ? and type = ? ',
        [post.id, "share"]
      );
      post.value = value[0].value || 0;

      // nickname 
      let name = post.username || post.author;
      const user = await this.app.mysql.get('users', { username: name });
      if (user) {
        post.nickname = user.nickname;
      }

      // update cahce
      // this.app.read_cache[post.id] = post.read;
      // this.app.value_cache[post.id] = post.value;
      // this.app.ups_cache[post.id] = post.ups;

      // this.app.post_cache[post.id] = post;
    }

    return post;
  }

  // 删除文章
  async delete(id, username) {
    try {
      const row = {
        status: 1,
      };

      const options = {
        where: {
          id: id,
          username: username, // 只能自己的文章
        },
      };

      //todo，待验证，修改不改变内容，影响行数应该为0
      let result = await this.app.mysql.update('posts', row, options);
      return result.affectedRows === 1;
    } catch (err) {
      this.logger.error('PostService::delete error: %j', err);
    }
    return false;
  }

  async getForEdit(id, current_user) {
    const post = await this.app.mysql.get('posts', { id, username: current_user });
    return post;
  }

}

module.exports = PostService;
