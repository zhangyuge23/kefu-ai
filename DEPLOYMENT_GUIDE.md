# 可孚AI数字人 v2.1 - 完整部署指南

> **版本**: v2.1  
> **更新**: 2026-03-31

---

## 目录

1. [快速开始](#快速开始)
2. [Supabase 配置](#supabase-配置)
3. [n8n 部署](#n8n-部署)
4. [环境变量配置](#环境变量配置)
5. [Vercel 部署](#vercel-部署)
6. [n8n 工作流搭建](#n8n-工作流搭建)
7. [验证部署](#验证部署)

---

## 快速开始

### 1.1 一句话总结架构

> **Next.js 做前端 + Supabase 管数据 + n8n 做AI处理 + ZPAY 收钱 + Vercel 部署前端**

### 1.2 需要准备的服务

| 服务 | 用途 | 注册地址 |
|------|------|---------|
| Supabase | 数据库、Auth、存储 | https://supabase.com |
| ZPAY | 微信/支付宝支付 | https://z-pay.cn |
| 阿里云百炼 | 语音合成和音色克隆 | https://bailian.console.aliyun.com |
| 速创API | 视频生成 | https://www.suchuang.cn |

### 1.3 服务器要求

- **n8n 服务器**: Linux (Ubuntu 20.04+), 2GB+ RAM, 20GB+ 磁盘
- **软件要求**: Node.js 18+, ffmpeg

---

## Supabase 配置

### 2.1 创建项目

1. 访问 https://supabase.com 并登录
2. 点击 "New Project" 创建新项目
3. 填写项目信息：
   - **Name**: `kefu-ai` 或你喜欢的名字
   - **Database Password**: 记住这个密码
   - **Region**: 选择靠近你的区域
4. 等待项目创建完成（约2分钟）

### 2.2 运行数据库脚本

1. 在 Supabase Dashboard 左侧菜单点击 **SQL Editor**
2. 点击 **New Query**
3. 复制 `supabase-schema.sql` 文件的全部内容
4. 粘贴到 SQL Editor 中
5. 点击 **Run** 执行脚本

### 2.3 创建 Storage Buckets

1. 在左侧菜单点击 **Storage**
2. 点击 **New Bucket** 创建三个 Bucket：

| Bucket Name | Public | Purpose |
|------------|--------|---------|
| `source-videos` | ❌ Private | 用户上传的原始视频 |
| `processed` | ❌ Private | 中间产物（音频等） |
| `results` | ❌ Private | 最终生成的视频 |

3. 为每个 Bucket 创建 Storage Policy：

```sql
-- source-videos Policy
CREATE POLICY "source-videos-upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'source-videos');

CREATE POLICY "source-videos-read" ON storage.objects
  FOR SELECT USING (bucket_id = 'source-videos');

-- processed Policy
CREATE POLICY "processed-upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'processed');

CREATE POLICY "processed-read" ON storage.objects
  FOR SELECT USING (bucket_id = 'processed');

-- results Policy
CREATE POLICY "results-upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'results');

CREATE POLICY "results-read" ON storage.objects
  FOR SELECT USING (bucket_id = 'results');
```

### 2.4 配置 Auth

1. 在左侧菜单点击 **Authentication**
2. 点击 **Settings**
3. 找到 **Email** 部分：
   - ✅ 启用 **Enable Email Signup**
   - 禁用 Enable Confirm email（方便测试）
4. 保存设置

### 2.5 获取 API Keys

1. 在左侧菜单点击 **Project Settings**
2. 点击 **API**
3. 复制以下信息到 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ **重要**: `SUPABASE_SERVICE_ROLE_KEY` 是敏感信息，只用于服务端，绝不要暴露给前端！

---

## n8n 部署

### 3.1 在服务器上安装 n8n

SSH 到你的 Linux 服务器，执行以下命令：

```bash
# 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证 Node.js
node --version  # 应该显示 v18.x.x

# 使用 npm 全局安装 n8n
npm install -g n8n

# 验证 n8n
n8n --version
```

### 3.2 安装 ffmpeg（音频处理必需）

```bash
sudo apt update
sudo apt install -y ffmpeg

# 验证
ffmpeg -version
```

### 3.3 配置 n8n

创建 n8n 配置文件：

```bash
mkdir -p ~/.n8n
nano ~/.n8n/config
```

添加以下配置：

```json
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
```

### 3.4 启动 n8n

**开发模式（前台运行）**:
```bash
n8n
```

**生产模式（后台运行）**:
```bash
# 创建 systemd 服务
sudo nano /etc/systemd/system/n8n.service
```

```ini
[Unit]
Description=n8n workflow automation
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username
ExecStart=/usr/bin/n8n start
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# 启动服务
sudo systemctl daemon-reload
sudo systemctl enable n8n
sudo systemctl start n8n

# 检查状态
sudo systemctl status n8n
```

### 3.5 配置反向代理（Nginx）

```bash
sudo apt install -y nginx

sudo nano /etc/nginx/sites-available/n8n
```

```nginx
server {
    listen 80;
    server_name n8n.your-domain.com;

    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:5678;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 600;
        proxy_connect_timeout 600;
        proxy_send_timeout 600;
    }
}
```

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/n8n /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 安装 SSL 证书（使用 Let's Encrypt）
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d n8n.your-domain.com
```

### 3.6 访问 n8n

1. 访问 `https://n8n.your-domain.com`
2. 首次访问会要求设置管理员账号
3. 设置完成后登录

---

## 环境变量配置

### 4.1 填写 .env.local

打开项目中的 `.env.local` 文件，填写以下配置：

```env
# Supabase（从2.5节获取）
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ZPAY 支付（从 z-pay.cn 获取）
ZPAY_PID=your-merchant-id
ZPAY_KEY=your-merchant-key
NEXT_PUBLIC_APP_URL=http://localhost:3000

# AI Proxy（可选，如果有自己的AI代理）
AI_PROXY_URL=http://43.165.175.54:8317
AI_API_KEY=free

# n8n（你的n8n服务器地址）
N8N_WEBHOOK_URL=https://n8n.your-domain.com/webhook/video-generate
N8N_WEBHOOK_SECRET=generate-a-random-secret-string

# 阿里云百炼（从阿里云百炼控制台获取）
DASHSCOPE_API_KEY=sk-xxx

# 速创API（从速创平台获取）
WUYIN_API_KEY=xxx
WUYIN_API_URL=https://api.suchuang.cn
```

### 4.2 生成 n8n Webhook Secret

```bash
# 在终端生成随机字符串
openssl rand -hex 32
```

将生成的字符串填入 `N8N_WEBHOOK_SECRET`

---

## Vercel 部署

### 5.1 推送到 GitHub

```bash
# 在项目根目录
cd kefu-ai

# 初始化 Git（如果还没有）
git init

# 添加所有文件
git add .

# 提交
git commit -m "Initial commit: kefu-ai digital human platform"

# 在 GitHub 创建新仓库，然后：
git remote add origin https://github.com/your-username/kefu-ai.git
git branch -M main
git push -u origin main
```

### 5.2 在 Vercel 部署

1. 访问 https://vercel.com 并登录
2. 点击 "Add New..." → "Project"
3. 导入刚创建的 GitHub 仓库
4. 在 **Environment Variables** 部分，添加 `.env.local` 中的所有变量
5. 点击 "Deploy"

### 5.3 配置域名（可选）

1. 在 Vercel 项目设置中点击 **Domains**
2. 添加你的域名
3. 按照提示配置 DNS 记录

---

## n8n 工作流搭建

### 6.1 创建 n8n Credentials

在 n8n 中创建以下凭证（Credentials）：

#### Supabase API
- **名称**: `Supabase API`
- **类型**: Header Auth
- **配置**:
  - Header Name: `apikey`
  - Header Value: `你的 SUPABASE_SERVICE_ROLE_KEY`

#### DashScope (阿里云百炼)
- **名称**: `DashScope`
- **类型**: Header Auth
- **配置**:
  - Header Name: `Authorization`
  - Header Value: `Bearer 你的 DASHSCOPE_API_KEY`

### 6.2 创建工作流

在 n8n 中创建新工作流：`digital-human-video-generate`

#### 节点1: Webhook（触发器）

| 配置项 | 值 |
|--------|-----|
| 节点类型 | Webhook |
| HTTP Method | POST |
| Path | `video-generate` |
| Authentication | Header Auth |
| Header Name | `X-Webhook-Secret` |
| Header Value | 和 `.env.local` 里的 `N8N_WEBHOOK_SECRET` 一致 |
| Response Mode | `Immediately` |

#### 节点2-15: 视频生成流程

详细节点配置请参考 [架构文档](./kefu-ai-v2.1-architecture.md#五n8n-工作流搭建指南) 的第五章。

### 6.3 测试工作流

1. 在 n8n 中打开工作流
2. 点击 "Test Workflow"
3. 使用 curl 测试：

```bash
curl -X POST https://n8n.your-domain.com/webhook/video-generate \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-secret" \
  -d '{
    "task_id": "test-task-id",
    "user_id": "test-user-id",
    "source_video_url": "https://example.com/test.mp4",
    "script_text": "测试文案",
    "supabase_url": "https://your-project.supabase.co",
    "supabase_key": "your-service-role-key"
  }'
```

---

## 验证部署

### 7.1 本地测试

```bash
cd kefu-ai
npm run dev
```

访问 http://localhost:3000

### 7.2 完整流程测试

1. **注册登录**: 使用邮箱注册一个新账号
2. **充值算力**: 测试 ZPAY 支付流程（沙箱环境）
3. **创建任务**: 上传视频 + 输入文案
4. **查看状态**: 观察任务状态变化
5. **下载结果**: 查看生成的视频

### 7.3 常见问题排查

#### 数据库连接失败
- 检查 `NEXT_PUBLIC_SUPABASE_URL` 是否正确
- 检查 `SUPABASE_SERVICE_ROLE_KEY` 是否正确

#### n8n Webhook 无法触发
- 检查 `N8N_WEBHOOK_URL` 是否可访问
- 检查 `N8N_WEBHOOK_SECRET` 是否匹配
- 检查 n8n 服务是否运行

#### 支付回调失败
- 检查 ZPAY 后台配置的回调地址
- 检查 `process_payment` RPC 函数是否创建成功

---

## 后续维护

### 更新代码

```bash
git pull origin main
npm install
npm run build
```

### 备份数据库

在 Supabase Dashboard → Database → Backups

### 监控 n8n

```bash
sudo systemctl status n8n
sudo journalctl -u n8n -f
```

---

**祝部署顺利！** 🚀
