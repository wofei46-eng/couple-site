#!/bin/bash
# =====================================================
# 情侣小站 - 手机端一键上传到 GitHub
# 支持 Termux(Android) 和 iSH(iOS)
# 使用方法:
#   1. 把手机解压后的 couple-site 文件夹完整放到 Termux/iSH 里
#   2. cd 进入该文件夹
#   3. bash mobile-upload.sh
# =====================================================

set -e

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PINK='\033[1;35m'
NC='\033[0m' # No Color

# 打印带颜色的信息
info() { echo -e "${BLUE}ℹ️ $1${NC}"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️ $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
heart() { echo -e "${PINK}💕 $1${NC}"; }

# 标题
heart "情侣小站 - 手机一键上传脚本"
echo ""

# =====================================================
# 0. 环境检测
# =====================================================
info "正在检测手机环境..."

IS_TERMUX=false
IS_ISH=false

if [ -n "$TERMUX_VERSION" ] || [ -d "/data/data/com.termux" ]; then
    IS_TERMUX=true
    success "检测到 Termux (Android)"
fi

if [ -n "$ISH_VERSION" ] || [ -d "/proc/ish" ] || [ "$(uname -m)" = "i686" ] && [ "$(uname -o)" = "iOS" ]; then
    IS_ISH=true
    success "检测到 iSH (iOS)"
fi

if [ "$IS_TERMUX" = false ] && [ "$IS_ISH" = false ]; then
    warn "未检测到 Termux 或 iSH，脚本仍可运行，但可能在普通 Linux 环境中"
fi

# =====================================================
# 1. 检查必要命令
# =====================================================
info "检查 git 是否已安装..."

if ! command -v git &> /dev/null; then
    warn "git 未安装"
    if [ "$IS_TERMUX" = true ]; then
        echo ""
        info "正在自动安装 git..."
        pkg update -y && pkg install git -y
    elif [ "$IS_ISH" = true ]; then
        echo ""
        info "正在自动安装 git..."
        apk update && apk add git
    else
        error "请先安装 git"
        echo ""
        echo "Termux:  pkg install git"
        echo "iSH:      apk add git"
        exit 1
    fi
fi

success "git 已就绪"

# =====================================================
# 2. 检查当前目录是否正确
# =====================================================
if [ ! -f "package.json" ] || [ ! -f "render.yaml" ] || [ ! -f "app.js" ]; then
    error "当前目录看起来不是情侣小站项目根目录"
    echo ""
    echo "请确认你在 couple-site 文件夹内运行此脚本"
    echo "当前目录: $(pwd)"
    exit 1
fi

success "已定位到项目目录: $(pwd)"

# =====================================================
# 3. 获取 GitHub 信息
# =====================================================
echo ""
info "请输入 GitHub 信息"

# 读取 GitHub 用户名
read -p "🐙 GitHub 用户名 (默认: testuser): " GITHUB_USER
GITHUB_USER=${GITHUB_USER:-testuser}

# 读取仓库名
read -p "📦 仓库名 (默认: couple-site): " REPO_NAME
REPO_NAME=${REPO_NAME:-couple-site}

REPO="$GITHUB_USER/$REPO_NAME"

# 读取 Token（隐藏输入）
echo ""
warn "Token 输入时不会显示，这是正常的"
read -s -p "🔑 GitHub Personal Access Token (ghp_xxxx): " GITHUB_TOKEN
echo ""

if [ -z "$GITHUB_TOKEN" ]; then
    error "Token 不能为空"
    exit 1
fi

# Token 格式简单校验
if [[ ! "$GITHUB_TOKEN" =~ ^ghp_[a-zA-Z0-9]{36}$ ]]; then
    warn "Token 格式看起来不太对，标准格式是 ghp_ 开头 + 36 位字符"
    read -p "是否继续? (y/n): " CONTINUE
    if [ "$CONTINUE" != "y" ]; then
        exit 1
    fi
fi

# =====================================================
# 4. Git 全局配置
# =====================================================
echo ""
info "配置 Git 用户信息..."

read -p "📧 Git 邮箱 (默认: wofei46@gmail.com): " GIT_EMAIL
GIT_EMAIL=${GIT_EMAIL:-wofei46@gmail.com}

read -p "🧑 Git 用户名 (默认: testuser): " GIT_NAME
GIT_NAME=${GIT_NAME:-testuser}

git config user.email "$GIT_EMAIL"
git config user.name "$GIT_NAME"
success "Git 用户信息已配置"

# =====================================================
# 5. 初始化仓库并添加远程
# =====================================================
echo ""
info "初始化 Git 仓库..."

if [ ! -d ".git" ]; then
    git init
    git branch -m main
    success "已初始化 Git 仓库"
else
    success "Git 仓库已存在"
fi

# 设置远程仓库（使用 token 认证）
REMOTE_URL="https://${GITHUB_TOKEN}@github.com/${REPO}.git"

if git remote | grep -q origin; then
    git remote set-url origin "$REMOTE_URL"
    info "已更新远程仓库地址"
else
    git remote add origin "$REMOTE_URL"
    info "已添加远程仓库"
fi

# 显示（隐藏 token）
echo "远程仓库: https://***@github.com/${REPO}.git"

# =====================================================
# 6. 检查 .gitignore
# =====================================================
echo ""
info "检查 .gitignore..."

if [ ! -f ".gitignore" ]; then
    warn "缺少 .gitignore，正在创建..."
    cat > .gitignore << 'EOF'
node_modules/
dist/
*.log
.DS_Store
.env
data.db
uploads/*
!uploads/.gitkeep
EOF
    success "已创建 .gitignore"
else
    success ".gitignore 已存在"
fi

# =====================================================
# 7. 提交并推送
# =====================================================
echo ""
info "正在提交代码..."

git add -A
git commit -m "手机端上传: $(date '+%Y-%m-%d %H:%M')" || {
    warn "没有新的改动需要提交，或提交失败"
}

echo ""
info "正在推送到 GitHub..."
git push -u origin main

# =====================================================
# 8. 完成提示
# =====================================================
echo ""
success "代码已成功推送到 GitHub!"
heart "仓库地址: https://github.com/$REPO"
echo ""
echo "🚀 下一步：部署到 Render"
echo "   1. 打开 https://render.com/new"
echo "   2. 选择 'Web Service'"
echo "   3. 连接 GitHub，选择 $REPO_NAME"
echo "   4. 点击 'Create Web Service'"
echo ""
echo "⏱️ 等待 2-3 分钟构建"
echo "🎉 然后访问 https://couple-site.onrender.com"
echo ""

# 安全提醒
warn "安全提示：推送完成后，建议到 GitHub 删除本次使用的 Token，或在脚本执行后手动清理 git remote 中的 token"
echo "   清理命令: git remote set-url origin https://github.com/$REPO.git"
