# Vibe Coding 使用指南

## 🚀 快速开始

### 方式一：直接导入
1. 访问 Vibe Coding 平台
2. 导入 GitHub 仓库：`https://github.com/zhangyuge23/kefu-ai`
3. 自动识别 Next.js 项目

### 方式二：手动导入
1. 复制项目文件到 Vibe Coding
2. 安装依赖：`npm install`
3. 创建 `.env.local` 文件（参考 `.env.local.example`）
4. 启动开发服务器：`npm run dev`

## 📁 项目结构

```
kefu-ai/
├── src/
│   ├── app/                    # Next.js 页面
│   │   ├── (auth)/            # 认证相关页面
│   │   │   ├── login/        # 登录页
│   │   │   └── callback/      # 回调页
│   │   ├── (dashboard)/       # 仪表盘页面
│   │   │   ├── dashboard/    # 任务列表
│   │   │   ├── recharge/     # 充值页
│   │   │   └── settings/     # 设置页
│   │   ├── admin/            # 管理后台 ⭐
│   │   │   ├── cdkey/       # CDKey管理
│   │   │   ├── users/       # 用户管理
│   │   │   └── tasks/        # 任务管理
│   │   └── api/              # API接口
│   ├── components/            # React 组件
│   │   ├── layout/          # 布局组件
│   │   ├── pay/             # 支付组件
│   │   └── task/             # 任务组件
│   ├── hooks/                # React Hooks
│   │   └── useCredits.ts    # 算力Hook
│   ├── lib/                  # 工具库
│   │   └── supabase/         # Supabase配置
│   └── middleware.ts          # 中间件
├── scripts/                   # 脚本
└── styles/                   # 全局样式
```

## 🎨 设计系统

### 颜色主题
- **主色**: `brand-600` (#4f46e5 - 品牌蓝)
- **成功**: `emerald-600` (#059669)
- **警告**: `amber-500` (#f59e0b)
- **错误**: `red-600` (#dc2626)
- **背景**: `slate-50` (#f8fafc)

### 组件类名
- 卡片: `.card`
- 按钮: `.btn-primary`, `.btn-secondary`
- 输入框: `.input`
- 徽章: `.badge`

### Tailwind CSS 类名参考
- `text-brand-600` - 品牌文字颜色
- `bg-brand-50` - 品牌背景色
- `hover:bg-brand-700` - 悬停效果
- `rounded-lg` - 圆角
- `shadow-sm` - 阴影
- `transition-colors` - 过渡动画

## 📝 设计建议

### 页面设计规范
1. **保持一致性**：使用项目现有的颜色和间距
2. **移动优先**：考虑响应式设计
3. **组件化**：提取可复用的组件
4. **动画适度**：使用 `transition-colors` 等过渡效果

### 优化方向
1. **登录页**：更现代的视觉效果
2. **任务列表**：更好的卡片设计
3. **充值页**：更清晰的兑换流程
4. **管理后台**：更专业的统计图表

### 参考风格
- 现代 SaaS 产品风格
- 类似 Linear、Vercel 的设计语言
- 简洁、专业、易用

## 🔧 技术栈

- **框架**: Next.js 14 (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **状态管理**: React Hooks + Zustand
- **数据库**: Supabase
- **认证**: Supabase Auth
- **样式**: Tailwind CSS

## 📦 环境变量

在 Vibe Coding 中创建 `.env.local` 文件：

```env
NEXT_PUBLIC_SUPABASE_URL=你的Supabase项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase Anon Key
SUPABASE_SERVICE_ROLE_KEY=你的Service Role Key
ZPAY_PID=你的商户ID
ZPAY_KEY=你的商户密钥
NEXT_PUBLIC_APP_URL=http://localhost:3000
AI_PROXY_URL=http://你的AI服务地址
AI_API_KEY=free
N8N_WEBHOOK_URL=你的n8n webhook地址
N8N_WEBHOOK_SECRET=你的webhook密钥
DASHSCOPE_API_KEY=你的阿里云API Key
WUYIN_API_KEY=你的速创API Key
WUYIN_API_URL=https://api.suchuang.cn
```

## 🎯 设计资源

### 图标
使用 `lucide-react` 图标库：
```tsx
import { User, Settings, CreditCard, LogOut } from 'lucide-react';
```

### 颜色渐变参考
```css
/* 品牌渐变 */
bg-gradient-to-r from-brand-600 to-brand-800

/* 成功渐变 */
bg-gradient-to-r from-emerald-500 to-teal-600
```

### 布局间距
- 页面内边距: `p-8` (32px)
- 卡片内边距: `p-6` (24px)
- 元素间距: `gap-4` (16px)
- 按钮内边距: `px-4 py-2`

## 💡 常用命令

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产版本
npm run build

# 代码检查
npm run lint

# 类型检查
npm run typecheck
```

## 🎉 完成设计后

设计完成后，可以：
1. 复制修改的文件回来
2. 或者直接在 GitHub 上提 PR
3. 我会帮你合并到主项目并部署

---

**有问题随时问我！一起打造漂亮的界面！** ✨
