# 🚀 情侣小站 · Render.com 部署指南

## 一、准备工作

### 1.1 需要的账号
- [GitHub](https://github.com) 账号（免费）
- [Render.com](https://render.com) 账号（免费，可用 GitHub 登录）

### 1.2 项目文件
确保项目根目录包含以下文件（已为你准备好）：
- `package.json` — 包含 `start` 脚本
- `render.yaml` — Render 部署配置
- `.gitignore` — 排除不需要上传的文件
- `downloads/couple-site.apk` — APK 安装包

---

## 二、上传到 GitHub

### 方法一：网页上传（无需命令行）

1. 登录 GitHub，点击右上角 `+` → `New repository`
2. 仓库名：`couple-site`，选择 `Public`，点击 `Create repository`
3. 在仓库页面点击 `Add file` → `Upload files`
4. 上传项目中**除以下目录外**的所有文件：
   - `node_modules/`（依赖包，Render 会自动安装）
   - `dist/`（Electron 桌面端构建产物，不需要）
   - `data.db`（本地数据库，部署后会自动创建）
   - `uploads/`（本地上传的照片）
5. 点击 `Commit changes`

### 方法二：命令行上传

```bash
cd /workspace/couple-site
git init
git add .
git commit -m "情侣小站 - 初始版本"
git branch -M main
git remote add origin https://github.com/你的用户名/couple-site.git
git push -u origin main
```

---

## 三、部署到 Render.com

### 3.1 创建 Web Service

1. 登录 [Render.com](https://dashboard.render.com)
2. 点击 `New +` → `Web Service`
3. 选择 `Build and deploy from a Git repository`
4. 连接你的 GitHub 账号，选择 `couple-site` 仓库
5. 点击 `Connect`

### 3.2 配置服务

Render 会自动读取 `render.yaml` 配置，确认以下设置：

| 设置项 | 值 |
|--------|-----|
| Name | couple-site |
| Runtime | Node |
| Region | Singapore（新加坡，国内访问快） |
| Plan | Free（免费） |
| Build Command | `npm install` |
| Start Command | `node app.js` |

### 3.3 环境变量（免费版无需设置）

免费版无需额外环境变量。如果需要数据持久化（见下文），添加：
```
COUPLE_DATA_DIR = /var/data
```

### 3.4 部署

点击 `Create Web Service`，等待部署完成（约 2-3 分钟）。

部署成功后，你会获得一个网址，例如：
```
https://couple-site.onrender.com
```

---

## 四、验证部署

### 4.1 访问前台
```
https://你的服务名.onrender.com
```
应该能看到情侣小站首页。

### 4.2 访问后台
```
https://你的服务名.onrender.com/admin
```
默认账号：`admin` / `admin123`

### 4.3 下载 APK
```
https://你的服务名.onrender.com/download
```
扫码或点击按钮下载 APK。

---

## 五、数据持久化（重要）

### 问题
Render 免费版没有持久化磁盘，每次重启后：
- 日记、清单、照片会丢失
- 站点设置会恢复默认
- 后台密码重置为 admin123

### 解决方案

#### 方案 A：升级套餐 + 添加磁盘（推荐）

1. 在 Render 后台进入服务设置
2. `Settings` → `Plan` → 升级到 `Starter`（$7/月）
3. 进入 `Disks` → `Add Disk`：
   - 名称：`couple-data`
   - 挂载路径：`/var/data`
   - 大小：`1 GB`
4. 进入 `Environment` → 添加环境变量：
   - Key：`COUPLE_DATA_DIR`
   - Value：`/var/data`
5. 点击 `Save Changes` 自动重新部署

#### 方案 B：使用 VPS（成本更低）

购买腾讯云/阿里云轻量服务器（约 30-50 元/月），参考「VPS 部署指南」。

---

## 六、手机 App 连接公网

### 6.1 下载 APK
打开 `https://你的服务名.onrender.com/download`，下载并安装 APK。

### 6.2 配置服务器地址
打开 App，输入公网地址：
```
你的服务名.onrender.com
```
（App 会自动补全 https://）

### 6.3 随时随地使用
现在你和另一半可以在任何地方访问情侣小站了 💕

---

## 七、常见问题

### Q1：首次访问很慢？
Render 免费版 15 分钟无访问会休眠，首次访问需等待 10-30 秒唤醒。后续访问正常。

### Q2：数据丢了怎么办？
免费版重启会丢数据，请升级到 Starter 套餐并添加磁盘（见第五节）。

### Q3：APK 下载不了？
确保用**系统浏览器**（Chrome/Safari）打开，不要用微信内置浏览器。

### Q4：想换域名？
在 Render 后台 `Settings` → `Custom Domains` 添加你的域名，然后在域名服务商添加 CNAME 记录。

### Q5：如何更新代码？
修改本地代码后 push 到 GitHub，Render 会自动重新部署（`autoDeploy: true`）。

---

## 八、部署清单

- [ ] GitHub 仓库已创建并上传代码
- [ ] Render Web Service 已创建
- [ ] 部署成功，能访问首页
- [ ] 后台能登录（admin/admin123）
- [ ] APK 能正常下载
- [ ] （可选）已升级套餐并添加磁盘实现数据持久化

---

祝部署顺利 💕
