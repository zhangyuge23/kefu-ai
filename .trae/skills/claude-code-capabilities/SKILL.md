---
name: "claude-code-capabilities"
description: "Claude Code 核心能力技能包。Invoke when user asks for advanced AI coding assistance, code analysis, architectural design, or complex development tasks. Based on Claude Code v2.1.88 capabilities."
---

# Claude Code 核心能力技能包

> 基于 Claude Code v2.1.88 源码分析提取

## 🎯 核心能力概览

### 1. 智能代码生成与重构

#### 自动代码生成
- **功能**: 根据描述自动生成完整代码
- **触发词**: "实现"、"创建"、"生成"、"build"
- **示例**: 
  ```
  用户: "创建一个用户认证系统"
  AI: 生成完整的注册、登录、JWT token、权限控制等代码
  ```

#### 智能重构
- **功能**: 分析代码并提出优化建议
- **触发词**: "重构"、"优化"、"refactor"
- **能力**:
  - 代码质量分析
  - 性能优化建议
  - 设计模式应用
  - 技术债清理

#### 代码补全
- **功能**: 智能补全代码片段
- **支持**: 
  - 函数体补全
  - 类型推导
  - import 自动导入
  - 注释生成

### 2. 架构设计能力

#### 系统设计
- **触发词**: "架构"、"设计模式"、"系统架构"
- **能力**:
  - MVC/MVVM/Clean Architecture
  - 微服务架构设计
  - 数据库设计
  - API 设计
  - 设计模式建议
- **参考**: Claude Code 使用 12 层渐进式架构
  - 第12层: 用户界面层 (React/CLI)
  - 第11层: 状态管理层 (AppState/Store Pattern)
  - 第10层: 命令系统 (Commands)
  - 第9层: 技能系统 (Skills/Bundled)
  - 第8层: 查询引擎 (QueryEngine)
  - 第7层: API 客户端 (Claude API)
  - 第6层: 工具编排层 (StreamingToolExecutor)
  - 第5层: 工具注册层 (tools.ts)
  - 第4层: 工具定义层 (Individual Tools)
  - 第3层: 权限与验证层 (Permissions/Hooks)
  - 第2层: 上下文管理 (Context/Memory)
  - 第1层: 核心原语 (Messages/Tasks/Agents)

#### 技术选型
- **触发词**: "用什么技术"、"技术栈"、"框架选择"
- **能力**:
  - 最佳实践建议
  - 框架对比分析
  - 依赖管理建议
  - 性能考虑

#### 状态管理模式
- **触发词**: "状态管理"、"global state"、"store"
- **能力**:
  - 使用简洁的 Store 模式（参考 Claude Code）
  - Immutable 更新检查（Object.is）
  - 订阅机制（发布-订阅）
  - 变更回调（onChange）
- **参考实现**:
  ```typescript
  type Store<T> = {
    getState: () => T
    setState: (updater: (prev: T) => T) => void
    subscribe: (listener: () => void) => () => void
  }
  ```

### 3. 代码分析能力

#### 代码审查
- **触发词**: "review"、"审查"、"检查代码"
- **能力**:
  - Bug 检测
  - 安全漏洞扫描
  - 性能问题识别
  - 代码规范检查
  - 最佳实践建议

#### 依赖分析
- **触发词**: "分析依赖"、"依赖关系"
- **能力**:
  - 包版本冲突检测
  - 安全漏洞扫描
  - 依赖更新建议
  - 未使用导入检测

### 4. 调试与排错

#### 错误诊断
- **触发词**: "报错"、"出错了"、"bug"、"错误"
- **能力**:
  - Stack trace 分析
  - 根因定位
  - 修复方案生成
  - 单元测试生成

#### 日志分析
- **触发词**: "日志"、"logs"、"trace"
- **能力**:
  - 日志模式识别
  - 问题定位
  - 性能瓶颈分析

### 5. 测试能力

#### 单元测试
- **触发词**: "写测试"、"test"、"测试用例"
- **能力**:
  - Jest/Mocha/Chai 测试生成
  - Mock 数据自动生成
  - 覆盖率优化
  - 边界条件测试

#### 集成测试
- **触发词**: "集成测试"、"e2e"、"端到端"
- **能力**:
  - Playwright/Cypress 测试
  - API 测试
  - 场景测试

### 6. DevOps 能力

#### CI/CD 配置
- **触发词**: "CI"、"CD"、"pipeline"、"部署"
- **能力**:
  - GitHub Actions
  - GitLab CI
  - Jenkins
  - Docker 配置
  - Kubernetes 部署

#### 环境配置
- **触发词**: "环境配置"、"env"、"setup"
- **能力**:
  - 开发环境搭建
  - 多环境配置
  - 环境变量管理

### 7. 数据库能力

#### SQL 生成
- **触发词**: "SQL"、"查询"、"database"
- **能力**:
  - CRUD 操作生成
  - 复杂查询优化
  - 索引建议
  - ORM 操作

#### 数据库设计
- **触发词**: "数据库设计"、"schema"、"表结构"
- **能力**:
  - ER 图生成
  - 迁移脚本
  - 索引优化
  - 分库分表策略

### 8. AI 增强能力

#### 上下文理解
- **能力**:
  - 项目级上下文感知
  - 跨文件依赖理解
  - 用户习惯学习
  - 意图推断

#### 主动建议
- **触发词**: "建议"、"优化"、"improvement"
- **能力**:
  - 性能优化建议
  - 安全加固建议
  - 代码可维护性提升
  - 最佳实践推荐

### 9. 协作能力

#### 代码解释
- **触发词**: "解释代码"、"explain"、"说明"
- **能力**:
  - 代码逻辑解释
  - 技术细节说明
  - 业务流程图生成

#### 文档生成
- **触发词**: "写文档"、"doc"、"注释"
- **能力**:
  - API 文档 (Swagger/OpenAPI)
  - README 生成
  - JSDoc 注释
  - 使用示例

### 10. 高级工具集

#### 文件操作
```bash
# 智能文件查找
glob "**/*.ts" --include-test

# 批量重命名
rename --pattern "*.test.ts" --to "*.spec.ts"

# 文件对比
diff file1.ts file2.ts --side-by-side
```

#### 代码搜索
```bash
# 正则搜索
grep --regex "TODO.*fixme" --files-with-matches

# 语义搜索
search --meaning "用户认证" --files "src/**/*.ts"
```

#### 重构工具
```bash
# 移动文件并更新引用
move src/components/Button.tsx src/ui/Button.tsx --update-imports

# 提取组件
extract --component "Button" src/components/*.tsx
```

## 🎨 使用技巧

### 1. 高效提问模板

#### 模糊需求
```
"我想做一个电商网站"
```
→ AI 会询问具体需求，引导明确

#### 具体需求
```
"用 React + TypeScript 实现购物车组件：
- 支持数量增减
- 支持删除商品
- 显示总价
- 需要包含单元测试"
```
→ AI 直接生成完整代码

#### 问题咨询
```
"我的登录接口报 401 错误，已经检查了：
1. Token 过期时间
2. 请求头格式
3. 后端日志

请帮我分析可能的原因"
```
→ AI 提供针对性分析

### 2. 上下文管理

#### 提供背景
```
项目：Next.js 14 + Supabase
技术栈：TypeScript + Tailwind CSS
当前问题：用户认证流程
```

#### 指定范围
```
"只修改 src/app/(auth) 目录下的代码"
"不要动 utils/ 文件夹"
```

### 3. 迭代优化

#### 初步方案
```
"帮我实现一个排序算法"
```

#### 迭代优化
```
"用更快的方式实现"
"如果要处理 100 万条数据呢"
"能否用多线程优化"
```

## 🔧 工具调用指南

### 常用命令

| 命令 | 用途 | 示例 |
|------|------|------|
| `glob` | 文件查找 | `glob "**/*.test.ts"` |
| `grep` | 代码搜索 | `grep "TODO" --files` |
| `read` | 读取文件 | `read src/app.ts` |
| `write` | 写入文件 | `write "content" src/new.ts` |
| `edit` | 编辑文件 | `edit src/app.ts --replace "old" "new"` |
| `bash` | 执行命令 | `bash "npm run build"` |

### 权限管理

#### 请求权限
```
Tool: bash
Args: command="rm -rf node_modules"
Reason: 需要清理旧的依赖包以安装新版本
```

#### 自动提升
- 敏感操作会提示确认
- 提供操作原因解释
- 清晰的执行反馈

## 📊 性能优化能力

### 代码优化
```typescript
// 优化前
const result = items.filter(x => x.active).map(x => x.id);

// 优化后（性能提升 30%）
const result = [];
for (const item of items) {
  if (item.active) result.push(item.id);
}
```

### 内存优化
- 避免内存泄漏
- 及时释放资源
- 懒加载策略

### 网络优化
- 请求合并
- 缓存策略
- 压缩优化

## 🔒 安全能力

### 安全扫描
```bash
# 检测常见漏洞
security-scan --files src/**/*.ts

# 依赖审计
npm audit --fix
```

### 安全建议
- SQL 注入防护
- XSS 攻击防御
- CSRF 保护
- 敏感信息加密

## 🎓 学习能力

### 代码解释
```
explain "这个函数的作用"
explain --flow "数据流经路径"
explain --impact "影响范围"
```

### 知识问答
```
"React Hooks 的原理是什么"
"TypeScript 的条件类型怎么用"
"Docker 和 Kubernetes 的区别"
```

## 🚀 高级特性

### 1. 多文件协作
```bash
# 同时修改多个文件
edit --files file1.ts file2.ts file3.ts "old" "new"
```

### 2. 批量操作
```bash
# 批量创建文件
create --template "react-component" --count 10 "components/Button{1..10}.tsx"

# 批量重命名
rename --pattern "*.jsx" --to "*.tsx" --update-imports
```

### 3. 项目模板
```bash
# 从模板创建
create --template "nextjs-app" --name "my-app"

# 自定义模板
template --create "my-template" --include "src/**/*"
```

## 📝 最佳实践

### 1. 提问技巧
✅ **推荐**
```
"用 React 实现一个待办事项列表，需要：
1. 添加、删除、编辑功能
2. 本地存储
3. 响应式设计"
```

❌ **不推荐**
```
"帮我做个网站"
```

### 2. 反馈循环
1. **明确需求**: 具体描述期望结果
2. **提供上下文**: 项目背景、约束条件
3. **迭代优化**: 逐步调整、完善
4. **测试验证**: 确保功能正确

### 3. 错误处理
```
遇到问题：
1. 提供完整的错误信息
2. 附上相关代码片段
3. 说明已尝试的解决方案
4. 等待 AI 分析和建议
```

## 🎯 适用场景

| 场景 | 推荐能力 |
|------|---------|
| 新项目启动 | 架构设计、技术选型 |
| 功能开发 | 代码生成、重构优化 |
| Bug 修复 | 错误诊断、日志分析 |
| 代码审查 | 安全扫描、性能分析 |
| 性能优化 | 瓶颈分析、优化建议 |
| 学习提升 | 代码解释、知识问答 |

## 🔄 更新日志

### v1.0 (2026-03-31)
- 初始版本
- 包含 10 大核心能力模块
- 工具集完整收录
- 最佳实践指南

## 📚 参考资源

- [Claude Code 官方文档](https://docs.anthropic.com/claude-code)
- [Anthropic API 文档](https://docs.anthropic.com/api)
- [最佳实践指南](https://github.com/anthropics/anthropic-cookbook)

---

**使用提示**: 
- 具体的需求描述能获得更准确的代码
- 提供上下文可以获得更好的建议
- 遇到问题先自己尝试，给出尝试的过程
- 善用"迭代优化"逐步完善代码
