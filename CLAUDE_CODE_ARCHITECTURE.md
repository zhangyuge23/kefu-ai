# Claude Code 源码深度架构分析

> 基于 Claude Code v2.1.88 源码深度学习，提取核心架构模式和最佳实践

## 📋 目录

1. [核心架构概览](#核心架构概览)
2. [工具系统深度分析](#工具系统深度分析)
3. [查询引擎架构](#查询引擎架构)
4. [状态管理模式](#状态管理模式)
5. [技能系统设计](#技能系统设计)
6. [并发与错误处理](#并发与错误处理)
7. [Hooks 系统架构](#hooks-系统架构)
8. [命令系统](#命令系统)
9. [最佳实践总结](#最佳实践总结)

---

## 核心架构概览

### 12层渐进式架构

Claude Code 采用了精心设计的 12 层渐进式架构：

```
┌─────────────────────────────────────────────────────────────┐
│ 第12层: 用户界面层 (React/CLI)                              │
├─────────────────────────────────────────────────────────────┤
│ 第11层: 状态管理层 (AppState/Zustand Pattern)              │
├─────────────────────────────────────────────────────────────┤
│ 第10层: 命令系统 (Commands)                                 │
├─────────────────────────────────────────────────────────────┤
│ 第9层:  技能系统 (Skills/Bundled)                          │
├─────────────────────────────────────────────────────────────┤
│ 第8层:  查询引擎 (QueryEngine)                              │
├─────────────────────────────────────────────────────────────┤
│ 第7层:  API 客户端 (Claude API)                              │
├─────────────────────────────────────────────────────────────┤
│ 第6层:  工具编排层 (StreamingToolExecutor)                  │
├─────────────────────────────────────────────────────────────┤
│ 第5层:  工具注册层 (tools.ts)                               │
├─────────────────────────────────────────────────────────────┤
│ 第4层:  工具定义层 (Individual Tools)                       │
├─────────────────────────────────────────────────────────────┤
│ 第3层:  权限与验证层 (Permissions/Hooks)                    │
├─────────────────────────────────────────────────────────────┤
│ 第2层:  上下文管理 (Context/Memory)                         │
├─────────────────────────────────────────────────────────────┤
│ 第1层:  核心原语 (Messages/Tasks/Agents)                   │
└─────────────────────────────────────────────────────────────┘
```

### 核心入口流程

```
用户输入 → Commands → QueryEngine → Query Loop → API → Tools → 执行 → 结果
    ↓         ↓          ↓           ↓          ↓       ↓
  解析命令  工具注册   消息管理    工具执行    权限检查  状态更新
```

---

## 工具系统深度分析

### 工具注册机制

Claude Code 使用了灵活的**工具注册系统**：

```typescript
// src/tools.ts - 工具注册核心
export function getAllBaseTools(): Tools {
  return [
    AgentTool,
    TaskOutputTool,
    BashTool,
    GlobTool,
    GrepTool,
    ExitPlanModeV2Tool,
    FileReadTool,
    FileEditTool,
    // ... 更多工具
  ]
}

// 条件编译：基于 feature flags
const SleepTool = feature('PROACTIVE') || feature('KAIROS')
  ? require('./tools/SleepTool/SleepTool.js').SleepTool
  : null

// 权限过滤
export function filterToolsByDenyRules(tools, permissionContext) {
  return tools.filter(tool => !getDenyRuleForTool(permissionContext, tool))
}
```

**关键特性**：
1. **Feature Flags**: 使用 `feature()` 函数控制工具可用性
2. **条件导入**: DCE (Dead Code Elimination) 优化
3. **权限过滤**: 基于用户权限动态过滤工具

### 工具基类设计

```typescript
// src/Tool.ts - 工具接口定义
export type Tool<Input, Output, P> = {
  // 核心方法
  call(args, context, canUseTool, parentMessage, onProgress?): Promise<ToolResult<Output>>
  description(input, options): Promise<string>

  // 必需属性
  readonly inputSchema: Input
  readonly name: string

  // 工具能力声明
  isConcurrencySafe(input): boolean
  isReadOnly(input): boolean
  isDestructive?(input): boolean
  interruptBehavior?(): 'cancel' | 'block'

  // 渲染方法
  renderToolResultMessage(content, progressMessages, options): ReactNode
  renderToolUseMessage(input, options): ReactNode
}

// 工具构建器
export function buildTool<D extends ToolDef>(def: D): BuiltTool<D> {
  return {
    ...TOOL_DEFAULTS,
    userFacingName: () => def.name,
    ...def,
  } as BuiltTool<D>
}
```

**默认实现模式**：
```typescript
const TOOL_DEFAULTS = {
  isEnabled: () => true,
  isConcurrencySafe: (_input) => false,
  isReadOnly: (_input) => false,
  isDestructive: (_input) => false,
  checkPermissions: async (input, _ctx) => ({ behavior: 'allow', updatedInput: input }),
  toAutoClassifierInput: (_input) => '',
  userFacingName: (_input) => '',
}
```

### 工具执行流程

```
┌──────────────┐
│ 工具调用请求  │
└──────┬───────┘
       ↓
┌──────────────┐     ┌────────────────┐
│ 权限检查      │────→│ 验证输入        │
└──────┬───────┘     └────────────────┘
       ↓
┌──────────────┐
│ 执行工具      │
└──────┬───────┘
       ↓
┌──────────────┐     ┌────────────────┐
│ 进度回调      │────→│ 结果渲染        │
└──────┬───────┘     └────────────────┘
       ↓
┌──────────────┐
│ 错误处理      │
└──────────────┘
```

---

## 查询引擎架构

### QueryEngine 核心

```typescript
// src/QueryEngine.ts
export class QueryEngine {
  private config: QueryEngineConfig
  private mutableMessages: Message[]
  private abortController: AbortController
  private permissionDenials: SDKPermissionDenial[]
  private totalUsage: NonNullableUsage
  private readFileState: FileStateCache

  async *submitMessage(
    prompt: string | ContentBlockParam[],
    options?: { uuid?: string; isMeta?: boolean }
  ): AsyncGenerator<SDKMessage, void, unknown> {
    // 1. 准备上下文
    const systemPrompt = await fetchSystemPromptParts({...})

    // 2. 处理用户输入
    const { messages: messagesFromUserInput, shouldQuery } =
      await processUserInput({ input: prompt, ... })

    // 3. 进入查询循环
    for await (const message of query({ messages, systemPrompt, ... })) {
      // 处理各种消息类型
      switch (message.type) {
        case 'assistant': // AI 响应
        case 'user':      // 用户消息
        case 'progress':  // 进度更新
        case 'system':    // 系统消息
        // ...
      }
    }

    // 4. 返回最终结果
    yield { type: 'result', subtype: 'success', ... }
  }
}
```

### Query Loop 机制

```typescript
// src/query.ts
async function* queryLoop(params: QueryParams): AsyncGenerator<...> {
  let state: State = {
    messages: params.messages,
    autoCompactTracking: undefined,
    maxOutputTokensRecoveryCount: 0,
    turnCount: 1,
    // ...
  }

  for await (const event of streamResponse) {
    switch (event.type) {
      case 'content_block_start':
        // 处理内容块开始

      case 'content_block_delta':
        // 处理内容块增量

      case 'tool_use':
        // 添加工具调用到执行器

      case 'message_delta':
        // 处理消息完成
    }
  }
}
```

**关键特性**：
1. **流式处理**: 支持增量式响应处理
2. **工具执行器**: StreamingToolExecutor 管理并发
3. **上下文压缩**: 自动 compact 机制
4. **错误恢复**: 多层次错误处理和重试

---

## 状态管理模式

### Store 模式

Claude Code 使用简洁的 Store 模式：

```typescript
// src/state/store.ts
type Store<T> = {
  getState: () => T
  setState: (updater: (prev: T) => T) => void
  subscribe: (listener: () => void) => () => void
}

export function createStore<T>(
  initialState: T,
  onChange?: (args) => void
): Store<T> {
  let state = initialState
  const listeners = new Set<Listener>()

  return {
    getState: () => state,

    setState: (updater) => {
      const prev = state
      const next = updater(prev)
      if (Object.is(next, prev)) return  // 避免不必要的更新
      state = next
      onChange?.({ newState: next, oldState: prev })
      for (const listener of listeners) listener()
    },

    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    }
  }
}
```

**设计亮点**：
1. **Immutable 更新**: 使用 `Object.is` 检查避免不必要的更新
2. **订阅机制**: 简单的发布-订阅模式
3. **变更回调**: 可选的 `onChange` 回调

### AppState 结构

```typescript
// src/state/AppState.tsx
export type AppState = {
  // 工具相关
  mcp: MCPToolState
  tools: ToolState

  // 消息相关
  messages: Message[]
  transcript: Message[]

  // 任务相关
  tasks: TaskState[]

  // 权限相关
  toolPermissionContext: ToolPermissionContext

  // 配置相关
  config: GlobalConfig
  theme: ThemeName

  // 状态标志
  isLoading: boolean
  isStreaming: boolean
}
```

---

## 技能系统设计

### 技能注册机制

```typescript
// src/skills/bundled/batch.ts
export function registerBatchSkill(): void {
  registerBundledSkill({
    name: 'batch',
    description: 'Research and plan a large-scale change...',
    whenToUse: 'Use when the user wants to make sweeping changes...',
    argumentHint: '<instruction>',
    userInvocable: true,
    disableModelInvocation: true,

    async getPromptForCommand(args) {
      // 动态生成技能提示
      return [{ type: 'text', text: buildPrompt(args) }]
    }
  })
}
```

### 内置技能列表

Claude Code 提供了 5 个核心内置技能：

1. **batch**: 批量并行工作编排
   - 使用 git worktree 实现隔离
   - 最多 30 个并行工作单元
   - 自动创建 PR

2. **debug**: 调试技能
   - 读取会话调试日志
   - 分析错误和警告
   - 提供修复建议

3. **loop**: 循环执行技能
   - 重复执行直到成功
   - 可配置的迭代次数
   - 状态保持

4. **stuck**: 卡住检测技能
   - 检测工具调用失败
   - 提供备选方案
   - 自动重试建议

5. **verify**: 验证技能
   - 验证代码变更
   - 运行测试
   - 生成验证报告

### 技能系统架构

```
用户输入 (/batch)
    ↓
命令解析 (commands.ts)
    ↓
技能注册 (registerBundledSkill)
    ↓
提示生成 (getPromptForCommand)
    ↓
Agent 执行 (AgentTool)
    ↓
结果输出
```

---

## 并发与错误处理

### StreamingToolExecutor

Claude Code 使用智能的并发控制：

```typescript
// src/services/tools/StreamingToolExecutor.ts
export class StreamingToolExecutor {
  private tools: TrackedTool[] = []

  addTool(block: ToolUseBlock, assistantMessage: AssistantMessage): void {
    const isConcurrencySafe = toolDefinition.isConcurrencySafe(parsedInput.data)

    this.tools.push({
      id: block.id,
      block,
      status: 'queued',
      isConcurrencySafe,
      pendingProgress: [],
    })

    void this.processQueue()
  }

  private canExecuteTool(isConcurrencySafe: boolean): boolean {
    const executingTools = this.tools.filter(t => t.status === 'executing')
    return executingTools.length === 0 ||
      (isConcurrencySafe && executingTools.every(t => t.isConcurrencySafe))
  }
}
```

**并发规则**：
1. **安全工具**: 可以并行执行
2. **非安全工具**: 必须单独执行
3. **Bash 错误**: 取消所有并行工具
4. **用户中断**: 根据 `interruptBehavior` 决定

### 错误恢复策略

```typescript
// src/query.ts
const MAX_OUTPUT_TOKENS_RECOVERY_LIMIT = 3

// 检测最大输出 token 错误
function isWithheldMaxOutputTokens(msg): boolean {
  return msg?.type === 'assistant' && msg.apiError === 'max_output_tokens'
}

// 恢复循环
if (message.type === 'assistant' && message.apiError === 'max_output_tokens') {
  if (state.maxOutputTokensRecoveryCount < MAX_OUTPUT_TOKENS_RECOVERY_LIMIT) {
    // 尝试恢复
    state.maxOutputTokensRecoveryCount++
  }
}
```

---

## Hooks 系统架构

Claude Code 拥有 138 个精心设计的 Hooks！

### 核心 Hooks 分类

```typescript
// 状态管理
useMergedTools.ts      // 工具合并
useMergedCommands.ts   // 命令合并
useMergedClients.ts     // MCP 客户端合并

// 任务管理
useTasksV2.ts          // 任务管理 V2
useTaskListWatcher.ts   // 任务列表监听
useScheduledTasks.ts    // 计划任务

// 工具使用
useCanUseTool.tsx      // 工具使用权限
useInProgressToolUses.ts // 工具执行状态

// 会话管理
useSessionBackgrounding.ts  // 后台会话
useRemoteSession.ts         // 远程会话

// UI/UX
useVoice.ts            // 语音集成
useVimInput.ts         // Vim 输入模式
useIdeConnectionStatus.ts // IDE 连接状态
```

### 典型 Hook 实现模式

```typescript
// src/hooks/useMergedTools.ts
export function useMergedTools(): Tools {
  const appState = useAppState()
  const { mcp } = appState

  return useMemo(() => {
    // 合并内置工具和 MCP 工具
    const builtInTools = getTools(appState.toolPermissionContext)
    const mcpTools = mcp.tools || []

    // 去重（内置工具优先）
    return uniqBy([...builtInTools, ...mcpTools], 'name')
  }, [appState.toolPermissionContext, mcp.tools])
}
```

---

## 命令系统

### 命令注册

```typescript
// src/commands.ts
import addDir from './commands/add-dir/index.js'
import clear from './commands/clear/index.js'
import compact from './commands/compact/index.js'
import help from './commands/help/index.js'
// ... 100+ 命令

export type Command = {
  type: 'prompt' | 'intercept' | 'background'
  name: string
  description: string
  getPromptForCommand(args, context): Promise<Content[]>
}
```

### 命令类型

1. **Prompt 命令**: `/help`, `/plan`, `/review`
   - 生成提示并发送给 AI

2. **Intercept 命令**: `/clear`, `/exit`
   - 拦截并执行特定操作

3. **Background 命令**: 任务命令
   - 在后台执行

### Slash 命令处理

```typescript
// src/utils/processUserInput/processUserInput.ts
export async function processUserInput(input: string): Promise<{
  messages: Message[]
  shouldQuery: boolean
  commands: Command[]
}> {
  // 检测 slash 命令
  if (input.startsWith('/')) {
    const commandName = input.slice(1).split(' ')[0]
    const command = findCommand(commandName)

    if (command) {
      // 执行命令
      const prompt = await command.getPromptForCommand(args)
      return { messages: [createUserMessage(prompt)], shouldQuery: true }
    }
  }

  // 普通输入
  return { messages: [createUserMessage(input)], shouldQuery: true }
}
```

---

## 最佳实践总结

### 1. 工具系统最佳实践

#### 1.1 使用 buildTool 构建工具
```typescript
export const BashTool = buildTool({
  name: 'Bash',
  description: 'Execute shell commands',
  inputSchema: z.object({
    command: z.string(),
    timeout: z.number().optional(),
  }),

  async call(args, context, canUseTool) {
    // 工具实现
  },

  isConcurrencySafe: (input) => true,
  isReadOnly: (input) => isReadOnlyCommand(input.command),
})
```

#### 1.2 声明式工具能力
```typescript
// 声明并发安全性
isConcurrencySafe: (input) => true

// 声明中断行为
interruptBehavior: () => 'cancel'

// 声明破坏性
isDestructive: (input) => input.command.includes('rm')
```

#### 1.3 进度报告
```typescript
async call(args, context, canUseTool, parentMessage, onProgress) {
  onProgress?.({ toolUseID: '', data: { type: 'progress', message: '...' } })

  // 执行工作
  for (const item of items) {
    await process(item)
    onProgress?.({
      toolUseID: '',
      data: { type: 'progress', message: `Processed ${item}` }
    })
  }

  return { data: result }
}
```

### 2. 状态管理最佳实践

#### 2.1 避免不必要的更新
```typescript
setState: (updater) => {
  const prev = state
  const next = updater(prev)
  if (Object.is(next, prev)) return  // 关键优化
  state = next
  // 触发更新
}
```

#### 2.2 订阅清理
```typescript
useEffect(() => {
  const unsubscribe = store.subscribe(listener)
  return () => unsubscribe()  // 清理订阅
}, [])
```

### 3. 错误处理最佳实践

#### 3.1 层级化错误处理
```typescript
try {
  await executeTool()
} catch (error) {
  if (error instanceof PermissionError) {
    // 权限错误
  } else if (error instanceof TimeoutError) {
    // 超时错误
  } else {
    // 未知错误
    throw error
  }
}
```

#### 3.2 AbortController 传播
```typescript
const toolAbortController = createChildAbortController(parentAbortController)

toolAbortController.signal.addEventListener('abort', () => {
  // 向上传播中止信号
  parentAbortController.abort(toolAbortController.signal.reason)
})
```

### 4. 并发控制最佳实践

#### 4.1 安全工具并行执行
```typescript
if (toolDefinition.isConcurrencySafe(input)) {
  // 可以与其他安全工具并行
  await Promise.all(safeTools.map(execute))
}
```

#### 4.2 非安全工具顺序执行
```typescript
for (const tool of unsafeTools) {
  await executeTool(tool)  // 顺序执行
}
```

### 5. API 设计最佳实践

#### 5.1 使用 AsyncGenerator
```typescript
async *query(params: QueryParams): AsyncGenerator<Message, Result> {
  for await (const message of streamResponse) {
    yield message
  }
  return finalResult
}
```

#### 5.2 流式处理
```typescript
for await (const chunk of stream) {
  yield { type: 'chunk', data: chunk }
}
```

### 6. 性能优化最佳实践

#### 6.1 记忆化
```typescript
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(deps)
}, [deps])
```

#### 6.2 虚拟列表
```typescript
const virtualList = useVirtualScroll({
  items: largeList,
  itemHeight: 50,
  overscan: 5,
})
```

#### 6.3 防抖
```typescript
const debouncedSearch = useDebouncedCallback(
  (query) => search(query),
  300
)
```

### 7. 安全最佳实践

#### 7.1 权限检查
```typescript
checkPermissions: async (input, context) => {
  const result = await canUseTool(toolDefinition, input, context)
  if (result.behavior === 'deny') {
    return { behavior: 'deny', reason: 'Permission denied' }
  }
  return { behavior: 'allow', updatedInput: input }
}
```

#### 7.2 输入验证
```typescript
validateInput: async (input) => {
  const result = schema.safeParse(input)
  if (!result.success) {
    return {
      result: false,
      message: result.error.message,
      errorCode: 400
    }
  }
  return { result: true }
}
```

---

## 架构设计亮点

### 1. **渐进式复杂度**
- 基础版本可用，高级功能按需加载
- Feature flags 控制复杂性

### 2. **声明式工具定义**
- 工具声明自己的能力（并发、破坏性等）
- 系统根据声明自动优化

### 3. **流式处理架构**
- 全链路流式支持
- 增量更新和渲染

### 4. **智能状态管理**
- 最小化状态更新
- 订阅清理自动化

### 5. **多层次抽象**
- 清晰的关注点分离
- 每层独立测试和优化

---

## 学习要点

### 为 Claude Code 项目应用

基于以上分析，我可以将以下能力应用到 "可孚AI数字人平台" 项目：

1. **工具系统**: 实现类似的任务工具架构
2. **状态管理**: 使用订阅模式管理全局状态
3. **技能系统**: 创建可复用的技能模块
4. **并发控制**: 实现智能的并发任务调度
5. **错误恢复**: 多层次错误处理机制

### 下一步行动计划

1. **完善技能包**: 将本分析添加到技能包中
2. **实践应用**: 在项目中应用这些架构模式
3. **持续学习**: 关注 Claude Code 的更新迭代

---

**文档版本**: v1.0
**分析日期**: 2026-04-01
**源码版本**: Claude Code v2.1.88
