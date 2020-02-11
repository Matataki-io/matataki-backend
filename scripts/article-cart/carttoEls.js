// Copy article to Elastic
// ...
// 使用nodejs环境debug本script即可

// 创建文章/用户index
// node carttoEls.js create posts
// node carttoEls.js create users

// 同步文章/用户数据
// node carttoEls.js sync posts
// node carttoEls.js sync users
// 也可以从顺序第多少个开始（第X个， 不是id为X）
// node carttoEls.js sync posts 100
// node carttoEls.js sync users 10

// 删除index
// node carttoEls.js delete posts
// node carttoEls.js delete users

// 搜索
// node carttoEls.js search posts 100001
// node carttoEls.js search users 1001
// node carttoEls.js

// 请注意当前用的是config.local.json
const axios = require('axios');
const mysql = require('mysql2/promise');
const config = require('./config.local.json');
const elastic = require('@elastic/elasticsearch');
const removemd = require('remove-markdown');
// const striptags = require('striptags');

// 万物之源， 文明火种。
async function catcherPost(start = 0, end = null) {
  let articleDetailQuery = null;
  let articleRawContent = null;
  let currentId = null;
  let currentHash = null;
  let elaQuery = null;
  // let articleUpdate = null;
  let parsedContent = null;
  // 创建MySQL连接
  const mysqlConnection = await mysql.createPool({
    host: config.mysql_host,
    user: config.mysql_user,
    password: config.mysql_password,
    database: config.mysql_db,
    ssl: {},
  });
  // 创建Elastic连接
  const elaClient = new elastic.Client({ node: config.elastic_address });

  // 还是只拉取有效， 没有被删除的文章好了
  const articleCountQuery = await mysqlConnection.execute(
    'SELECT COUNT(*) AS count FROM posts WHERE status = 0 AND channel_id = 1;'
  );

  console.log(`There are ${articleCountQuery[0][0].count} articles here...`);

  // 有start和end的话， 就从他们开始吧！
  for (let index = start; index < (end ? end : articleCountQuery[0][0].count); index += 1) {
    console.log('---- ---- ---- ---- ---- ---- ---- ----');
    console.log(`Current index ${index}`);
    // 在某篇文章处卡断推出， 请重启脚本
    articleDetailQuery = await mysqlConnection.execute(
      'SELECT id, create_time, title, channel_id, hash '
      + 'FROM posts WHERE status = 0 AND channel_id = 1 ORDER BY id DESC LIMIT ?, 1;',
      [ index ]
    );
    currentId = articleDetailQuery[0][0].id;

    // 文章是否已经添加入Elastic数据库， 已经添加则会跳过
    elaQuery = await elaClient.search({
      index: config.indexPosts,
      q: `id:${currentId}`,
    });
    if (elaQuery.body.hits.hits.length !== 0) {
      console.log(`Current article id ${currentId} already added...`);
      continue;
    }

    currentHash = articleDetailQuery[0][0].hash;
    // 文章没有ipfs哈希， 则掠过， 不会退出
    if (!currentHash) {
      console.log(`Current article id ${currentId} do not have content!`);
      continue;
    }
    console.log(`Current article id ${currentId} hash ${currentHash}`);

    // 取内容失败， 多数是无效的ipfs哈希引起， 会掠过， 不会退出
    try {
      articleRawContent = await axios({
        url: `https://api.smartsignature.io/post/ipfs/${currentHash}`,
        method: 'get',
        timeout: 3000,
      });
    } catch (e) {
      console.log(`Current article id ${currentId} has a broken hash... ignored...`);
      console.log(e);
      continue;
    }

    // ipfs获取出错， 可能为其中没有实际文本内容， 会掠过， 不会退出
    if (articleRawContent.data.code !== 0) {
      console.log(`Current article id ${currentId} wrong content structure... ignored...`);
      continue;
    }

    parsedContent = await wash(articleRawContent.data.data.content);
    console.log(parsedContent.substring(0, 100));

    // 插入文章失败， 请重启脚本
    await elaClient.index({
      id: currentId,
      index: config.indexPosts,
      body: {
        id: currentId,
        // uid: articleDetailQuery[0][0].uid,
        create_time: articleDetailQuery[0][0].create_time,
        // username: articleDetailQuery[0][0].username,
        // nickname: articleDetailQuery[0][0].nickname,
        title: articleDetailQuery[0][0].title,
        channel_id: articleDetailQuery[0][0].channel_id,
        content: parsedContent,
      },
    });
  }
}

async function catcherUser(start = 0, end = null) {

  let userDetailQuery;
  let currentId;
  let elaQuery;
  // 创建MySQL连接
  const mysqlConnection = await mysql.createPool({
    host: config.mysql_host,
    user: config.mysql_user,
    password: config.mysql_password,
    database: config.mysql_db,
    ssl: {},
  });
  // 创建Elastic连接
  const elaClient = new elastic.Client({ node: config.elastic_address });

  // 用户数量！
  const userCountQuery = await mysqlConnection.execute(
    'SELECT COUNT(*) AS count FROM users;'
  );

  console.log(`There are ${userCountQuery[0][0].count} users here...`);

  // 有start和end的话， 就从他们开始吧！
  for (let index = start; index < (end ? end : userCountQuery[0][0].count); index += 1) {
    console.log('---- ---- ---- ---- ---- ---- ---- ----');
    console.log(`Current index ${index}`);
    // ..
    userDetailQuery = await mysqlConnection.execute(
      'SELECT id, create_time, username, nickname FROM users ORDER BY id DESC LIMIT ?, 1;',
      [ index ]
    );
    currentId = userDetailQuery[0][0].id;

    // ..
    elaQuery = await elaClient.search({
      index: config.indexUsers,
      q: `id:${currentId}`,
    });
    if (elaQuery.body.hits.hits.length !== 0) {
      console.log(`Current user id ${currentId} already added...`);
      continue;
    }
    console.log(`${userDetailQuery[0][0].id} ${userDetailQuery[0][0].username} ${userDetailQuery[0][0].nickname}`);

    await elaClient.index({
      id: currentId,
      index: config.indexUsers,
      body: {
        id: currentId,
        create_time: userDetailQuery[0][0].create_time,
        username: userDetailQuery[0][0].username,
        nickname: userDetailQuery[0][0].nickname,
      },
    });
  }
}

// 看一看？
async function performSearch(word) {
  const elaClient = new elastic.Client({ node: config.elastic_address });
  const search = await elaClient.search({
    index: config.indexPosts,
    body: {
      query: {
        match: {
          content: word,
        },
      },
      highlight: {
        fields: {
          content: {},
        },
      },
    },
  });
  console.log(search.body.hits);
  for (let index = 0; index < search.body.hits.hits.length; index += 1) {
    for (let cindex = 0; cindex < search.body.hits.hits[index].highlight.content.length; cindex += 1) {
      console.log(search.body.hits.hits[index].highlight.content[cindex]);
    }
    console.log('---- ---- ---- ----');
  }

}

async function search2(area = 'posts', keyword = '1') {
  const result = await axios({
    url: `${config.elastic_address}/${area}/_search?q=id:${keyword}`,
    method: 'GET',
  });
  console.log(result.data.hits.hits);
}

async function wash(rawContent) {
  if (!rawContent) {
    return '';
  }
  let parsedContent = rawContent;
  // 去除markdown图片链接
  parsedContent = parsedContent.replace(/!\[.*?\]\((.*?)\)/gi, '');
  // 去除video标签
  parsedContent = parsedContent.replace(/<video.*?>\n*?.*?\n*?<\/video>/gi, '');
  parsedContent = parsedContent.replace(/<[^>]+>/gi, '');
  // 去除markdown和html
  parsedContent = removemd(parsedContent);
  // 去除空格
  parsedContent = parsedContent.replace(/\s+/g, '');
  return parsedContent;
}

// 创造空间！
async function createTb() {
  await axios({
    url: `${config.elastic_address}/${config.indexPosts}`,
    method: 'PUT',
    data: {
      mappings: {
        properties: {
          id: {
            type: 'long',
          },
          // uid: {
          //     type: 'long'
          // },
          create_time: {
            type: 'date',
          },
          channel_id: {
            type: 'short',
          },
          title: {
            type: 'text',
            analyzer: 'ik_max_word',
            search_analyzer: 'ik_smart',
          },
          // nickname: {
          //     type: 'text',
          //     analyzer: 'ik_max_word',
          //     search_analyzer: 'ik_smart',
          // },
          // username: {
          //     type: 'text',
          //     analyzer: 'ik_max_word',
          //     search_analyzer: 'ik_smart',
          // },
          content: {
            type: 'text',
            analyzer: 'ik_max_word',
            search_analyzer: 'ik_smart',
          },
        },
      },
    },
  });
}

async function createUs() {
  await axios({
    url: `${config.elastic_address}/${config.indexUsers}`,
    method: 'PUT',
    data: {
      mappings: {
        properties: {
          id: {
            type: 'long',
          },
          create_time: {
            type: 'date',
          },
          nickname: {
            type: 'text',
            analyzer: 'ik_max_word',
            search_analyzer: 'ik_max_word',
          },
          username: {
            type: 'text',
            analyzer: 'ik_max_word',
            search_analyzer: 'ik_max_word',
          },
        },
      },
    },
  });
}

// 忘记它罢！
async function deleteTb() {
  await axios({
    url: `${config.elastic_address}/${config.indexPosts}`,
    method: 'DELETE',
  });
}

async function deleteUs() {
  await axios({
    url: `${config.elastic_address}/${config.indexUsers}`,
    method: 'DELETE',
  });
}

// catcher();
// performSearch('市场');

async function handle() {
  console.log('---- ----Elastic Search sync tool---- ----');
  if (process.argv.length < 3) {
    console.log('What do you want to do.. ?');
    console.log('Remember to run "npm install" first');
    console.log('Run "node carttoEls.js create" to create the document.');
    console.log('Run "node carttoEls.js delete" to delete the document.');
    console.log('Run "node carttoEls.js sync :start :end" to sync data.');
    console.log('Run "node carttoEls.js search :word" to perform a search.');
    return 9;
  }
  if (process.argv[2] === 'create') {
    if (process.argv[3] === 'posts') {
      await createTb();
    } else if (process.argv[3] === 'users') {
      await createUs();
    }
  } else if (process.argv[2] === 'delete') {
    if (process.argv[3] === 'posts') {
      await deleteTb();
    } else if (process.argv[3] === 'users') {
      await deleteUs();
    }
  } else if (process.argv[2] === 'sync') {
    // node carttoEls.js sync posts 0 9999
    if (process.argv.length < 4) {
      return 8;
    }
    let startIndex = 0;
    if (process.argv.length === 5) {
      startIndex = parseInt(process.argv[4]);
      if (isNaN(startIndex)) {
        return 7;
      }
    }
    let endIndex = null;
    if (process.argv.length === 6) {
      endIndex = parseInt(process.argv[5]);
      if (isNaN(endIndex)) {
        endIndex = null;
      }
    }
    if (process.argv[3] === 'posts') {
      await catcherPost(startIndex, endIndex);
    } else if (process.argv[3] === 'users') {
      await catcherUser(startIndex, endIndex);
    }
  } else if (process.argv[2] === 'search') {
    if (process.argv.length < 4) {
      return 6;
    }
    const area = process.argv[3];
    const keyword = process.argv[4];
    await search2(area, keyword);
  }
}

handle();
// deleteTb();
// deleteUs();
// createTb();
// createUs();
// catcherUser();
// catcherPost();
