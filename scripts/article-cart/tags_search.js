const axios = require('axios');
const mysql = require('mysql2/promise');
const config = require('./config.local.json');
const elastic = require('@elastic/elasticsearch');

async function catcherTag(start = 0, end = null) {

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
  const TagsCountQuery = await mysqlConnection.execute(
    'SELECT COUNT(*) AS count FROM tags;'
  );

  console.log(`There are ${TagsCountQuery[0][0].count} users here...`);

  // 有start和end的话， 就从他们开始吧！
  for (let index = start; index < (end ? end : TagsCountQuery[0][0].count); index++) {
    console.log('---- ---- ---- ---- ---- ---- ---- ----');
    console.log(`Current index ${index}`);
    // ..
    const tagDetailQuery = await mysqlConnection.execute(
      'SELECT id, create_time, name, num FROM tags ORDER BY id DESC LIMIT ?, 1;',
      [ index ]
    );
    currentId = tagDetailQuery[0][0].id;

    // ..
    elaQuery = await elaClient.search({
      index: config.indexTags,
      q: `id:${currentId}`,
    });
    if (elaQuery.body.hits.hits.length !== 0) {
      console.log(`Current user id ${currentId} already added...`);
      continue;
    }

    await elaClient.index({
      id: currentId,
      index: config.indexTags,
      body: {
        id: currentId,
        create_time: tagDetailQuery[0][0].create_time,
        name: tagDetailQuery[0][0].name,
      },
    });
  }
}

async function createTag() {
  await axios({
    url: `${config.elastic_address}/${config.indexTags}`,
    method: 'PUT',
    data: {
      settings: {
        analysis: {
          analyzer: {
            my_analyzer: {
              tokenizer: 'my_tokenizer',
            },
          },
          tokenizer: {
            my_tokenizer: {
              type: 'edge_ngram',
              min_gram: 1,
              max_gram: 10,
              token_chars: [ 'letter', 'digit' ],
            },
          },
        },
      },
      mappings: {
        properties: {
          id: {
            type: 'long',
          },
          create_time: {
            type: 'date',
          },
          name: {
            type: 'text',
            analyzer: 'ik_max_word',
            search_analyzer: 'ik_max_word',
            fields: {
              english: {
                type: 'text',
                analyzer: 'my_analyzer',
                search_analyzer: 'ik_max_word',
              },
            },
          },
        },
      },
    },
  });
}

async function deleteTag() {
  await axios({
    url: `${config.elastic_address}/${config.indexTags}`,
    method: 'DELETE',
  });
}

async function handle() {
  console.log('---- ----Elastic Search sync tool---- ----');
  const type = process.argv[2];
  if (type === 'create') {
    await createTag();
  } else if (type === 'delete') {
    await deleteTag();
  } else if (type === 'sync') {
    await catcherTag();
  }
}

handle();
