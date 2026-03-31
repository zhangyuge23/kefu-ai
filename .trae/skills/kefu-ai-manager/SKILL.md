---
name: "kefu-ai-manager"
description: "Manage kefu-ai digital human platform including server deployment, code updates, CDKey generation, and database operations. Invoke when user asks to update server, manage project, or perform server operations."
---

# 可孚AI数字人平台 - 项目管理技能

## 项目信息

### 基本信息
- **项目名称**: 可孚AI数字人平台 v2.1
- **技术栈**: Next.js 14 + Supabase + Tailwind CSS + TypeScript
- **GitHub**: https://github.com/zhangyuge23/kefu-ai
- **部署域名**: https://aihub888.xyz

### 服务器信息
- **IP**: 43.165.175.54
- **SSH用户**: ubuntu
- **SSH密码**: Zhangjin123.
- **SSH端口**: 22
- **项目路径**: /var/www/kefu-ai
- **应用端口**: 3000

### 数据库配置
- **Supabase URL**: https://bjrtvbnkllhlmimqgdtl.supabase.co
- **Supabase Anon Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
- **Supabase Service Role Key**: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

## 核心功能模块

### 1. 用户认证系统
- 基于 Supabase Auth
- 登录/注册页面: `/src/app/(auth)/login/page.tsx`
- 认证中间件: `/src/middleware.ts`
- 用户信息表: `profiles`

### 2. 算力充值系统（CDKey兑换）
- 充值页面: `/src/app/(dashboard)/recharge/page.tsx`
- CDKey组件: `/src/components/CDKeyRedeem.tsx`
- CDKey API: `/src/app/api/cdkey/redeem/route.ts`
- CDKey表: `cdkeys`
- 相关文件:
  - `/src/hooks/useCredits.ts` - 算力Hook
  - `/src/components/pay/RechargePanel.tsx` - 充值面板（已禁用）

### 3. 任务管理系统
- 任务列表: `/src/app/(dashboard)/dashboard/page.tsx`
- 任务API: `/src/app/api/task/route.ts`
- 任务表: `tasks`
- 状态枚举: pending, uploading, extracting, cloning, synthesizing, generating, completed, failed

### 4. AI处理流程（n8n集成）
- n8n Webhook URL: http://43.165.175.54:5678/webhook/video-generate
- AI代理服务: http://43.165.175.54:8317
- 相关文件: `/src/lib/n8n.ts`

## 服务器操作

### 连接服务器
```bash
sshpass -p 'Zhangjin123.' ssh -o StrictHostKeyChecking=no -p 22 ubuntu@43.165.175.54 '<command>'
```

### 检查服务状态
```bash
pm2 status kefu-ai
pm2 logs kefu-ai --lines 20
sudo systemctl status nginx
curl -I https://aihub888.xyz
```

### 一键更新（推荐）
```bash
cd /var/www/kefu-ai && ./update.sh
```

### 手动更新
```bash
cd /var/www/kefu-ai
git pull origin main
npm install
npm run build
pm2 restart kefu-ai
```

### Nginx操作
```bash
# 查看配置
sudo cat /etc/nginx/sites-available/kefu-ai

# 重启Nginx
sudo systemctl restart nginx

# 测试配置
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log
```

### SSL证书
- 使用 Let's Encrypt (Certbot)
- 自动续期已配置
- 证书位置: /etc/letsencrypt/live/aihub888.xyz/

## 数据库操作

### Supabase Dashboard
1. 访问: https://supabase.com/dashboard
2. 选择项目: bjrtvbnkllhlmimqgdtl
3. 使用 SQL Editor 执行 SQL

### 生成CDKey（SQL脚本）
文件位置: `/scripts/generate-cdkey.sql`

```sql
-- 生成CDKey
INSERT INTO public.cdkeys (code, credits_amount, expires_at)
VALUES 
  ('KEFU2024TEST001', 100, NOW() + INTERVAL '1 year'),
  ('KEFU2024VIP500', 500, NOW() + INTERVAL '1 year'),
  ('KEFU2024GIFT1000', 1000, NOW() + INTERVAL '1 year')
ON CONFLICT (code) DO NOTHING;

-- 查看CDKey
SELECT code, credits_amount, expires_at, 
       CASE WHEN redeemed_by IS NOT NULL THEN '已使用' ELSE '未使用' END as status
FROM public.cdkeys ORDER BY created_at DESC LIMIT 10;
```

### 数据库表结构

#### profiles（用户表）
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  nickname TEXT,
  avatar_url TEXT,
  phone TEXT UNIQUE,
  credits INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### cdkeys（兑换码表）
```sql
CREATE TABLE public.cdkeys (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  credits_amount INT NOT NULL,
  redeemed_by UUID REFERENCES public.profiles(id),
  redeemed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### tasks（任务表）
```sql
CREATE TYPE task_status AS ENUM (
  'pending', 'uploading', 'extracting', 'cloning',
  'synthesizing', 'generating', 'completed', 'failed'
);

CREATE TABLE public.tasks (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  name TEXT NOT NULL,
  status task_status DEFAULT 'pending',
  source_video_url TEXT,
  source_video_duration FLOAT,
  source_video_thumbnail TEXT,
  script_text TEXT NOT NULL,
  extracted_audio_url TEXT,
  cloned_voice_id TEXT,
  synthesized_audio_url TEXT,
  result_video_url TEXT,
  credits_cost INT DEFAULT 0,
  error_message TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
```

## 本地开发

### 启动开发服务器
```bash
cd /Users/zhangyuge/Projects/files/kefu-ai
npm install
npm run dev
```
访问: http://localhost:3000

### 环境变量配置
文件: `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=https://bjrtvbnkllhlmimqgdtl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ZPAY_PID=2026033111300789
ZPAY_KEY=eXUy55EAOCmHR3ZGrwAiKwPJXRBwZFpo
NEXT_PUBLIC_APP_URL=http://localhost:3000
AI_PROXY_URL=http://43.165.175.54:8317
AI_API_KEY=free
N8N_WEBHOOK_URL=http://43.165.175.54:5678/webhook/video-generate
N8N_WEBHOOK_SECRET=kefu-ai-webhook-secret-2024
DASHSCOPE_API_KEY=sk-your-api-key
WUYIN_API_KEY=your-wuyin-api-key
WUYIN_API_URL=https://api.suchuang.cn
```

### Git操作
```bash
# 提交代码
git add .
git commit -m "描述你的修改"
git push origin main

# 服务器自动更新（可选）
sshpass -p 'Zhangjin123.' ssh ubuntu@43.165.175.54 'cd /var/www/kefu-ai && ./update.sh'
```

## 常用开发命令

### 构建和测试
```bash
npm run build    # 构建生产版本
npm run lint     # 代码检查
npm run dev      # 开发模式
```

### PM2管理
```bash
pm2 status                    # 查看状态
pm2 logs kefu-ai --lines 50  # 查看日志
pm2 restart kefu-ai            # 重启
pm2 stop kefu-ai              # 停止
pm2 delete kefu-ai             # 删除
```

## 项目结构
```
kefu-ai/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/         # 认证页面
│   │   │   ├── login/     # 登录页
│   │   │   └── callback/   # 回调页
│   │   ├── (dashboard)/    # 仪表盘页面
│   │   │   ├── dashboard/ # 任务列表
│   │   │   ├── recharge/  # 充值页面
│   │   │   └── settings/  # 设置页面
│   │   ├── api/           # API接口
│   │   │   ├── ai/        # AI相关
│   │   │   ├── cdkey/     # CDKey兑换
│   │   │   ├── pay/       # 支付相关
│   │   │   └── task/      # 任务相关
│   │   └── page.tsx       # 首页
│   ├── components/         # React组件
│   │   ├── layout/        # 布局组件
│   │   ├── pay/           # 支付组件
│   │   └── task/          # 任务组件
│   ├── hooks/              # React Hooks
│   ├── lib/               # 工具库
│   │   └── supabase/      # Supabase配置
│   ├── types/             # TypeScript类型
│   └── middleware.ts       # 中间件
├── scripts/
│   ├── deploy-vercel.sh   # Vercel部署脚本
│   ├── setup-n8n.sh       # n8n配置脚本
│   ├── update.sh          # 一键更新脚本
│   └── generate-cdkey.sql  # CDKey生成脚本
└── supabase-schema.sql    # 数据库建表脚本
```

## 故障排查

### 服务器无响应
1. 检查PM2状态: `pm2 status`
2. 检查Nginx: `sudo systemctl status nginx`
3. 检查端口: `curl http://localhost:3000`
4. 查看日志: `pm2 logs kefu-ai --err --lines 50`

### 数据库连接失败
1. 检查环境变量中的 Supabase URL 和 Key
2. 验证 Supabase 项目状态
3. 检查 RLS 策略配置

### n8n webhook 无法触发
1. 确认 n8n 服务运行: `pm2 status`
2. 验证 Webhook URL 可访问
3. 检查 Webhook Secret 配置
4. 查看 n8n 工作流日志

### SSL证书问题
1. 检查证书: `sudo certbot certificates`
2. 续期证书: `sudo certbot renew --dry-run`
3. 查看Nginx配置中的证书路径

## 安全注意事项

### 敏感信息保护
- `.env.local` 已加入 `.gitignore`，不会推送到GitHub
- 服务器上确保 `.env.local` 文件权限正确
- 不要将 Service Role Key 暴露给前端

### 权限管理
- 使用 PM2 管理进程，不要直接用 root 运行
- 数据库操作通过 Supabase Dashboard 或安全的 API
- 定期更新依赖包版本

## 监控和维护

### 日志查看
```bash
# PM2日志
pm2 logs kefu-ai --out --lines 100
pm2 logs kefu-ai --err --lines 50

# Nginx日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 系统监控
```bash
# CPU和内存
htop

# 磁盘使用
df -h

# 内存使用
free -h
```

## 更新日志

### v2.1 (2026-03-31)
- 移除了在线支付，改用CDKey兑换
- 修复了 useCredits 实时订阅错误
- 优化了充值页面UI
- 添加了一键更新脚本
- 部署到自有服务器

### 已知问题
- 暂无

## 联系方式
如有问题，请联系技术支持。
