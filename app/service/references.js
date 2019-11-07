'use strict';
const axios = require('axios');
const moment = require('moment');
const Service = require('egg').Service;

const domains = [ 'https://wwwtest.smartsignature.io/p/', 'https://wwwtest.smartsignature.io/p/', 'https://test.frontenduse.top/p/',
  'https://matataki.io/p/', 'https://www.matataki.io/p/', 'https://smartsignature.frontenduse.top/p/' ];

class ReferencesService extends Service {
  // 是否是内部的文章
  checkInnerPost(url) {
    for (const domain of domains) {
      if (url.toLowerCase().startsWith(domain)) {
        return true;
      }
    }
    return false;
  }

  extractSignId(url) {
    return parseInt(url.match(/\/p\/(\d+)/)[1]);
  }

  async extractRefTitle(url) {
    let ref_sign_id = 0;
    if (this.checkInnerPost(url)) {
      ref_sign_id = this.extractSignId(url);
    }

    if (ref_sign_id > 0) {
      const post = await this.service.post.get(ref_sign_id);
      return {
        ref_sign_id,
        title: post.title,
        summary: post.short_content,
      };
    }

    try {
      const rawPage = await axios.get(url, {
        method: 'get',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.117 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        },
      });

      const result = rawPage.data.match(/(?<=<title[\S\s]*?>)[\S\s]*?(?=<\/title>)/); // /<title.*?>([\S\s]*?)<\/title>/
      let title = '';
      if (result && result.length > 0) {
        title = result[0];
      }
      return {
        ref_sign_id,
        title,
      };
    } catch (err) {
      this.logger.error('PostService::parseReferenceHTML: error:', err);
      return null;
    }
  }


  // sign_id,url 数据库里增加了唯一索引
  async addDraftReference(uid, draftId, url, title, summary) {
    if (!await this.hasDraftReferencePermission(uid, draftId)) {
      return -1;
    }

    let ref_sign_id = 0;
    if (this.checkInnerPost(url)) {
      ref_sign_id = this.extractSignId(url);
    }

    try {
      const sql = ` INSERT INTO post_references (draft_id, ref_sign_id, url, title, summary, number, create_time, status) 
      SELECT :draft_id, :ref_sign_id, :url, :title, :summary, (SELECT IFNULL(MAX(number), 0) + 1 FROM post_references WHERE draft_id=:draft_id), :time, 0
      ON DUPLICATE KEY UPDATE title = :title, summary = :summary, create_time = :time, status = 0; `;
      await this.app.mysql.query(sql, {
        draft_id: draftId, ref_sign_id, url, title, summary, time: moment().format('YYYY-MM-DD HH:mm:ss'),
      });

      return 0;
    } catch (e) {
      this.ctx.logger.error(e);
      return -1;
    }
  }
  async addReference(uid, signId, url, title, summary) {
    if (!await this.hasReferencePermission(uid, signId)) {
      return -1;
    }

    let ref_sign_id = 0;
    if (this.checkInnerPost(url)) {
      ref_sign_id = this.extractSignId(url);
    }

    try {
      const sql = ` INSERT INTO post_references (sign_id, ref_sign_id, url, title, summary, number, create_time, status) 
                  SELECT :sign_id, :ref_sign_id, :url, :title, :summary, (SELECT IFNULL(MAX(number), 0) + 1 FROM post_references WHERE sign_id=:sign_id), :time, 0
                  ON DUPLICATE KEY UPDATE title = :title, summary = :summary, create_time = :time, status = 0; `;
      await this.app.mysql.query(sql, {
        sign_id: signId, ref_sign_id, url, title, summary, time: moment().format('YYYY-MM-DD HH:mm:ss'),
      });

      return 0;
    } catch (e) {
      this.ctx.logger.error(e);
      return -1;
    }
  }

  async publish(uid, draftId, signId) {
    if (!await this.hasDraftReferencePermission(uid, draftId)) {
      return -1;
    }

    if (!await this.hasReferencePermission(uid, signId)) {
      return -1;
    }

    try {
      await this.app.mysql.update('post_references',
        { sign_id: signId },
        {
          where: { draft_id: draftId },
        });
      return 0;
    } catch (e) {
      this.ctx.logger.error(e);
      return -1;
    }
  }

  async deleteDraftReferenceNode(uid, draftId, number) {
    if (!await this.hasDraftReferencePermission(uid, draftId)) {
      return -1;
    }

    try {
      await this.app.mysql.update('post_references',
        { status: 1 },
        {
          where: { draft_id: draftId, number },
        });
      return 0;
    } catch (e) {
      this.ctx.logger.error(e);
      return -1;
    }
  }
  async deleteReferenceNode(uid, signId, number) {
    if (!await this.hasReferencePermission(uid, signId)) {
      return -1;
    }

    try {
      await this.app.mysql.update('post_references',
        { status: 1 },
        {
          where: { sign_id: signId, number },
        });
      return 0;
    } catch (e) {
      this.ctx.logger.error(e);
      return -1;
    }
  }

  async getDraftReference(uid, draftId, number) {
    const references = await this.app.mysql.select('post_references', {
      columns: [ 'id', 'url', 'title', 'summary', 'number' ],
      where: { draft_id: draftId, number },
    });
    if (references.length > 0) {
      return references[0];
    }

    return null;
  }
  async getReference(uid, signId, number) {
    const references = await this.app.mysql.select('post_references', {
      columns: [ 'id', 'url', 'title', 'summary', 'number' ],
      where: { sign_id: signId, number },
    });
    if (references.length > 0) {
      return references[0];
    }

    return null;
  }

  // 判断是否有权限修改
  async hasDraftReferencePermission(current_uid, draftId) {
    const draft = await this.app.mysql.get('drafts', { id: draftId });
    if (!draft) {
      return false;
    }
    if (draft.uid !== current_uid) {
      return false;
    }
    return true;
  }
  async hasReferencePermission(current_uid, signId) {
    const post = await this.service.post.get(signId);
    if (!post) {
      return false;
    }
    if (post.uid !== current_uid) {
      return false;
    }
    return true;
  }

  // 获取引用的文章列表
  async getDraftReferences(draftId, page = 1, pagesize = 20) {
    const references = await this.app.mysql.query(`
    SELECT url, title, summary, number 
    FROM post_references
    WHERE draft_id = :draftId and status = 0
    LIMIT :start, :end;
    SELECT COUNT(*) AS count FROM post_references WHERE draft_id = :draftId and status = 0;`,
    { draftId, start: (page - 1) * pagesize, end: 1 * pagesize });
    return {
      count: references[1][0].count,
      list: references[0],
    };
  }
  async getReferences(signId, page = 1, pagesize = 20) {
    const references = await this.app.mysql.query(`
    SELECT url, title, summary, number
    FROM post_references
    WHERE sign_id = :signId and status = 0
    LIMIT :start, :end;
    SELECT COUNT(*) AS count FROM post_references WHERE sign_id = :signId and status = 0;`,
    { signId, start: (page - 1) * pagesize, end: 1 * pagesize });
    return {
      count: references[1][0].count,
      list: references[0],
    };
  }

  // 查看本文被引用列表
  async getPosts(signId, page = 1, pagesize = 20) {
    const references = await this.app.mysql.query(`
    SELECT p.id, p.title
    FROM post_references r
    INNER JOIN posts p ON p.id = r.sign_id
    WHERE r.ref_sign_id = :id AND r.status = 0
    LIMIT :start, :end;
    SELECT COUNT(*) AS count FROM post_references WHERE ref_sign_id = :id AND sign_id > 0 AND status = 0;`,
    { id: signId, start: (page - 1) * pagesize, end: 1 * pagesize });
    return {
      count: references[1][0].count,
      list: references[0],
    };
  }
}

module.exports = ReferencesService;
