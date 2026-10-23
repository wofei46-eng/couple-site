@echo off
chcp 65001 >nul
REM 情侣小站 - 一键推送到 GitHub 并部署到 Render
REM 使用方法:
REM   1. 在 GitHub 创建仓库（Public）
REM   2. 运行: deploy.bat 你的GitHub用户名/仓库名
REM   例如: deploy.bat myname/couple-site

if "%1"=="" (
  echo ❌ 请提供 GitHub 仓库名
  echo 用法: deploy.bat GitHub用户名/仓库名
  echo 例如: deploy.bat myname/couple-site
  pause
  exit /b 1
)

set REPO=%1
echo 🚀 开始部署情侣小站到 GitHub: %REPO%
echo.

if not exist ".git" (
  echo 初始化 Git 仓库...
  git init
  git branch -m main
)

git remote -v | findstr origin >nul
if %errorlevel%==0 (
  echo 更新远程仓库地址...
  git remote set-url origin https://github.com/%REPO%.git
) else (
  echo 添加远程仓库...
  git remote add origin https://github.com/%REPO%.git
)

git add -A
git commit -m "更新" 2>nul
echo.
echo 📤 推送到 GitHub...
git push -u origin main

echo.
echo ✅ 代码已推送到 GitHub!
echo.
echo 下一步:
echo   1. 打开 https://render.com
echo   2. New + → Web Service
echo   3. 选择 %REPO% 仓库
echo   4. 点击 Create Web Service
echo.
echo ⏱️ 等待 2-3 分钟部署完成
echo 🎉 访问 https://couple-site.onrender.com
pause
