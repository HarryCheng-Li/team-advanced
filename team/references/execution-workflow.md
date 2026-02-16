# Agent Team 执行工作流

详细的执行模板和代码示例。

---

## 目录

1. [场景速查表](#1-场景速查表)
2. [通用模板](#2-通用模板)
3. [面向用户的工作流](#3-面向用户的工作流) ⭐ 新增
4. [技术工作流](#4-技术工作流)
5. [失败恢复](#5-失败恢复)

---

## 1. 场景速查表

### 按用户需求选择

| 用户说... | 任务类型 | 角色 | 流程 |
|-----------|----------|------|------|
| "我想做一个..." | 功能开发 | product-owner + 技术团队 | Phase 0-8 完整流程 |
| "有个问题..." | Bug调试 | product-owner + bug-hunter | Phase 0 + 调试 + 验收 |
| "做一个新项目" | 新项目 | 完整用户服务层 + 技术团队 | Phase 0-8 完整流程 |
| "审查代码" | 代码审查 | 技术审查团队 | Phase 1-6 |

### 按复杂度选择

| 复杂度 | 用户服务角色 | 技术角色 | 人数 |
|--------|-------------|----------|------|
| 简单 | product-owner | 2-3 | 3-4 |
| 中等 | product-owner + user-translator | 4-6 | 6-8 |
| 复杂 | product-owner + user-translator + qa-verifier | 7-12 | 10-15 |

---

## 2. 通用模板

### 2.1 用户服务角色模板

```javascript
// product-owner（必须有）
Task({
  description: "生成产品负责人",
  prompt: `你是 product-owner。

## 用户原始需求
"${用户输入的原始需求}"

## 你的角色
你是用户的代表。确保团队的产出符合用户的真实需求。

## 核心职责
1. 理解用户真实意图
2. 翻译需求为技术任务
3. 定义验收标准
4. 监控方向不偏离
5. 汇报进度（用简单语言）
6. 最终验收

## 输出
1. 需求澄清文档
2. 验收标准
3. 进度报告`,
  subagent_type: "general-purpose",
  name: "product-owner",
  team_name: "<团队名>",
  max_turns: 150
})

// qa-verifier（验收时需要）
Task({
  description: "生成用户验收员",
  prompt: `你是 qa-verifier。

## 用户原始需求
"${用户输入的原始需求}"

## 验收清单
- [ ] 功能是否符合用户描述的场景？
- [ ] 用户能否理解如何使用？
- [ ] 是否有用户友好的使用说明？

## 输出
验收报告（通过/不通过 + 问题列表）`,
  subagent_type: "general-purpose",
  name: "qa-verifier",
  team_name: "<团队名>"
})
```

### 2.2 技术角色模板（带用户视角）

```javascript
Task({
  description: "生成 <技术角色>",
  prompt: `你是 <技术角色>。

## 用户原始需求
"${用户输入的原始需求}"

## 任务
<具体技术任务>

## 用户视角原则 ⭐
1. 完成后用简单语言解释做了什么
2. 如果发现可能偏离用户预期，立即报告 product-owner
3. 输出要包含用户友好的说明

## 技术职责
1. <职责1>
2. <职责2>

## 输出
1. 技术产出
2. 用户友好说明`,
  subagent_type: "<agent类型>",
  name: "<角色标识>",
  team_name: "<团队名>",
  max_turns: 100
})
```

### 2.3 进度汇报模板

```javascript
SendMessage({
  type: "message",
  recipient: "product-owner",
  content: `# 进度报告

## 已完成
- 用户登录功能 ✅
  （用户可以输入账号密码登录）

## 进行中
- 用户注册功能（预计 20 分钟）
  （用户可以创建新账号）

## 下一步
- 密码找回功能

## 需要确认
- 登录后希望跳转到哪个页面？`,
  summary: "进度汇报"
})
```

---

## 3. 面向用户的工作流 ⭐ 新增

### 3.1 新功能开发（完整流程）

**用户输入**: "我想做一个用户登录功能"

```javascript
// ========== Phase 0: 需求澄清 ==========

// 1. 触发 interview-skills
Skill({
  skill: "interview-skills",
  args: "feature 用户登录功能"
})

// 2. 创建团队
TeamCreate({
  team_name: "feature-user-login",
  description: "用户登录功能"
})

// 3. 生成 product-owner（先于技术团队）
Task({
  description: "生成产品负责人",
  prompt: `你是 product-owner。

## 用户原始需求
"我想做一个用户登录功能"

## 你的任务
1. 深入理解用户的真实需求
2. 询问澄清问题（登录方式？第三方登录？记住密码？）
3. 生成需求澄清文档
4. 向用户确认理解是否正确

## 澄清问题示例
- "您希望用户用什么方式登录？账号密码、手机号、还是第三方（微信/微博）？"
- "登录后希望跳转到哪个页面？"
- "需要记住登录状态吗？多久？"

## 输出
需求澄清文档 + 验收标准`,
  subagent_type: "general-purpose",
  name: "product-owner",
  team_name: "feature-user-login",
  max_turns: 150
})

// 4. 等待 product-owner 完成需求澄清
// 5. 向用户确认: "我理解您想要 X，对吗？"

// ========== Phase 1-4: 技术实现 ==========

// 6. 创建任务链
TaskCreate({ subject: "设计数据库 Schema", ... })
TaskCreate({ subject: "实现后端 API", ... })
TaskCreate({ subject: "实现前端 UI", ... })
TaskCreate({ subject: "编写测试（覆盖率 90%+）", ... })

TaskUpdate({ taskId: "2", addBlockedBy: ["1"] })
TaskUpdate({ taskId: "3", addBlockedBy: ["2"] })

// 7. 生成技术团队
Task({
  description: "数据库设计",
  prompt: `你是 database-designer。

## 用户原始需求
"我想做一个用户登录功能"

## 需求澄清结果
<product-owner 确认的需求>

## 任务
设计用户表，支持登录功能

## 输出
1. Schema 设计
2. 迁移脚本
3. 用户友好说明："数据存储结构，用于保存用户账号信息"`,
  subagent_type: "Plan",
  name: "database-designer",
  team_name: "feature-user-login"
})

Task({
  description: "后端开发",
  prompt: `你是 backend-developer。

## 用户原始需求
"我想做一个用户登录功能"

## 任务
实现登录 API

## 用户视角原则
1. 完成后说明：实现了用户登录验证功能
2. 考虑用户可能的各种输入情况

## 测试要求
覆盖率 90%+`,
  subagent_type: "general-purpose",
  name: "backend-dev",
  team_name: "feature-user-login"
})

Task({
  description: "前端开发",
  prompt: `你是 frontend-developer。

## 用户原始需求
"我想做一个用户登录功能"

## 任务
实现登录界面

## 用户视角原则
1. 界面简洁易懂
2. 错误提示用户友好
3. 说明：用户可以输入账号密码登录`,
  subagent_type: "general-purpose",
  name: "frontend-dev",
  team_name: "feature-user-login"
})

Task({
  description: "测试工程师",
  prompt: `你是 test-engineer。

## 任务
编写登录功能测试

## 测试目标
- 覆盖率 90%+
- 覆盖所有用户场景

## 用户场景测试
1. 正常登录
2. 密码错误
3. 账号不存在
4. 网络错误`,
  subagent_type: "Bash",
  name: "test-engineer",
  team_name: "feature-user-login"
})

// ========== Phase 5: 定期汇报 ==========

// 每 30 分钟向 product-owner 汇报
SendMessage({
  recipient: "product-owner",
  content: `# 进度报告

## 已完成
- 数据库设计 ✅
- 后端 API ✅

## 进行中
- 前端界面（预计 15 分钟）

## 下一步
- 测试
- 用户验收`,
  summary: "进度汇报"
})

// ========== Phase 6: 结果整合 ==========

// product-owner 确认方向
SendMessage({
  recipient: "product-owner",
  content: `技术实现已完成，请确认是否符合用户需求方向。

已完成:
- 用户可以输入账号密码登录
- 登录后跳转到首页
- 支持记住登录状态

是否可以进入用户验收？`,
  summary: "请确认方向"
})

// ========== Phase 7: 用户验收 ==========

Task({
  description: "用户验收",
  prompt: `你是 qa-verifier。

## 用户原始需求
"我想做一个用户登录功能"

## 验收清单
- [ ] 用户可以输入账号密码登录？
- [ ] 登录错误时有友好提示？
- [ ] 登录后跳转正确？
- [ ] 有用户使用说明？

## 输出
验收报告`,
  subagent_type: "general-purpose",
  name: "qa-verifier",
  team_name: "feature-user-login"
})

// 向用户展示成果
SendMessage({
  type: "message",
  recipient: "product-owner",
  content: `# 功能完成

## 您可以使用的功能
1. **用户登录**: 输入账号和密码，点击登录按钮即可
2. **记住登录**: 勾选后下次自动登录
3. **密码错误提示**: 输入错误会提示"账号或密码错误"

## 使用方法
1. 打开登录页面
2. 输入您的账号和密码
3. 点击"登录"按钮

是否符合您的预期？`,
  summary: "功能完成，请确认"
})

// ========== Phase 8: 交付 ==========

// 生成用户使用指南
Write("用户登录功能使用指南.md", `
# 用户登录功能使用指南

## 这个功能是什么
让用户可以通过账号密码登录系统。

## 如何使用
1. 打开登录页面
2. 输入账号
3. 输入密码
4. 点击"登录"按钮

## 常见问题
Q: 忘记密码怎么办？
A: 点击"忘记密码"链接，按提示操作

Q: 登录失败怎么办？
A: 检查账号密码是否正确，注意大小写
`)
```

### 3.2 问题排查（完整流程）

**用户输入**: "网站打开很慢，帮我看看"

```javascript
// ========== Phase 0: 了解情况 ==========

TeamCreate({
  team_name: "debug-slow-website",
  description: "排查网站打开慢的问题"
})

Task({
  description: "生成产品负责人",
  prompt: `你是 product-owner。

## 用户问题
"网站打开很慢，帮我看看"

## 你的任务
1. 了解具体情况
   - 什么时候开始慢的？
   - 哪个页面慢？
   - 多慢？
2. 向用户确认问题

## 澄清问题
- "是所有页面都慢，还是特定页面？"
- "大概要多久才能打开？"
- "最近有改过什么吗？"

## 输出
问题描述 + 用户期望`,
  subagent_type: "general-purpose",
  name: "product-owner",
  team_name: "debug-slow-website"
})

// ========== Phase 1-4: 排查和修复 ==========

Task({
  description: "Bug 猎人 A",
  prompt: `你是 bug-hunter。

问题: 网站打开很慢
探索方向: 数据库查询相关

发现线索立即分享！
用简单语言说明发现。`,
  subagent_type: "Explore",
  name: "bug-hunter-a",
  team_name: "debug-slow-website"
})

Task({
  description: "Bug 猎人 B",
  prompt: `你是 bug-hunter。

问题: 网站打开很慢
探索方向: 前端资源加载

发现线索立即分享！
用简单语言说明发现。`,
  subagent_type: "Explore",
  name: "bug-hunter-b",
  team_name: "debug-slow-website"
})

// 根因确定后
Task({
  description: "修复实现",
  prompt: `你是 fix-implementer。

根因: <已确定>
任务: 修复 + 回归测试

修复后说明:
- 修复了什么问题
- 对用户的影响`,
  subagent_type: "general-purpose",
  name: "fix-implementer",
  team_name: "debug-slow-website"
})

// ========== Phase 7: 向用户说明 ==========

SendMessage({
  recipient: "product-owner",
  content: `# 问题已解决

## 问题原因
数据库查询没有使用索引，导致查询很慢。

## 解决方案
添加了数据库索引。

## 效果
页面加载速度从 10 秒降低到 1 秒以内。

## 对您的影响
现在网站打开应该很快了，您可以试试看。`,
  summary: "问题已解决"
})
```

---

## 4. 技术工作流

### 4.1 代码审查（纯技术任务）

```javascript
TeamCreate({
  team_name: "review-pr123",
  description: "审查 PR #123"
})

Task({
  description: "安全审查",
  prompt: `你是 security-reviewer。
审查 PR #123 的安全问题。
发现问题用简单语言说明影响。`,
  subagent_type: "Explore",
  name: "security-reviewer",
  team_name: "review-pr123"
})

Task({
  description: "代码审查",
  prompt: `你是 code-reviewer。
审查 PR #123 的代码质量。
覆盖率要求: 90%+`,
  subagent_type: "Explore",
  name: "code-reviewer",
  team_name: "review-pr123"
})

Task({
  description: "测试审查",
  prompt: `你是 test-coverage-reviewer。
检查测试覆盖率（目标 90%+）`,
  subagent_type: "Bash",
  name: "test-reviewer",
  team_name: "review-pr123"
})

SendMessage({
  type: "broadcast",
  content: "审查开始 - PR #123",
  summary: "审查开始"
})
```

---

## 5. 失败恢复

### 5.1 需求偏离处理

```javascript
SendMessage({
  recipient: "product-owner",
  content: `[需求偏离警告]

技术实现发现：
当前方案可能无法满足用户期望的 X 功能。

原因: <具体原因>
建议: <替代方案>

是否需要:
1. 调整技术方案？
2. 向用户确认期望？`,
  summary: "需求偏离警告"
})
```

### 5.2 用户不满意处理

```javascript
// 收集问题
SendMessage({
  recipient: "product-owner",
  content: `[验收不通过]

用户反馈:
- <问题1>
- <问题2>

建议处理:
1. <方案1>
2. <预计时间>

请确认调整方向。`,
  summary: "验收不通过"
})

// 调整后重新验收
```

---

## 故障排除速查

| 问题 | 解决方案 |
|------|----------|
| 用户描述模糊 | product-owner 澄清需求 |
| 需求偏离 | 报告 product-owner，向用户确认 |
| 用户不满意 | 收集问题 → 调整 → 重新验收 |
| 成员生成失败 | 更换 agent 类型 → 简化角色 |
| 任务超时 | 提醒 → 创建替代成员 |
