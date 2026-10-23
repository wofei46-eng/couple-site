#!/usr/bin/env bash
# 情侣小站 - 一键启动脚本（支持手机局域网访问 + PWA 安装）
set -e

cd "$(dirname "$0")"

echo "💕 情侣小站启动中..."
echo "================================"

# 检查 Node.js
if ! command -v node &> /dev/null; then
  echo "❌ 未检测到 Node.js，请先安装: https://nodejs.org"
  exit 1
fi

# 安装依赖（首次运行）
if [ ! -d "node_modules" ]; then
  echo "📦 首次运行，正在安装依赖..."
  npm install
fi

# 获取本机局域网 IP
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
else
  # Linux / Windows(Git Bash)
  LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
  if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP=$(ip route get 1 2>/dev/null | awk '{print $7; exit}')
  fi
fi

echo ""
echo "✅ 服务启动成功！"
echo "================================"
echo "📱 手机访问地址（需连同一WiFi）："
echo "   http://${LOCAL_IP:-你的电脑IP}:3000"
echo ""
echo "🖥️  电脑本地访问："
echo "   http://localhost:3000"
echo ""
echo "🔧 后台管理：http://localhost:3000/admin"
echo "   默认账号: admin  密码: admin123"
echo ""
echo "💡 手机安装为 App 的方法："
echo "   Android(Chrome): 菜单 → 添加到主屏幕"
echo "   iPhone(Safari):  分享 → 添加到主屏幕"
echo "================================"
echo ""

# 启动服务器
exec node app.js
