#!/bin/bash

# ============================================
# 可孚AI数字人 - n8n 服务器一键部署脚本
# ============================================
# 使用方式：
# 1. 将此脚本上传到 Linux 服务器
# 2. chmod +x setup-n8n.sh
# 3. ./setup-n8n.sh
# ============================================

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

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

# 检查是否为 root 用户
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "请使用 sudo 运行此脚本"
        exit 1
    fi
}

# 更新系统
update_system() {
    log_info "更新系统包..."
    apt update && apt upgrade -y
}

# 安装 Node.js
install_nodejs() {
    log_info "安装 Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs

    # 验证
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    log_info "Node.js 版本: $NODE_VERSION"
    log_info "npm 版本: $NPM_VERSION"
}

# 安装 n8n
install_n8n() {
    log_info "安装 n8n..."
    npm install -g n8n

    # 验证
    N8N_VERSION=$(n8n --version)
    log_info "n8n 版本: $N8N_VERSION"
}

# 安装 ffmpeg
install_ffmpeg() {
    log_info "安装 ffmpeg..."
    apt install -y ffmpeg

    # 验证
    FFMPEG_VERSION=$(ffmpeg -version | head -n 1)
    log_info "ffmpeg 版本: $FFMPEG_VERSION"
}

# 配置 n8n
configure_n8n() {
    log_info "配置 n8n..."

    # 创建配置目录
    mkdir -p ~/.n8n

    # 创建配置文件
    cat > ~/.n8n/config << 'EOF'
{
  "executionTimeout": 600,
  "timeouts": {
    "execution": 600000
  },
  "endpoints": {
    "rest": "rest",
    "webhook": "webhook",
    "webhookTest": "webhook-test",
    "webhookWaiting": "webhook-waiting"
  }
}
EOF

    log_info "n8n 配置已创建"
}

# 创建 systemd 服务
create_service() {
    log_info "创建 n8n systemd 服务..."

    # 获取当前用户名
    USERNAME=$(whoami)
    USER_HOME=$(getent passwd "$USERNAME" | cut -d: -f6)

    cat > /etc/systemd/system/n8n.service << EOF
[Unit]
Description=n8n workflow automation
After=network.target

[Service]
Type=simple
User=$USERNAME
WorkingDirectory=$USER_HOME
ExecStart=/usr/bin/n8n start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    # 重新加载 systemd
    systemctl daemon-reload

    log_info "systemd 服务已创建"
}

# 安装 Nginx
install_nginx() {
    log_info "安装 Nginx..."
    apt install -y nginx

    # 启动 Nginx
    systemctl enable nginx
    systemctl start nginx

    log_info "Nginx 已安装并启动"
}

# 配置防火墙
configure_firewall() {
    log_info "配置防火墙..."

    # 安装 ufw
    apt install -y ufw

    # 配置规则
    ufw allow ssh
    ufw allow http
    ufw allow https

    # 启用防火墙
    echo "y" | ufw enable

    log_info "防火墙已配置"
}

# 显示完成信息
show_completion() {
    echo ""
    echo "========================================"
    echo -e "${GREEN}✅ n8n 安装完成！${NC}"
    echo "========================================"
    echo ""
    echo "常用命令："
    echo "  启动 n8n:     sudo systemctl start n8n"
    echo "  停止 n8n:     sudo systemctl stop n8n"
    echo "  重启 n8n:     sudo systemctl restart n8n"
    echo "  查看状态:     sudo systemctl status n8n"
    echo "  查看日志:     sudo journalctl -u n8n -f"
    echo ""
    echo "下一步操作："
    echo "  1. 配置 Nginx 反向代理（参考 DEPLOYMENT_GUIDE.md）"
    echo "  2. 配置 SSL 证书"
    echo "  3. 在 n8n 中创建数字人视频生成工作流"
    echo ""
}

# 主函数
main() {
    log_info "开始安装 n8n 服务器环境..."
    echo ""

    check_root
    update_system
    install_nodejs
    install_n8n
    install_ffmpeg
    configure_n8n
    create_service
    install_nginx
    configure_firewall

    show_completion
}

# 执行主函数
main
