# 可孚AI数字人 v2.1

AI驱动的数字人视频生成平台。

## 技术栈

- **前端**: Next.js 14 + TypeScript + TailwindCSS
- **数据库/Auth/存储**: Supabase
- **AI编排**: n8n (Webhook 触发)
- **支付**: ZPAY (微信/支付宝)
- **部署**: Vercel

## 部署步骤

### 1. Supabase 配置

1. 在 [supabase.com](https://supabase.com) 创建项目
2. 进入 SQL Editor，运行 `supabase-schema.sql`（见架构文档）
3. 进入 Storage，创建三个 Bucket: `source-videos`、`processed`、`results`（全部 Private）
4. 进入 Authentication → Settings，开启 Email 登录
5. 记录 Project URL、anon key、service_role key

### 2. ZPAY 配置

1. 在 [z-pay.cn](https://z-pay.cn) 注册并开通支付渠道
2. 获取 PID 和 KEY

### 3. 环境变量

复制 `.env.local.example` 为 `.env.local`，填入所有配置：

```bash
cp .env.local.example .env.local
```

### 4. 本地开发

```bash
npm install
npm run dev
```

访问 http://localhost:3000

### 5. Vercel 部署

1. Push 代码到 GitHub
2. 在 Vercel 导入项目
3. 在 Vercel Dashboard → Settings → Environment Variables 中添加所有环境变量
4. 部署

### 6. n8n 工作流

参考架构文档第五章搭建 n8n 工作流。
n8n Webhook 地址配置到 `.env.local` 的 `N8N_WEBHOOK_URL` 中。

## 项目结构

```
src/
├── app/              # 页面和 API 路由
├── components/       # UI 组件
├── hooks/            # React Hooks (Auth, Tasks, Credits)
├── lib/              # 工具函数 (Supabase, ZPAY, n8n, AI)
└── types/            # TypeScript 类型定义
```
