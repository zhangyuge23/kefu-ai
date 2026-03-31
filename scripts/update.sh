#!/bin/bash

# ============================================
# 可孚AI数字人 - 一键更新脚本
# ============================================
# 使用方式：
# 1. 上传到服务器 /var/www/kefu-ai/scripts/update.sh
# 2. chmod +x update.sh
# 3. ./update.sh
# ============================================

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 项目目录
PROJECT_DIR="/var/www/kefu-ai"

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

main() {
    log_info "开始更新 kefu-ai..."
    echo ""

    # 切换到项目目录
    cd $PROJECT_DIR

    # 拉取最新代码
    log_info "拉取 GitHub 最新代码..."
    git pull origin main

    # 安装依赖
    log_info "安装依赖..."
    npm install

    # 构建项目
    log_info "构建项目..."
    npm run build

    # 重启 PM2
    log_info "重启应用..."
    pm2 restart kefu-ai

    echo ""
    echo "========================================"
    log_info "更新完成！"
    echo "========================================"
    echo ""
    pm2 status kefu-ai
}

main
