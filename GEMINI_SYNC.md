# Gemini 同步文档 - 可孚AI数字人平台

## 第一步：项目目录结构

```
kefu-ai/
├── src/
│   ├── app/
│   │   ├── (auth)/                    # 认证模块
│   │   │   ├── login/page.tsx       # 登录页
│   │   │   └── callback/route.ts    # OAuth回调
│   │   ├── (dashboard)/              # 用户仪表盘
│   │   │   ├── dashboard/page.tsx  # 任务列表主页
│   │   │   ├── recharge/page.tsx   # 算力充值页
│   │   │   ├── settings/page.tsx    # 设置页
│   │   │   └── layout.tsx          # 仪表盘布局
│   │   ├── admin/                    # 管理后台 ⭐
│   │   │   ├── page.tsx            # 数据概览
│   │   │   ├── cdkey/page.tsx      # CDKey管理
│   │   │   ├── users/page.tsx      # 用户管理
│   │   │   └── tasks/page.tsx      # 任务管理
│   │   ├── api/                      # API接口
│   │   │   ├── task/               # 任务API
│   │   │   ├── cdkey/redeem/       # CDKey兑换API
│   │   │   ├── pay/                # 支付API
│   │   │   └── ai/chat/           # AI对话API
│   │   ├── layout.tsx             # 根布局
│   │   └── page.tsx               # 首页（重定向到dashboard）
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TopBar.tsx         # 顶部导航栏
│   │   │   └── Sidebar.tsx        # 侧边栏
│   │   ├── task/
│   │   │   ├── TaskCard.tsx       # 任务卡片
│   │   │   ├── TaskList.tsx       # 任务列表
│   │   │   ├── TaskEditModal.tsx  # 任务编辑弹窗
│   │   │   └── VideoUploader.tsx   # 视频上传组件
│   │   ├── pay/
│   │   │   └── RechargePanel.tsx   # 充值面板（已禁用）
│   │   └── CDKeyRedeem.tsx        # CDKey兑换组件
│   ├── hooks/
│   │   ├── useAuth.ts            # 认证Hook
│   │   ├── useCredits.ts         # 算力Hook
│   │   └── useTasks.ts           # 任务Hook
│   ├── lib/
│   │   ├── supabase/             # Supabase配置
│   │   │   ├── client.ts        # 浏览器客户端
│   │   │   ├── server.ts       # 服务端客户端
│   │   │   └── admin.ts        # 管理端客户端
│   │   ├── n8n.ts               # n8n webhook集成
│   │   ├── ai-proxy.ts         # AI代理配置
│   │   ├── zpay.ts             # 支付配置
│   │   └── credits.ts          # 算力工具函数
│   ├── types/
│   │   └── index.ts            # TypeScript类型定义
│   └── middleware.ts          # 路由中间件
├── scripts/                     # 管理脚本
│   ├── admin-queries.sql      # 管理SQL查询
│   ├── generate-cdkey.sql     # CDKey生成脚本
│   ├── add-admin-field.sql     # 添加管理员字段
│   └── update.sh              # 一键更新脚本
├── public/                     # 静态资源
├── package.json               # 项目依赖
├── tailwind.config.ts         # Tailwind配置 ⭐
├── tsconfig.json             # TypeScript配置
└── next.config.js            # Next.js配置
```

## 第二步：核心配置文件

### package.json
```json
{
  "name": "kefu-ai-digital-human",
  "version": "2.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.47.0",
    "next": "14.2.15",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "lucide-react": "^0.460.0"
  },
  "devDependencies": {
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.14",
    "typescript": "^5.6.0"
  }
}
```

### tailwind.config.ts - 品牌设计系统 ⭐
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef7ff',
          100: '#d9edff',
          200: '#bce0ff',
          300: '#8ecdff',
          400: '#59b0ff',
          500: '#338dff',
          600: '#1a6ef5',
          700: '#1358e1',
          800: '#1647b6',
          900: '#183f8f',
          950: '#142857',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', '"Noto Sans SC"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
```

### 全局样式类名约定
```css
/* 卡片 */
.card { @apply bg-white rounded-lg shadow-sm; }

/* 按钮 */
.btn-primary { @apply px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors; }

/* 输入框 */
.input { @apply w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500; }
```

## 第三步：设计目标

### 项目概述
可孚AI数字人平台 v2.1 - 一个基于 AI 的数字人视频生成平台

### 核心功能
1. **用户认证** - 邮箱登录/注册（Supabase Auth）
2. **算力系统** - CDKey兑换码充值（无在线支付）
3. **任务管理** - 创建、管理视频生成任务
4. **AI集成** - n8n 工作流 + AI代理服务
5. **管理后台** - CDKey管理、用户管理、任务管理

### 当前UI状态
- 使用 Tailwind CSS 框架
- 品牌色：品牌蓝 (brand-600)
- 简洁实用的设计风格
- 已有基本响应式布局

### 设计目标（请根据这个优化）

#### 1. 登录页 (src/app/(auth)/login/page.tsx)
- 当前：简单的居中表单
- 目标：更有科技感、现代感
- 建议：渐变背景、3D效果、动态元素

#### 2. 仪表盘/任务列表 (src/app/(dashboard)/dashboard/page.tsx)
- 当前：基础的卡片列表
- 目标：更专业的 SaaS 风格
- 建议：更好的数据可视化、状态展示、进度条

#### 3. 充值页 (src/app/(dashboard)/recharge/page.tsx)
- 当前：简单的CDKey兑换
- 目标：清晰的兑换流程、吸引人的UI
- 建议：更好的视觉层次、成功/失败的动画反馈

#### 4. 管理后台概览 (src/app/admin/page.tsx)
- 当前：基础的统计卡片
- 目标：专业的数据仪表盘
- 建议：图表、趋势图、更好的数据展示

### 技术约束
- **必须使用** Tailwind CSS
- **必须使用** 品牌色系 (brand-*)
- **必须使用** lucide-react 图标库
- **保持** 响应式设计
- **保持** 现有的组件结构

### 设计原则
- 现代 SaaS 产品风格
- 类似 Linear、Vercel 的设计语言
- 简洁、专业、易用
- 适当的动画和过渡效果
- 良好的用户体验

## 协作工作流

1. **你（Gemini）**：根据此文档进行 UI 优化设计
2. **我（Claude）**：接收你的设计方案，更新代码并部署
3. **用户**：测试并提供反馈

## 需要你优化的页面

按优先级排序：

1. **首页/登录页** - src/app/(auth)/login/page.tsx
2. **仪表盘任务列表** - src/app/(dashboard)/dashboard/page.tsx
3. **充值页面** - src/app/(dashboard)/recharge/page.tsx
4. **管理后台概览** - src/app/admin/page.tsx

---

**请开始你的设计工作！** 🎨

我会在你完成设计后，帮你更新代码并部署到服务器：https://aihub888.xyz
