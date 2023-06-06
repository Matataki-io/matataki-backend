/* eslint-disable no-console */

'use strict';

const path = require('path');
const process = require('process');
const mysql = require('mysql');
const fs = require('fs');

const appConfig = require('../../config/config.default');

const cwd = process.cwd();
const file = path.join(cwd, 'database', 'db-dump.sql');

const config = appConfig({}).mysql.client;
console.log(`Connect to ${config.host}:${config.port}...`);
const connection = mysql.createConnection({ ...config, multipleStatements: true });

connection.connect();
console.log(`Connected to ${config.host}:${config.port}`);

console.log(`Read SQL file ${file}...`);
const sql = fs.readFileSync(file).toString();

console.log(`Query SQL file ${file}...`);
connection.query(sql, function(err) {
  if (err) {
    err.file = file;
    console.log(`Error when query SQL file ${file}`);
    console.error(err);
  }
});

connection.end();
console.log(`Query SQL file ${file} done`);
