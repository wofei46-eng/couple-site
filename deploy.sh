#!/bin/bash
# 情侣小站 - 一键推送到 GitHub 并部署到 Render
# 使用方法:
#   1. 在 GitHub 创建仓库（Public）
#   2. 运行: ./deploy.sh 你的GitHub用户名/仓库名
#   例如: ./deploy.sh myname/couple-site

set -e

REPO=${1:-}
if [ -z "$REPO" ]; then
  echo "❌ 请提供 GitHub 仓库名"
  echo "用法: $0 GitHub用户名/仓库名"
  echo "例如: $0 myname/couple-site"
  exit 1
fi

echo "🚀 开始部署情侣小站到 GitHub: $REPO"
echo ""

# 检查 git 仓库
if [ ! -d ".git" ]; then
  echo "初始化 Git 仓库..."
  git init
  git branch -m main
fi

# 添加远程仓库
if git remote | grep -q origin; then
  echo "更新远程仓库地址..."
  git remote set-url origin "https://github.com/$REPO.git"
else
  echo "添加远程仓库..."
  git remote add origin "https://github.com/$REPO.git"
fi

# 提交最新代码
git add -A
git commit -m "更新: $(date '+%Y-%m-%d %H:%M')" || echo "无新改动"

# 推送到 GitHub
echo ""
echo "📤 推送到 GitHub..."
git push -u origin main

echo ""
echo "✅ 代码已推送到 GitHub!"
echo ""
echo "下一步:"
echo "  1. 打开 https://render.com"
echo "  2. New + → Web Service"
echo "  3. 选择 $REPO 仓库"
echo "  4. 点击 Create Web Service"
echo ""
echo "⏱️ 等待 2-3 分钟部署完成"
echo "🎉 访问 https://couple-site.onrender.com"
