const express = require('express')
const mysql = require('mysql2/promise');
const cors = require('cors')
const bluebird = require('bluebird');
const app = express()
const bodyParser = require('body-parser')
const jsonParser = bodyParser.json()

app.use(cors())

let connection = null;

const port =  process.env.PORT || 8080;
app.listen(port, () => console.log(`listening on port ${port}`));

/**
 * GET /scoreAll
 * スコアの取得
 * @return {Array} スコアの配列
 * @return {string} スコアの配列[].name 名前
 * @return {number} スコアの配列[].score スコア
 * @return {string} スコアの配列[].createdAt 登録日時
 * @return {string} スコアの配列[].updatedAt 更新日時
 */
app.get('/scoreAll', async function (req, res, next) {
  let [rows, field] = [null, null];
  try {
    await dbConnection();
    [rows, field] = await dbQuery('SELECT * FROM yoke_score ORDER BY score DESC');
  } catch (e) {
    res.status(500).json({ result: { message: e.message } });
  } finally {
    await dbClose();
  }
  if (rows.length >= 10) {
    rows = rows.slice(0, 10);
  }
  res.status(200).json({ result: rows });
})

/**
 * POST /score
 * スコアの登録
 * @param {string} name 名前
 * @param {number} score スコア
 */
app.post('/score', jsonParser, async function (req, res, next) {
  const body = req.body;
  console.log(body);

  const name = body.name;
  const score = body.score;
  try {
    if (!name) throw new Error('Nameが空です。');
    if (name.length > 10) throw new Error('Nameが長すぎます。');
    if (!score || score <= 0) throw new Error('Scoreが0以下です。');
    if (score > 100000) throw new Error('Scoreが大きすぎます。');
  } catch (e) {
    res.status(400).json({ result: { message: e.message } });
  }

  try {
    await dbConnection();
    await dbExecute('INSERT INTO yoke_score (name, score) VALUES (?, ?)', [name, score]);
  } catch (e) {
    res.status(500).json({ result: { message: e.message } });
  } finally {
    await dbClose();
  }

  res.status(201).json({ result: { message: 'Scoreを登録しました。' } });
});

/**
 * DB接続
 * @returns 
 */
async function dbConnection() {
  if (connection) {
    return connection;
  }
  connection = await mysql.createConnection({ 
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    Promise: bluebird});
}

/**
 * DB切断
 */
async function dbClose() {
  if (connection) {
    await connection.end();
    connection = null;
  }
}

/**
 * DBクエリ
 * @param {*} sql 
 * @param {*} params 
 * @returns 
 */
async function dbQuery(sql, params) {
  return await connection.query(sql, params);
}

/**
 * DB実行
 * @param {*} sql 
 * @param {*} params 
 * @returns 
 */
async function dbExecute(sql, params) {
  return await connection.execute(sql, params);
}