const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const methodOverride = require('method-override');
const QRCode = require('qrcode');
const db = require('./db');
const settings = require('./settings');

const app = express();
const PORT = process.env.PORT || 3000;

// 信任反向代理（Render.com 等平台需要，用于正确获取 HTTPS 协议）
app.set('trust proxy', 1);

// 上传目录：Electron 打包后 app 目录只读，存到用户数据目录
const uploadDir = process.env.COUPLE_DATA_DIR
  ? path.join(process.env.COUPLE_DATA_DIR, 'uploads')
  : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// 中间件
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(uploadDir));

app.use(session({
  secret: 'couple-site-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

// 文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true);
    else cb(new Error('只允许上传图片'));
  },
});

// 全局变量
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.settings = settings.getAll();
  res.locals.currentPath = req.path;
  res.locals.title = '';
  res.locals.req = req;
  next();
});

// 鉴权中间件
function auth(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/admin/login');
}

// 计算在一起天数
function daysTogether() {
  const anniv = settings.get('anniversary');
  if (!anniv) return 0;
  const start = new Date(anniv);
  const now = new Date();
  return Math.max(0, Math.floor((now - start) / (1000 * 60 * 60 * 24)));
}

// ============ 前台路由 ============

// 首页
app.get('/', (req, res) => {
  const articles = db.prepare('SELECT a.*, u.nickname as author_name FROM articles a JOIN users u ON a.author_id = u.id ORDER BY a.created_at DESC LIMIT 3').all();
  const checklistCount = db.prepare('SELECT COUNT(*) as total, SUM(done) as done FROM checklist').get();
  res.render('index', {
    days: daysTogether(),
    articles,
    checklistCount,
  });
});

// 文章列表
app.get('/articles', (req, res) => {
  const articles = db.prepare('SELECT a.*, u.nickname as author_name FROM articles a JOIN users u ON a.author_id = u.id ORDER BY a.created_at DESC').all();
  res.render('articles', { articles });
});

// 文章详情
app.get('/articles/:id', (req, res) => {
  const article = db.prepare('SELECT a.*, u.nickname as author_name, u.avatar as author_avatar FROM articles a JOIN users u ON a.author_id = u.id WHERE a.id = ?').get(req.params.id);
  if (!article) return res.status(404).render('error', { message: '文章不存在' });
  res.render('article', { article });
});

// 恋爱清单
app.get('/checklist', (req, res) => {
  const items = db.prepare('SELECT * FROM checklist ORDER BY done ASC, created_at ASC').all();
  const stats = db.prepare('SELECT COUNT(*) as total, SUM(done) as done FROM checklist').get();
  res.render('checklist', { items, stats });
});

// 相册
app.get('/photos', (req, res) => {
  const photos = db.prepare('SELECT * FROM photos ORDER BY created_at DESC').all();
  res.render('photos', { photos });
});

// 关于
app.get('/about', (req, res) => {
  res.render('about');
});

// ============ 后台路由 ============

// 登录
app.get('/admin/login', (req, res) => {
  if (req.session.user) return res.redirect('/admin');
  res.render('admin/login', { error: null });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.render('admin/login', { error: '用户名或密码错误' });
  }
  req.session.user = { id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar, role: user.role };
  res.redirect('/admin');
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// 后台首页
app.get('/admin', auth, (req, res) => {
  const articleCount = db.prepare('SELECT COUNT(*) as c FROM articles').get().c;
  const checklistCount = db.prepare('SELECT COUNT(*) as c FROM checklist').get().c;
  const photoCount = db.prepare('SELECT COUNT(*) as c FROM photos').get().c;
  const recentArticles = db.prepare('SELECT * FROM articles ORDER BY created_at DESC LIMIT 5').all();
  res.render('admin/dashboard', { articleCount, checklistCount, photoCount, recentArticles });
});

// ---- 文章管理 ----
app.get('/admin/articles', auth, (req, res) => {
  const articles = db.prepare('SELECT a.*, u.nickname as author_name FROM articles a JOIN users u ON a.author_id = u.id ORDER BY a.created_at DESC').all();
  res.render('admin/articles', { articles });
});

app.get('/admin/articles/new', auth, (req, res) => {
  res.render('admin/article-edit', { article: null });
});

app.post('/admin/articles', auth, (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.redirect('/admin/articles/new');
  db.prepare('INSERT INTO articles (title, content, author_id) VALUES (?, ?, ?)')
    .run(title, content, req.session.user.id);
  res.redirect('/admin/articles');
});

app.get('/admin/articles/:id/edit', auth, (req, res) => {
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
  if (!article) return res.redirect('/admin/articles');
  res.render('admin/article-edit', { article });
});

app.put('/admin/articles/:id', auth, (req, res) => {
  const { title, content } = req.body;
  db.prepare('UPDATE articles SET title = ?, content = ? WHERE id = ?').run(title, content, req.params.id);
  res.redirect('/admin/articles');
});

app.delete('/admin/articles/:id', auth, (req, res) => {
  db.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
  res.redirect('/admin/articles');
});

// ---- 清单管理 ----
app.get('/admin/checklist', auth, (req, res) => {
  const items = db.prepare('SELECT * FROM checklist ORDER BY created_at DESC').all();
  res.render('admin/checklist', { items });
});

app.post('/admin/checklist', auth, (req, res) => {
  const { title, emoji } = req.body;
  if (title) db.prepare('INSERT INTO checklist (title, emoji) VALUES (?, ?)').run(title, emoji || '💕');
  res.redirect('/admin/checklist');
});

app.put('/admin/checklist/:id', auth, (req, res) => {
  const { title, emoji, done } = req.body;
  db.prepare('UPDATE checklist SET title = ?, emoji = ?, done = ? WHERE id = ?')
    .run(title, emoji || '💕', done ? 1 : 0, req.params.id);
  res.redirect('/admin/checklist');
});

// 前台切换清单完成状态
app.post('/checklist/:id/toggle', (req, res) => {
  const item = db.prepare('SELECT * FROM checklist WHERE id = ?').get(req.params.id);
  if (item) {
    db.prepare('UPDATE checklist SET done = ? WHERE id = ?').run(item.done ? 0 : 1, req.params.id);
  }
  res.redirect('/checklist');
});

app.delete('/admin/checklist/:id', auth, (req, res) => {
  db.prepare('DELETE FROM checklist WHERE id = ?').run(req.params.id);
  res.redirect('/admin/checklist');
});

// ---- 相册管理 ----
app.get('/admin/photos', auth, (req, res) => {
  const photos = db.prepare('SELECT * FROM photos ORDER BY created_at DESC').all();
  res.render('admin/photos', { photos });
});

app.post('/admin/photos', auth, upload.single('photo'), (req, res) => {
  if (!req.file) return res.redirect('/admin/photos');
  const caption = req.body.caption || '';
  db.prepare('INSERT INTO photos (filename, caption) VALUES (?, ?)').run('/uploads/' + req.file.filename, caption);
  res.redirect('/admin/photos');
});

app.delete('/admin/photos/:id', auth, (req, res) => {
  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id);
  if (photo) {
    const fs = require('fs');
    const filepath = path.join(__dirname, photo.filename);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.id);
  }
  res.redirect('/admin/photos');
});

// ---- 设置管理 ----
app.get('/admin/settings', auth, (req, res) => {
  res.render('admin/settings');
});

app.put('/admin/settings', auth, (req, res) => {
  const { site_name, site_subtitle, anniversary, about_text, left_name, right_name } = req.body;
  settings.set('site_name', site_name || '');
  settings.set('site_subtitle', site_subtitle || '');
  settings.set('anniversary', anniversary || '');
  settings.set('about_text', about_text || '');
  settings.set('left_name', left_name || '');
  settings.set('right_name', right_name || '');

  // 头像上传
  if (req.files) {
    // 简化：这里不处理
  }
  res.redirect('/admin/settings');
});

// 单独处理头像上传
app.post('/admin/settings/avatar', auth, upload.fields([
  { name: 'left_avatar', maxCount: 1 },
  { name: 'right_avatar', maxCount: 1 },
  { name: 'hero_background', maxCount: 1 },
]), (req, res) => {
  if (req.files.left_avatar) settings.set('left_avatar', '/uploads/' + req.files.left_avatar[0].filename);
  if (req.files.right_avatar) settings.set('right_avatar', '/uploads/' + req.files.right_avatar[0].filename);
  if (req.files.hero_background) settings.set('hero_background', '/uploads/' + req.files.hero_background[0].filename);
  res.redirect('/admin/settings');
});

// 修改密码
app.post('/admin/settings/password', auth, (req, res) => {
  const { old_password, new_password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);
  if (!bcrypt.compareSync(old_password, user.password)) {
    return res.redirect('/admin/settings?err=oldpwd');
  }
  if (!new_password || new_password.length < 6) {
    return res.redirect('/admin/settings?err=short');
  }
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, req.session.user.id);
  res.redirect('/admin/settings?ok=1');
});

// APK 下载页面（带二维码，手机扫码即可下载）
app.get('/download', async (req, res) => {
  const apkPath = path.join(__dirname, 'downloads', 'couple-site.apk');
  if (!fs.existsSync(apkPath)) {
    return res.status(404).send('APK 文件不存在');
  }
  const apkSize = (fs.statSync(apkPath).size / 1024 / 1024).toFixed(1);
  // 构造当前访问地址，用于二维码
  const protocol = req.protocol;
  const host = req.get('host');
  const downloadUrl = `${protocol}://${host}/download`;
  let qrDataUrl = '';
  try {
    qrDataUrl = await QRCode.toDataURL(downloadUrl, { width: 300, margin: 2 });
  } catch (e) {
    console.error('QRCode 生成失败:', e.message);
  }
  res.render('download', {
    qrDataUrl,
    downloadUrl,
    apkSize,
    title: '下载 App',
    settings: settings.getAll(),
    currentPath: req.path,
    user: req.session.user || null
  });
});

// APK 文件下载
app.get('/download/apk', (req, res) => {
  const apkPath = path.join(__dirname, 'downloads', 'couple-site.apk');
  if (!fs.existsSync(apkPath)) {
    return res.status(404).send('APK 文件不存在');
  }
  const stat = fs.statSync(apkPath);
  // 使用 ASCII 文件名，避免部分手机浏览器中文编码问题
  res.setHeader('Content-Disposition', 'attachment; filename="couple-site-1.0.0.apk"');
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Length', stat.size);
  fs.createReadStream(apkPath).pipe(res);
});

// 404
app.use((req, res) => {
  res.status(404).render('error', { message: '页面不存在' });
});

function startServer(port = PORT) {
  return app.listen(port, '0.0.0.0', () => {
    console.log(`💕 情侣小站已启动: http://localhost:${port}`);
    console.log(`后台地址: http://localhost:${port}/admin  (默认账号 admin / admin123)`);
    console.log(`📱 App 下载页: http://localhost:${port}/download`);
  });
}

// 直接运行时启动服务器；被 Electron 引入时不自动启动
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, PORT };
