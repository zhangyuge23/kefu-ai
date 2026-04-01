# AI 数字人视频合成 - 集成说明文档

> 基于 n8n 工作流 v2.2 和无音科技 API v1.1

## 📋 目录

1. [系统架构](#系统架构)
2. [API 配置](#api-配置)
3. [前端实现](#前端实现)
4. [工作流程](#工作流程)
5. [错误处理](#错误处理)
6. [测试指南](#测试指南)
7. [部署说明](#部署说明)

---

## 系统架构

### 整体架构图

```
┌─────────────┐
│   前端      │  (Next.js 14 + React)
│             │
│  ┌────────┐ │
│  │AIVideo│ │  视频上传 + 文案输入
│  │Generator│ │  FormData POST
│  └────────┘ │
└──────┬──────┘
       │
       │  POST multipart/form-data
       │  video (File) + text (String)
       │
       ↓
┌──────────────────────────┐
│   n8n Webhook            │
│  (create-digital-human)  │
│                          │
│  ┌────────────────────┐  │
│  │ 1. 解析前端数据     │  │
│  │ 2. 提取音频 (FFmpeg) │  │
│  │ 3. 克隆声音         │  │
│  │ 4. 语音合成         │  │
│  │ 5. 发起数字人任务   │  │
│  │ 6. 立刻返回 Task ID │  │
│  └────────────────────┘  │
└──────────┬───────────────┘
           │
           │  HTTP 202 + Task ID
           │
           ↓
┌──────────────┐     ┌─────────────────┐
│   前端       │ ←→  │   无音科技 API   │
│              │     │                 │
│  轮询查询     │     │  GET /async/detail
│  GET ?id=xxx │     │  Header: Auth   │
│              │     │                 │
│  10秒/次     │     └────────┬────────┘
└──────┬───────┘              │
        │                     │
        │  status:            │
        │  0=等待            │
        │  1=处理中          │
        │  2=成功(有视频链接) │
        │  3=失败            │
        │                    │
        ↓                    ↓
    【任务列表】        【数字人平台】
     状态更新           异步处理
```

### n8n 工作流步骤

```
Step 1: Webhook (create-digital-human)
    ↓
Step 2: Code - 解析前端数据
    ↓
Step 3: Extract Audio (FFmpeg)
    ↓
Step 4: Clone Voice (无音 API)
    ↓
Step 5: Synthesize Speech (无音 API)
    ↓
Step 6: Digital Human Task (无音 API)
    ↓
Step 7: Return Task ID (立刻响应)
```

---

## API 配置

### 全局常量配置

在 `src/hooks/useTasks.ts` 中定义：

```typescript
// n8n Webhook URL (POST - 发起任务)
const CREATE_API_URL = 'https://n8n.aihub888.xyz/webhook/create-digital-human';

// 无音科技 API Base URL (GET - 轮询状态)
const QUERY_API_BASE = 'https://api.wuyinkeji.com/api/async/detail?id=';

// 无音科技 API 密钥
const QUERY_API_KEY = '8cyx7Vanb0wEuIRBhBO55KgzGr';
```

---

## 前端实现

### 模块 A：发起合成任务

**文件**: `src/components/task/AIVideoGenerator.tsx`

**功能**:
- 视频文件上传（原生 `<input type="file">`）
- 文案输入（`<textarea>`）
- FormData 组装和提交
- Task ID 提取和保存
- 轮询状态直到完成

**核心代码**:

```typescript
async function submitDigitalHumanTask(videoFile: File, textContent: string) {
  // 1. 组装 FormData（不经过任何云存储）
  const formData = new FormData();
  formData.append('video', videoFile);
  formData.append('text', textContent);

  // 2. POST 到 n8n webhook
  const response = await fetch(CREATE_API_URL, {
    method: 'POST',
    body: formData,
  });

  // 3. 读取响应文本（必须用 text，不要用 json）
  const rawText = await response.text();

  // 4. 🚨 核心错误拦截
  if (!response.ok) {
    const lowerText = rawText.toLowerCase();

    // 识别特定错误
    if (
      lowerText.includes('synthesis failed') ||
      lowerText.includes('过短') ||
      lowerText.includes('not able to process')
    ) {
      throw new Error(
        '⚠️ 文案过短或原视频声音太短（需大于10秒），提取特征失败，请增加文案或换个视频重试！'
      );
    }

    throw new Error(`请求发起失败: ${rawText}`);
  }

  // 5. 解析 Task ID
  const parsedData = JSON.parse(rawText);
  const payload = Array.isArray(parsedData) ? parsedData[0] : parsedData;
  const taskId = payload.data?.id || payload.data?.task_id || payload.task_id || payload.id;

  if (!taskId) {
    throw new Error('接口未返回有效的 Task ID');
  }

  // 6. 保存到任务列表
  return taskId;
}
```

### 模块 B：任务列表轮询

**文件**: `src/hooks/useTasks.ts`

**功能**:
- 监控所有"处理中"的任务
- 每 10 秒轮询一次状态
- 自动更新任务状态和视频链接
- 页面卸载时停止轮询

**核心代码**:

```typescript
// 在 useTasks hook 中添加

const pollTaskStatus = async (taskId: string) => {
  const url = `${QUERY_API_BASE}${encodeURIComponent(taskId)}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': QUERY_API_KEY,
    },
  });

  const data = await response.json();

  if (data.code !== 200) {
    throw new Error(`查询异常: ${data.msg}`);
  }

  const status = data.data?.status;

  // status: 0=等待, 1=处理中, 2=成功, 3=失败
  if (status === 2 || status === '2') {
    // 🌟 成功：提取视频地址
    let videoUrl = data.data?.video_url || data.data?.url;
    if (!videoUrl && Array.isArray(data.data?.result)) {
      videoUrl = data.data.result[0];
    }

    return { status: 'success', videoUrl };
  } else if (status === 3 || status === '3') {
    // ❌ 失败
    return { status: 'error', errorMessage: data.data?.message };
  }

  // ⏳ 继续处理中
  return { status: 'processing' };
};

// 开始轮询
useEffect(() => {
  startPolling();
  return () => stopPolling();
}, [startPolling, stopPolling]);
```

---

## 工作流程

### 完整用户流程

```
1. 用户进入仪表盘
   ↓
2. 点击"新建生成任务"
   ↓
3. 弹窗 AIVideoGenerator 组件
   ├─ 上传视频文件（限制 mp4/mov/webm，最大 50MB）
   ├─ 输入文案（至少 10 个字符）
   └─ 点击"生成"
   ↓
4. 提交到 n8n Webhook
   ├─ POST multipart/form-data
   ├─ video: File 对象
   └─ text: String
   ↓
5. n8n 返回 Task ID（202 Accepted）
   ├─ 保存到数据库（status: 'processing'）
   ├─ 显示"任务已创建"提示
   └─ 关闭弹窗
   ↓
6. 返回任务列表
   ├─ 自动开始轮询（每 10 秒）
   ├─ 状态: 处理中 → 克隆声音 → 合成中 → ...
   └─ UI: 显示 Loading 动画 + 状态文字
   ↓
7. 无音科技处理完成
   ├─ status = 2 (成功)
   └─ videoUrl = "https://..."
   ↓
8. 轮询检测到成功
   ├─ 更新数据库（status: 'completed'）
   ├─ 显示"下载视频"按钮
   └─ 发送浏览器通知（可选）
   ↓
9. 用户点击下载
   └─ 新窗口打开视频链接
```

### 状态流转图

```
                    ┌─────────────┐
                    │   pending   │  ← 初始创建
                    └──────┬──────┘
                           │
                    POST video + text
                           │
                           ↓
                    ┌─────────────┐
          ┌────────│ processing  |  ← 处理中（克隆声音）
          │        └──────┬──────┘
          │               │
          │         轮询状态
          │         10秒/次
          │               │
          │    ┌──────────┴──────────┐
          │    │                     │
          │    ↓                     ↓
          │ ┌─────────┐       ┌──────────┐
          │ │completed│       │  failed  │
          │ └─────────┘       └──────────┘
          │    ↑                  ↑
          │    │  status = 2      │  status = 3
          │    │                  │
          └────┴──────────────────┘
```

---

## 错误处理

### 错误类型和处理策略

| 错误场景 | HTTP 状态码 | 用户提示 | 处理策略 |
|---------|-----------|---------|---------|
| 文案过短 | 非 2xx | ⚠️ 文案过短或原视频声音太短（需大于10秒） | 阻止提交，要求用户修改 |
| 视频声音太短 | 非 2xx | ⚠️ 同上 | 阻止提交，要求用户换视频 |
| n8n 处理失败 | 非 2xx | ❌ 请求发起失败: {rawText} | 弹窗显示错误信息 |
| 网络错误 | - | ⏳ 网络波动，稍后重试 | 继续轮询，不标记失败 |
| 无音 API 失败 | status = 3 | ❌ {errorMessage} | 更新任务状态为 failed |
| 无音超时 | - | ⏳ 处理时间较长，请稍候 | 持续轮询，最大 30 分钟 |

### 前端错误处理示例

```typescript
try {
  await submitDigitalHumanTask(videoFile, textContent);
} catch (error) {
  if (error.message.includes('⚠️')) {
    // 特定业务错误，显示友好提示
    alert(error.message);
  } else if (error.message.includes('请求发起失败')) {
    // 技术错误，显示原始信息
    alert(error.message);
  } else {
    // 未知错误
    alert('发生未知错误，请稍后重试');
  }
}
```

---

## 测试指南

### 本地测试步骤

#### 1. 启动开发服务器

```bash
cd /Users/zhangyuge/Projects/files/kefu-ai
npm run dev
```

访问 http://localhost:3000

#### 2. 登录/注册

```
Email: test@example.com
Password: test123456
```

#### 3. 创建测试任务

1. 点击"新建生成任务"
2. 上传测试视频（mp4 格式，大于 10 秒）
3. 输入测试文案（至少 10 个字符）
4. 点击"生成"
5. 观察：
   - 控制台日志显示 Task ID
   - 任务出现在列表中
   - 状态持续更新
   - 完成后显示下载按钮

#### 4. 测试用例

| 测试场景 | 输入 | 预期结果 |
|---------|------|---------|
| 正常流程 | 10秒视频 + 50字文案 | ✅ 成功生成视频 |
| 文案过短 | 10秒视频 + 5字文案 | ❌ 阻止提交，提示文案过短 |
| 视频太短 | 5秒视频 + 50字文案 | ❌ 阻止提交，提示视频声音太短 |
| 无视频 | 无 + 50字文案 | ❌ 阻止提交，提示请上传视频 |
| 网络断开 | 正常输入 + 断网 | ⏳ 轮询失败但继续尝试 |

### n8n 测试

#### 1. 访问 n8n 控制台

```
https://n8n.aihub888.xyz
```

#### 2. 查看工作流

1. 登录 n8n
2. 打开 "视频复刻数字人v2" 工作流
3. 查看 Webhook URL: `https://n8n.aihub888.xyz/webhook/create-digital-human`

#### 3. 测试 Webhook

使用 curl 测试：

```bash
# 测试 n8n webhook 是否可达
curl -X GET https://n8n.aihub888.xyz/webhook/create-digital-human

# 预期响应: {"error": "This webhook is not registered for GET requests"}
```

#### 4. 查看 n8n 日志

1. 在 n8n 中点击工作流
2. 点击 "Executions"
3. 查看最近执行记录
4. 点击单条记录查看详细步骤

### 无音科技 API 测试

#### 1. 测试查询接口

```bash
# 测试无效 Task ID
curl -X GET "https://api.wuyinkeji.com/api/async/detail?id=test123" \
  -H "Authorization: 8cyx7Vanb0wEuIRBhBO55KgzGr"

# 预期: {"code": 200, "data": {"status": 3, "message": "任务不存在或已过期"}}
```

#### 2. 模拟成功响应

在数据库中创建一个 task_id，然后模拟无音返回：

```json
{
  "code": 200,
  "data": {
    "status": 2,
    "video_url": "https://example.com/result.mp4"
  }
}
```

---

## 部署说明

### 部署到服务器

#### 1. 一键更新（推荐）

```bash
sshpass -p 'Zhangjin123.' ssh -o StrictHostKeyChecking=no -p 22 ubuntu@43.165.175.54 'cd /var/www/kefu-ai && ./update.sh'
```

#### 2. 手动部署

```bash
# SSH 连接到服务器
sshpass -p 'Zhangjin123.' ssh ubuntu@43.165.175.54

# 进入项目目录
cd /var/www/kefu-ai

# 拉取最新代码
git pull origin main

# 安装依赖
npm install

# 构建生产版本
npm run build

# 重启 PM2
pm2 restart kefu-ai

# 查看日志
pm2 logs kefu-ai --lines 50
```

#### 3. 验证部署

```bash
# 检查服务状态
pm2 status kefu-ai

# 检查 Nginx
sudo systemctl status nginx

# 测试 HTTPS
curl -I https://aihub888.xyz

# 测试 API
curl -I https://aihub888.xyz/api/task
```

### n8n 部署检查

```bash
# SSH 到服务器
sshpass -p 'Zhangjin123.' ssh ubuntu@43.165.175.54

# 检查 n8n 状态
pm2 status n8n

# 查看 n8n 日志
pm2 logs n8n --lines 50

# 重启 n8n（如需要）
pm2 restart n8n
```

### 数据库更新

如果需要更新任务表结构：

```sql
-- 查看现有表
SELECT * FROM tasks LIMIT 5;

-- 添加缺失字段（如需要）
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS result_video_url TEXT;
```

---

## 监控和维护

### 日志查看

```bash
# PM2 应用日志
pm2 logs kefu-ai --out --lines 100

# PM2 错误日志
pm2 logs kefu-ai --err --lines 50

# Nginx 访问日志
sudo tail -f /var/log/nginx/access.log

# Nginx 错误日志
sudo tail -f /var/log/nginx/error.log

# 系统日志
journalctl -u kefu-ai -f
```

### 性能监控

```bash
# CPU 和内存
htop

# 磁盘使用
df -h

# 内存使用
free -h

# 网络连接
netstat -tulpn | grep 3000
```

### 常见问题排查

#### 1. 任务创建后一直"处理中"

**可能原因**:
- n8n webhook 未正确触发
- 无音 API 配额用完
- Task ID 格式不对

**排查步骤**:
1. 检查 n8n 控制台是否有执行记录
2. 查看 n8n 日志是否有错误
3. 检查无音 API 配额
4. 验证 Task ID 是否正确保存到数据库

#### 2. 轮询没有更新状态

**可能原因**:
- Authorization 密钥错误
- Task ID 不存在
- API 请求失败

**排查步骤**:
1. 检查浏览器控制台日志
2. 验证 QUERY_API_KEY 是否正确
3. 测试无音 API 直接访问
4. 查看数据库中任务状态

#### 3. 视频下载链接无效

**可能原因**:
- 链接过期
- 存储服务问题
- 解析错误

**排查步骤**:
1. 检查 data.data.result[0] 是否正确提取
2. 验证视频链接格式
3. 查看无音 API 完整响应

---

## 附录

### 完整 API 响应示例

#### n8n Webhook 响应（成功）

```json
[
  {
    "code": 202,
    "message": "Task submitted successfully",
    "data": {
      "id": "task_abc123xyz",
      "status": "processing"
    }
  }
]
```

#### 无音科技 API 响应（轮询）

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "status": 2,
    "video_url": "https://storage.example.com/video/abc123.mp4",
    "result": [
      "https://storage.example.com/video/abc123.mp4"
    ],
    "message": "处理完成"
  }
}
```

#### 错误响应

```json
{
  "code": 403,
  "msg": "请求密钥KEY不正确！",
  "data": null
}
```

### 技术栈

- **前端框架**: Next.js 14 + React 18
- **UI 组件**: Tailwind CSS + Headless UI
- **状态管理**: React Hooks (useState, useEffect, useRef)
- **数据库**: Supabase (PostgreSQL)
- **实时订阅**: Supabase Realtime
- **后端编排**: n8n
- **AI 服务**: 无音科技

### 参考文档

- [n8n 官方文档](https://docs.n8n.io/)
- [无音科技 API 文档](https://api.wuyinkeji.com/docs)
- [Supabase 文档](https://supabase.com/docs)
- [Next.js 文档](https://nextjs.org/docs)

---

**文档版本**: v1.0
**创建日期**: 2026-04-01
**最后更新**: 2026-04-01
**维护者**: 可孚 AI 团队
