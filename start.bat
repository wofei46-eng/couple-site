@echo off
chcp 65001 >nul
title 情侣小站
cd /d "%~dp0"

echo 💕 情侣小站启动中...
echo ================================

where node >nul 2>nul
if errorlevel 1 (
  echo ❌ 未检测到 Node.js，请先安装: https://nodejs.org
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo 📦 首次运行，正在安装依赖...
  call npm install
)

echo.
echo ✅ 服务启动成功！
echo ================================
echo 📱 手机访问地址（需连同一WiFi）：
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
  for /f "tokens=* delims= " %%b in ("%%a") do echo    http://%%b:3000
)
echo.
echo 🖥️  电脑本地访问：
echo    http://localhost:3000
echo.
echo 🔧 后台管理：http://localhost:3000/admin
echo    默认账号: admin  密码: admin123
echo.
echo 💡 手机安装为 App 的方法：
echo    Android(Chrome): 菜单 → 添加到主屏幕
echo    iPhone(Safari):  分享 → 添加到主屏幕
echo ================================
echo.

node app.js
pause
