// 收藏文章迁移到收藏夹
const mysql2 = require('mysql2/promise');
const moment = require('moment');


const config = require('./config.json');

const init = async () => {
  const mysql = await mysql2.createConnection({
    host: config.mysql_host,
    user: config.mysql_user,
    password: config.mysql_password,
    database: config.mysql_db,
    multipleStatements: true,
    // ssl: {},
  });

  const [ rows, fields ] = await mysql.execute('SELECT * FROM post_bookmarks;');
  // console.log('rows, fields', rows);

  // arr to object { key: uid: val: [{ uid, pid, create_time }] }
  const favList = {};
  rows.forEach(el => {
    // console.log('el', el);
    if (favList[el.uid]) {
      favList[el.uid].push(el);
    } else {
      favList[el.uid] = [];
      favList[el.uid].push(el);
    }
  });
  console.log('favList', JSON.stringify(favList));

  // 创建默认收藏夹 权限私有
  const time = moment().format('YYYY-MM-DD HH:mm:ss');
  let favSql = '';
  Object.keys(favList).forEach(el => {
    favSql += `INSERT INTO favorites (uid, name, brief, status, create_time, update_time) VALUES(${el}, '默认收藏夹', '', 1, '${time}', '${time}');`;
  });
  const [ favRows, favFields ] = await mysql.query(favSql);
  // console.log('favRows, fields', favRows);

  // 写入到文件夹
  const fidList = favRows.map(i => i.insertId);
  console.log('fidList', fidList);

  let favPostListSql = '';
  Object.keys(favList).forEach((el, idx) => {
    favList[el].forEach(e => {
      const timePost = moment(e.create_time).format('YYYY-MM-DD HH:mm:ss');
      favPostListSql += `INSERT INTO favorites_list (fid, pid, create_time) VALUES(${fidList[idx]}, ${e.pid}, '${timePost}');`;
    });
  });

  console.log('favPostListSql', favPostListSql);
  await mysql.query(favPostListSql);

};

init();

