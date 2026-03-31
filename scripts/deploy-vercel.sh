#!/bin/bash

# ============================================
# 可孚AI数字人 - Vercel 部署脚本
# ============================================
# 使用方式：
# 1. 在本地项目目录运行此脚本
# 2. 确保已安装 Vercel CLI: npm i -g vercel
# 3. vercel login
# ============================================

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查环境
check_environment() {
    log_info "检查部署环境..."

    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装"
        exit 1
    fi

    NODE_VERSION=$(node --version)
    log_info "Node.js 版本: $NODE_VERSION"

    # 检查 npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装"
        exit 1
    fi

    NPM_VERSION=$(npm --version)
    log_info "npm 版本: $NPM_VERSION"

    # 检查 .env.local
    if [ ! -f ".env.local" ]; then
        log_warn ".env.local 文件不存在，尝试从 .env.local.example 创建..."
        if [ -f ".env.local.example" ]; then
            cp .env.local.example .env.local
            log_warn "请编辑 .env.local 填写正确的配置"
        else
            log_error ".env.local.example 也不存在"
            exit 1
        fi
    fi

    # 检查 Git
    if ! command -v git &> /dev/null; then
        log_error "Git 未安装"
        exit 1
    fi

    # 检查 Git 仓库
    if [ ! -d ".git" ]; then
        log_info "初始化 Git 仓库..."
        git init
        git add .
        git commit -m "Initial commit: kefu-ai digital human platform"
        log_warn "请先创建 GitHub 仓库，然后运行："
        echo "  git remote add origin https://github.com/your-username/kefu-ai.git"
        echo "  git push -u origin main"
        exit 1
    fi
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    npm install
}

# 构建项目
build_project() {
    log_info "构建项目..."
    npm run build
}

# 部署到 Vercel
deploy_to_vercel() {
    log_info "部署到 Vercel..."

    # 检查 Vercel CLI
    if ! command -v vercel &> /dev/null; then
        log_info "安装 Vercel CLI..."
        npm install -g vercel
    fi

    # 登录检查
    if ! vercel whoami &> /dev/null; then
        log_info "请登录 Vercel..."
        vercel login
    fi

    # 部署
    vercel --prod
}

# 显示完成信息
show_completion() {
    echo ""
    echo "========================================"
    echo -e "${GREEN}✅ Vercel 部署完成！${NC}"
    echo "========================================"
    echo ""
    echo "后续步骤："
    echo "  1. 在 Vercel Dashboard 中配置自定义域名"
    echo "  2. 在 Vercel 中添加环境变量（如果需要）"
    echo "  3. 测试应用功能"
    echo ""
}

# 主函数
main() {
    log_info "开始 Vercel 部署..."
    echo ""

    check_environment
    install_dependencies
    build_project
    deploy_to_vercel

    show_completion
}

# 执行主函数
main
