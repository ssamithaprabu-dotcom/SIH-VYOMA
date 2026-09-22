const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'vyoma.db');
const sqliteDb = new sqlite3.Database(dbPath);

const db = {
  get: (sql, params = []) => new Promise((resolve, reject) => {
    sqliteDb.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  }),
  all: (sql, params = []) => new Promise((resolve, reject) => {
    sqliteDb.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  }),
  run: (sql, params = []) => new Promise((resolve, reject) => {
    sqliteDb.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  })
};

const initDb = async () => {
  return new Promise((resolve, reject) => {
    // Enable foreign keys
    sqliteDb.run('PRAGMA foreign_keys = ON;', (err) => {
      if (err) {
        console.error('Failed to enable foreign keys:', err);
        return reject(err);
      }
      
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      
      sqliteDb.exec(schema, (err) => {
        if (err) {
          console.error('Failed to initialize SQLite schema:', err);
          reject(err);
        } else {
          console.log('Successfully connected to SQLite database');
          resolve();
        }
      });
    });
  });
};

module.exports = {
  db,
  initDb
};
