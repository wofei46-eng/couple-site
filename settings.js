const db = require('./db');

const settings = {
  get(key, fallback = '') {
    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : fallback;
  },
  set(key, value) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
      .run(key, value);
  },
  getAll() {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const obj = {};
    for (const r of rows) obj[r.key] = r.value;
    return obj;
  },
};

module.exports = settings;
