import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

import mariadb from 'mariadb';
import { readFileSync } from 'fs';

const sql = readFileSync('./sql/schema.sql').toString().split(';');
for (const i in sql) if (!sql[i]) sql.splice(parseInt(i), 1);

console.log('connecting to database:', process.env.DATABASE_URL);
const url = new URL(process.env.DATABASE_URL);

const pool = mariadb.createPool({
  host: url.hostname,
  user: url.username,
  password: url.password,
  database: url.pathname.substring(1),
  port: url.port || 3306,
});

console.log('running', sql.length, 'migrations\n');

pool
  .getConnection()
  .then(async (conn) => {
    for (const i in sql)
      await conn
        .query(sql[i])
        .then(() => {
          console.log('executed query', parseInt(i) + 1, 'successfully');
        })
        .catch((err) => {
          console.error(
            'error running query',
            parseInt(i) + 1,
            ':',
            err.message,
          );
          conn.release();
        });

    await pool.end();
    console.info('\nmigration done!');
  })
  .catch((err) => {
    console.error('database connection error:', err.message);
  });
