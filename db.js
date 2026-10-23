const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 优先使用用户数据目录（Electron 打包后 app 目录只读），否则用项目目录
const dataDir = process.env.COUPLE_DATA_DIR || __dirname;
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'data.db'));

// 开启外键
db.pragma('foreign_keys = ON');

// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nickname TEXT NOT NULL,
    avatar TEXT,
    role TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    author_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS checklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    emoji TEXT DEFAULT '💕',
    done INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    caption TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// 初始化默认设置
const initSettings = [
  ['site_name', '我们的小站'],
  ['site_subtitle', '愿得一人心，白首不相离'],
  ['anniversary', '2024-01-01'],
  ['hero_background', ''],
  ['about_text', '欢迎来到我们的小站，这里记录着我们的点点滴滴。'],
  ['left_name', '小左'],
  ['right_name', '小右'],
  ['left_avatar', '/img/avatar-left.svg'],
  ['right_avatar', '/img/avatar-right.svg'],
];

for (const [key, value] of initSettings) {
  const exists = db.prepare('SELECT key FROM settings WHERE key = ?').get(key);
  if (!exists) {
    db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, value);
  }
}

// 初始化默认管理员 (admin / admin123)
const bcrypt = require('bcryptjs');
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password, nickname, avatar, role) VALUES (?, ?, ?, ?, ?)')
    .run('admin', hash, '管理员', '/img/avatar-left.svg', 'admin');
}

// 初始化默认清单
const checklistCount = db.prepare('SELECT COUNT(*) as c FROM checklist').get().c;
if (checklistCount === 0) {
  const items = [
    ['一起看一场电影', '🎬'],
    ['一起去海边', '🌊'],
    ['一起做饭', '🍳'],
    ['一起旅行', '✈️'],
    ['一起拍合照', '📷'],
    ['一起见父母', '👨‍👩‍👧'],
    ['一起挑选戒指', '💍'],
    ['一起去看演唱会', '🎤'],
  ];
  const stmt = db.prepare('INSERT INTO checklist (title, emoji) VALUES (?, ?)');
  for (const [title, emoji] of items) stmt.run(title, emoji);
}

// 初始化默认文章
const articleCount = db.prepare('SELECT COUNT(*) as c FROM articles').get().c;
if (articleCount === 0) {
  const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  db.prepare('INSERT INTO articles (title, content, author_id) VALUES (?, ?, ?)')
    .run('欢迎来到我们的小站 💕', '<p>这是我们的第一篇日记，记录我们美好的开始。</p><p>在这里，我们可以一起书写属于我们的故事。</p>', admin.id);
}

module.exports = db;
