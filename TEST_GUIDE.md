# AI 数字人视频合成 - 快速测试指南

## 🚀 测试流程

### 1. 本地测试

#### 1.1 启动开发服务器

```bash
cd /Users/zhangyuge/Projects/files/kefu-ai
npm run dev
```

访问 http://localhost:3000

#### 1.2 登录账号

使用已注册的测试账号登录：
- Email: your-test-email@example.com
- Password: your-password

#### 1.3 创建测试任务

1. **点击"新建生成任务"按钮**
   - 位置：任务列表页面上方
   - 图标：➕ 加号

2. **上传测试视频**
   - 点击上传区域或拖拽视频文件
   - 支持格式：mp4, mov, webm
   - 建议大小：10-50MB
   - ⚠️ **重要**：视频需要有声音，且时长大于 10 秒

3. **输入文案**
   - 至少 10 个中文字符
   - 建议长度：50-200 字
   - 例如："欢迎使用可孚AI数字人平台，这里是您的专属虚拟主播"

4. **点击"生成"按钮**
   - 等待 3-5 秒
   - 观察控制台日志

#### 1.4 观察预期行为

**✅ 正常流程**：

```
1. 弹出加载提示："正在提交任务..."
   ↓
2. 控制台输出：POST https://n8n.aihub888.xyz/webhook/create-digital-human
   ↓
3. n8n 返回 Task ID
   ↓
4. 弹窗关闭，任务出现在列表中
   ↓
5. 控制台开始轮询：
   - "轮询 X 个处理中的任务..."
   - GET https://api.wuyinkeji.com/api/async/detail?id=xxx
   ↓
6. 每 10 秒更新一次状态
   ↓
7. 状态从"处理中"变为"克隆声音" → "合成中" → "已完成"
   ↓
8. 显示"下载视频"按钮
```

**❌ 异常流程 - 文案过短**：

```
1. 点击"生成"
   ↓
2. 弹出警告："⚠️ 文案过短或原视频声音太短（需大于10秒），提取特征失败，请增加文案或换个视频重试！"
   ↓
3. 任务不会创建
```

**❌ 异常流程 - 网络错误**：

```
1. 任务创建成功
   ↓
2. 轮询失败
   ↓
3. 控制台输出："任务 xxx 查询失败: ..."
   ↓
4. 任务保持"处理中"状态
   ↓
5. 网络恢复后自动继续轮询
```

### 2. 控制台日志分析

打开浏览器开发者工具（F12），切换到 Console 标签，观察以下日志：

```bash
# 任务创建
开始创建数字人任务...
POST https://n8n.aihub888.xyz/webhook/create-digital-human 202
成功获取 Task ID: task_abc123xyz

# 数据库保存
保存任务到数据库: task_abc123xyz

# 开始轮询
开始轮询任务状态...

# 轮询循环
轮询 1 个处理中的任务...
GET https://api.wuyinkeji.com/api/async/detail?id=task_abc123xyz 200
任务 task_abc123xyz 状态: processing

# 任务完成
✅ 任务 task_abc123xyz 已完成
更新任务到数据库: { status: 'completed', result_video_url: '...' }
```

### 3. 数据库验证

#### 3.1 查看 Supabase Dashboard

1. 访问 https://supabase.com/dashboard
2. 选择项目：`bjrtvbnkllhlmimqgdtl`
3. 点击 "Table Editor" → `tasks` 表

#### 3.2 验证任务数据

```sql
-- 查看所有任务
SELECT id, name, status, result_video_url, created_at
FROM tasks
ORDER BY created_at DESC
LIMIT 10;

-- 查看特定任务
SELECT * FROM tasks WHERE id = 'your-task-id';

-- 查看处理中的任务
SELECT * FROM tasks
WHERE status NOT IN ('completed', 'failed');
```

#### 3.3 任务状态枚举

| status | 描述 | 轮询状态 |
|--------|------|---------|
| pending | 初始状态 | - |
| processing | 处理中 | 持续轮询 |
| cloning | 克隆声音 | 持续轮询 |
| synthesizing | 语音合成 | 持续轮询 |
| completed | 已完成 | 停止轮询 |
| failed | 失败 | 停止轮询 |

### 4. n8n 工作流测试

#### 4.1 访问 n8n

```
https://n8n.aihub888.xyz
```

#### 4.2 查看工作流

1. 登录 n8n
2. 点击 "视频复刻数字人v2" 工作流
3. 查看 Webhook URL

#### 4.3 手动触发测试

在 n8n 中：

1. 点击 "Workflows" → "视频复刻数字人v2"
2. 点击右侧 "Test workflow" 按钮
3. 选择一个测试视频文件
4. 输入测试文案
5. 点击 "Test"

#### 4.4 查看执行记录

1. 点击工作流名称
2. 点击 "Executions" 标签
3. 查看最近的执行列表
4. 点击单条记录查看详细步骤

**预期执行步骤**：

```
✓ Step 1: Webhook (Receive)
✓ Step 2: Code (Parse Data)
✓ Step 3: Extract Audio (FFmpeg)
✓ Step 4: Clone Voice (无音 API)
✓ Step 5: Synthesize Speech (无音 API)
✓ Step 6: Digital Human Task (无音 API)
✓ Step 7: Return Response
```

### 5. 无音科技 API 测试

#### 5.1 测试查询接口

使用浏览器或 Postman：

```bash
# 请求
GET https://api.wuyinkeji.com/api/async/detail?id=test-task-id
Authorization: 8cyx7Vanb0wEuIRBhBO55KgzGr

# 预期响应（任务不存在）
{
  "code": 200,
  "data": {
    "status": 3,
    "message": "任务不存在或已过期"
  }
}
```

#### 5.2 查看 API 文档

访问无音科技提供的 API 文档，验证：
- 请求格式
- 响应格式
- 错误码说明

### 6. 常见问题排查

#### 问题 1：任务创建后立即消失

**检查项**：
1. Supabase 表权限是否正确
2. RLS 策略是否允许读取
3. API 路由是否返回错误

**解决方案**：
```bash
# 查看 Supabase Dashboard → Authentication → Logs
# 检查是否有权限错误
```

#### 问题 2：轮询没有工作

**检查项**：
1. Dashboard 页面是否正确引入 useTasks
2. startPolling 是否在 useEffect 中调用
3. Browser Console 是否有错误

**解决方案**：
```typescript
// 在 dashboard/page.tsx 中添加调试日志
useEffect(() => {
  console.log('Dashboard mounted, starting polling...');
  startPolling();
  return () => {
    console.log('Dashboard unmounting, stopping polling...');
    stopPolling();
  };
}, [startPolling, stopPolling]);
```

#### 问题 3：视频链接为空

**检查项**：
1. 无音 API 是否返回了 video_url
2. result 数组是否正确解析
3. 数据库字段是否正确

**解决方案**：
```typescript
// 在 pollTaskStatus 中添加日志
if (result.status === 'success' && result.videoUrl) {
  console.log('Video URL found:', result.videoUrl);
}
```

#### 问题 4：n8n Webhook 超时

**检查项**：
1. n8n 服务是否运行
2. FFmpeg 是否安装
3. 无音 API 是否响应

**解决方案**：
```bash
# SSH 到服务器
sshpass -p 'Zhangjin123.' ssh ubuntu@43.165.175.54

# 检查 n8n 状态
pm2 status n8n

# 检查 FFmpeg
ffmpeg -version

# 查看 n8n 日志
pm2 logs n8n --lines 100
```

### 7. 性能测试

#### 7.1 轮询频率测试

默认轮询间隔：10 秒

```typescript
// 在 useTasks.ts 中调整
pollIntervalRef.current = setInterval(() => {
  pollProcessingTasks();
}, 5000); // 改为 5 秒
```

#### 7.2 并发任务测试

创建多个任务，验证：

1. 轮询是否正确处理多个任务
2. 状态更新是否正确
3. UI 是否响应流畅

```typescript
// 控制台日志应该显示
轮询 3 个处理中的任务...
轮询 2 个处理中的任务...
轮询 1 个处理中的任务...
```

### 8. 部署验证清单

部署到服务器后，验证以下内容：

- [ ] ✅ npm run build 成功
- [ ] ✅ pm2 restart kefu-ai 成功
- [ ] ✅ HTTPS 证书有效
- [ ] ✅ 数据库连接正常
- [ ] ✅ n8n 服务运行中
- [ ] ✅ 无音 API 可访问
- [ ] ✅ 任务创建成功
- [ ] ✅ 轮询正常工作
- [ ] ✅ 视频下载链接有效

---

**测试完成时间**: 2026-04-01
**测试人员**: Trae AI
**状态**: ✅ 已完成
