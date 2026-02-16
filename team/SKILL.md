---
name: team
version: 2.0.0
description: Agent Team 自动化编排技能。当用户使用 /team 命令或请求创建 Agent Team 时触发。自动分析任务需求，从预定义角色库中选择或创建合适的团队成员，建立高效协作流程，分配任务并监控进度。支持代码审查、功能开发、重构、调试、架构设计等多场景。可调用所有可用的 skills、agents、MCP 服务器。
maturity: established
keywords: [team, agent, orchestration, multi-agent, coordination]
category: development
author: harry
created: 2025-01-01
updated: 2026-02-16
dependencies:
  skills: [interview-skills, github-kb]
  tools: [Task, TaskCreate, SendMessage, Skill]
---

# Agent Team 自动化编排

## 快速启动

### 🎯 我想要一个新功能
```
/team 我想做一个用户登录功能
```
自动流程：技术尽调 → 需求澄清 → 深度搜索 → 架构决策 → 团队执行 → 用户验收 → 交付

### 🔧 我发现有个问题
```
/team 网站打开很慢，帮我看看
```
自动流程：技术尽调 → 问题分析 → 深度搜索 → 定位修复 → 验收确认

### 🚀 我要做一个新项目
```
/team 我想做一个在线商城
```
自动流程：技术尽调 → 需求澄清 → 深度搜索 → 方案对比 → 分阶段开发 → 用户验收

### ⚡ 快速模式
```
/team --quick 帮我加一个按钮
```
快速流程：简化尽调 → 确认需求 → 直接执行 → 交付（跳过复杂流程）

> **适用说明**：代码审查等纯技术任务不需要用户服务角色（product-owner），因为产出对象是技术人员。只有面向非技术用户的任务才需要完整的用户服务层。

---

## 触发条件

- `/team` 或 `/team <任务描述>`
- `/team --quick` 快速模式
- "创建一个 Agent Team"
- "组建团队来解决这个问题"
- 任何明确表示需要多 Agent 协作的请求

---

## 核心原则

1. **用户优先** - 确保产出符合用户真实需求，而非仅仅是技术实现
2. **技术尽调先行** - 所有任务先联网搜索现有方案，避免重复造轮
3. **需求澄清** - 动手前确保理解正确，避免做错方向
4. **模式适配** - 根据任务复杂度自动选择快速/标准/完整模式
5. **用户验收** - 完成后必须从用户角度验收
6. **通俗沟通** - 用用户能理解的语言沟通进度和决策

---

## 模式选择 ⭐ 2026 优化

### 自动判断规则

| 指标 | 快速模式 | 标准模式 | 完整模式 |
|------|----------|----------|----------|
| 预计时间 | < 30分钟 | 1-4小时 | > 4小时 |
| 技术领域 | 单一 | 2-3个 | 多个 |
| 角色数量 | 1个 | 3-5个 | 6+个 |
| 外部集成 | 无 | 可能需要 | 必须 |
| 用户指定 | `--quick` | 默认 | `--full` |

### 判断逻辑

```javascript
function selectMode(userInput) {
  // 用户明确指定
  if (userInput.flags.includes('--quick')) return 'quick';
  if (userInput.flags.includes('--full')) return 'full';

  // 快速模式指标（满足3条即触发）
  const quickIndicators = [
    userInput.estimatedTime < 30,
    userInput.techDomains === 1,
    !userInput.needsMultipleRoles,
    !userInput.needsExternalIntegration,
  ];

  if (quickIndicators.filter(Boolean).length >= 3) return 'quick';
  if (userInput.estimatedTime > 240) return 'full';
  return 'standard';
}
```

### 模式对比

| 维度 | 快速模式 | 标准模式 | 完整模式 |
|------|----------|----------|----------|
| **流程** | 4个Phase | 7个Phase | 7个Phase + 评审 |
| **尽调** | 简化版（Top 3） | 完整版 | 完整版 + 备选 |
| **Interview** | 最多3轮 | 5-10轮 | 完整 + 文档 |
| **团队** | 单Agent | 3-5角色 | 6+角色 + 冗余 |
| **验收** | 简化版 | 标准版 | 多层验收 |
| **预计耗时** | 30分钟 | 2-4小时 | 1-3天 |

---

## 执行流程

### Phase 0: 技术尽调 [所有模式必须]

**目标**：了解现有技术 landscape，让非技术用户站在现有技术肩膀上

**执行者**：`tech-scout`（技术尽调专家）

**触发**：所有 `/team` 任务（无例外）

**模式差异**：
- 快速模式：仅搜索 Top 3 方案，生成简化报告
- 标准/完整模式：完整搜索，生成详细报告

1. **生成 tech-scout**
   ```javascript
   Task({
     description: "技术尽调",
     prompt: `你是 tech-scout（技术尽调专家）。

   ## 用户需求
   "<用户的原始描述>"

   ## 模式
   <quick/standard/full>

   ## 任务
   1. 提取需求关键词（中英文）
   2. 联网搜索现有方案（开源、SaaS、框架、教程）
   ${mode === 'quick' ? '3. 仅保留 Top 3 方案' : '3. 整理所有相关方案'}
   4. 生成尽调报告
   5. 提出待澄清问题

   ## 搜索工具（按优先级使用）
   1. 🔗 **github-kb find** (本地知识库) ← 优先查询本地已有参考
   2. WebSearch / mcp__MiniMax__web_search
   3. mcp__exa__web_search_exa
   4. mcp__zread__search_doc (GitHub 文档搜索)
   5. mcp__exa__get_code_context_exa (代码示例)

   ## 输出格式
   保存到: .claude/plans/due-diligence-<timestamp>.md`,
     subagent_type: "general-purpose",
     name: "tech-scout",
     team_name: "<团队名>"
   })
   ```

2. **尽调报告格式**
   ```markdown
   # 技术尽调报告

   ## 需求关键词
   <从用户描述提取的中英文关键词>

   ## 📦 本地知识库发现（优先展示）
   > 通过 github-kb 查询本地已有的参考项目

   | 仓库名 | 技术栈 | 相关度 | 路径 |
   |--------|--------|--------|------|
   | (如有) | ... | ⭐⭐⭐ | ~/github/xxx |

   ## 🌐 在线资源发现
   | 方案名称 | 类型 | 成熟度 | 优点 | 缺点 | 链接 |
   |----------|------|--------|------|------|------|
   | 方案A | 开源/SaaS/框架 | ⭐⭐⭐⭐ | ... | ... | ... |

   ## 推荐关注
   - **Top 3 方案简述**
   - **关键技术栈**
   - **潜在风险点**

   ## 待澄清问题
   - 方案选择偏好？
   - 预算/时间约束？
   - 是否需要定制开发？
   - 对现有方案的接受程度？

   ## 参考资源
   - 文档链接
   - 教程链接
   - 示例项目
   ```

### Phase 1: 需求澄清 [所有模式必须]

**目标**：结合尽调结果，确保理解用户的真实需求

**输入**：尽调报告（`.claude/plans/due-diligence-<timestamp>.md`）

**模式差异**：
- 快速模式：最多 3 轮问题，简化版输出
- 标准/完整模式：5-10 轮问题，完整输出

1. **触发 Interview（带尽调输入）**
   ```javascript
   Skill({
     skill: "interview-skills",
     args: `--mode feature --input .claude/plans/due-diligence-<timestamp>.md ${mode === 'quick' ? '--quick' : ''}`
   })
   ```

2. **Interview 结合尽调结果提问**
   - "尽调发现有 A、B、C 三个开源方案，它们分别适合 X、Y、Z 场景，你的使用场景更接近哪个？"
   - "这几个方案的技术栈分别是 X、Y，你的环境是否兼容？"
   - "SaaS 方案每月费用 X 元，自建方案需要 Y 工期，你更看重哪个？"

3. **确认理解**
   ```
   向用户确认：
   "基于调研和讨论，我理解您的需求是 X，推荐使用 Y 方案，主要解决 Z 的问题，对吗？"
   ```

### Phase 2: 深度搜索 [标准/完整模式]

**目标**：基于澄清结果深挖技术细节，生成综合分析报告

**触发**：Interview 完成后

**执行者**：`tech-scout`（再次搜索）

**快速模式**：跳过此阶段

1. **深度搜索逻辑**
   ```javascript
   Task({
     description: "深度技术搜索",
     prompt: `你是 tech-scout。

   ## 输入
   - 尽调报告: .claude/plans/due-diligence-<timestamp>.md
   - Interview 澄清结果: <用户选择的方向和细节>

   ## 任务
   1. 基于用户选择的方向，搜索具体实现细节
   2. 搜索选定方案的 API 文档、最佳实践
   3. 搜索潜在坑点和已知问题
   4. 生成综合分析报告

   ## 输出格式
   保存到: .claude/plans/analysis-report-<timestamp>.md`,
     name: "tech-scout",
     ...
   })
   ```

2. **综合分析报告格式**
   ```markdown
   # 综合分析报告

   ## 一、需求文档
   <基于 Interview 澄清的最终需求>

   ## 二、方案对比
   ### 方案A: [名称] ⭐ 推荐
   - **技术栈**: ...
   - **实现复杂度**: 低/中/高
   - **预计工期**: ...
   - **优点**: ...
   - **缺点**: ...
   - **适用场景**: ...

   ## 三、可行性分析
   | 维度 | 评估 | 说明 |
   |------|------|------|
   | 技术可行性 | ✅/⚠️/❌ | ... |
   | 时间成本 | 低/中/高 | ... |
   | 维护成本 | 低/中/高 | ... |
   | 风险级别 | 低/中/高 | ... |

   ## 四、实施建议
   1. ...
   2. ...
   ```

### Phase 3: 架构决策 [标准/完整模式]

**目标**：合并执行：架构选择 + 任务分析 + 团队创建 + 拓扑选择 + 角色选择

**快速模式**：跳过此阶段，直接单 Agent 执行

1. **架构选择（SAS vs MAS）**
   ```javascript
   Task({
     description: "架构选择分析",
     prompt: `你是 architecture-selector。

   ## 综合分析报告
   ${综合分析报告内容}

   ## 分析维度
   1. 预计完成时间（分钟）
   2. 涉及技术领域数量
   3. 是否需要多角色并行探索
   4. 风险级别

   ## 输出
   \`\`\`yaml
   架构选择: <SAS/MAS>
   置信度: <0-1>
   理由: <简要说明>
   \`\`\``,
     subagent_type: "Plan",
     name: "architecture-selector"
   })
   ```

2. **任务分析**

   | 用户描述 | 任务类型 | 优先级 |
   |----------|----------|--------|
   | 想要、做一个、需要 | 功能开发 | P2 |
   | 有问题、很慢、报错 | Bug调试 | P0 |
   | 审查、检查、看看 | 代码审查 | P1 |
   | 设计、规划、架构 | 架构设计 | P2 |

3. **团队创建 + 拓扑选择 + 角色选择**

   **拓扑模式**：
   | 拓扑 | 适用场景 |
   |------|----------|
   | **星型** | 功能开发、统一协调 |
   | **网状** | 架构设计、方案讨论 |
   | **流水线** | 标准化流程 |
   | **竞技场** | 方案对比、代码审查 |

   **角色选择**：
   | 任务类型 | 技术角色 |
   |----------|----------|
   | 代码审查 | security-reviewer + code-reviewer + test-coverage-reviewer |
   | Bug调试 | bug-hunter(2) + fix-implementer |
   | 功能开发 | database-designer + backend-dev + frontend-dev + test-engineer |
   | 架构设计 | architect + tech-lead + technical-writer |

### Phase 4: 团队执行 [标准/完整模式]

**目标**：合并执行：生成成员 + 任务分配 + 结果整合

**快速模式**：单 Agent 直接执行

1. **生成团队成员**
   ```javascript
   // 用户服务角色（面向用户任务必须有）
   Task({
     description: "生成产品负责人",
     prompt: `你是 product-owner。
   ## 用户原始需求
   "<用户的原始描述>"
   ## 综合分析报告
   <读取 .claude/plans/analysis-report-<timestamp>.md>
   ## 职责
   1. 确保所有决策不偏离用户原始需求
   2. 定期用简单语言向用户汇报进度
   3. 最终验收时确认是否符合预期`,
     subagent_type: "general-purpose",
     name: "product-owner",
     team_name: "<团队名>"
   })
   ```

2. **任务分配与监控**
   ```javascript
   TaskCreate({ subject: "<任务标题>", description: "<详细描述>", activeForm: "<进行中>" })
   TaskUpdate({ taskId: "2", addBlockedBy: ["1"], metadata: { priority: "P0" } })
   SendMessage({ type: "message", recipient: "product-owner", content: "进度更新...", summary: "进度汇报" })
   ```

3. **结果整合**
   - 收集所有成员结果
   - product-owner 确认是否符合用户需求
   - 整合为统一输出
   - 质量门禁检查

### Phase 5: 用户验收 [所有模式必须]

**目标**：从用户角度验证产出是否符合预期

1. **用户验收员验收**
   ```javascript
   Task({
     description: "用户验收",
     prompt: `你是 qa-verifier。
   ## 用户原始需求
   "<用户的原始描述>"
   ## 验收清单
   - [ ] 功能是否符合用户描述的场景？
   - [ ] 用户能否理解如何使用？
   - [ ] 是否有用户友好的使用说明？`,
     name: "qa-verifier",
     ...
   })
   ```

2. **向用户展示成果**
   - 用简单语言解释完成了什么
   - 展示功能如何使用

3. **验收结果处理**

   | 验收结论 | 处理方式 |
   |----------|----------|
   | **通过** | 进入 Phase 6 交付 |
   | **不通过** | 收集问题 → 返回修改 → 再次验收 |
   | **有条件通过** | 记录条件 → 修复后直接交付 |

### Phase 6: 交付和说明 [所有模式必须]

**目标**：确保用户能够理解和使用产出

1. **生成交付物**
   - 代码/功能（技术产出）
   - 用户使用指南（通俗语言）
   - 关键决策说明（对用户的影响）

2. **用户友好的说明**
   ```markdown
   # 功能说明
   ## 这个功能是什么
   <用简单语言解释>
   ## 如何使用
   <步骤说明>
   ## 注意事项
   <用户需要注意的点>
   ```

3. **优雅关闭团队**（如有）

---

## 智能联网搜索规则

### 固定绑定（必须执行）

| 阶段 | 快速模式 | 标准/完整模式 |
|------|----------|---------------|
| Phase 0: 技术尽调 | ✅ 简化版 | ✅ 完整版 |
| Phase 2: 深度搜索 | ❌ 跳过 | ✅ 必须 |

### 智能按需触发（执行过程中）

| 场景 | 触发条件 | 搜索内容 |
|------|----------|----------|
| 新框架 | 使用不熟悉的框架 | "[框架名] usage examples" |
| 错误排查 | 遇到报错 | "[错误信息] solution fix" |
| 安全检查 | 审查代码安全 | "[库名] vulnerabilities CVE" |

---

## 流程对比图

```
快速模式（4 Phase）：
Phase 0 → Phase 1 → [直接执行] → Phase 5 → Phase 6
（30分钟）

标准模式（7 Phase）：
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
（2-4小时）

完整模式（7 Phase + 增强）：
Phase 0 → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
         ↑ 完整Interview  ↑ 完整报告  ↑ 多角色  ↑ 多层验收
（1-3天）
```

---

## 可用资源清单

### 用户服务角色（3个）

| 角色 | 用途 | 何时使用 |
|------|------|----------|
| `product-owner` | 代表用户视角、需求翻译、验收决策 | 所有面向用户的任务 |
| `user-translator` | 技术语言翻译、进度报告 | 中等及以上复杂任务 |
| `qa-verifier` | 用户验收、体验测试 | 所有交付前的验收 |

### 技术尽调角色（2个）

| 角色 | 用途 | Agent 类型 | 何时使用 |
|------|------|------------|----------|
| `tech-scout` | 技术尽调、方案调研、深度搜索 | general-purpose | Phase 0 + Phase 2 |
| `repo-analyst` | 分析参考仓库、提取最佳实践 | Explore | Phase 2 深度分析 |

### 技术角色（12个）

| 角色 | 用途 | Agent 类型 |
|------|------|------------|
| `security-reviewer` | 安全审查 | Explore |
| `code-reviewer` | 代码质量 | Explore |
| `test-coverage-reviewer` | 测试覆盖 | Bash |
| `backend-developer` | 后端开发 | GP |
| `frontend-developer` | 前端开发 | GP |
| `database-designer` | 数据库设计 | Plan |
| `test-engineer` | 测试开发 | Bash |
| `architect` | 架构设计 | Plan |
| `tech-lead` | 技术协调 | GP |
| `bug-hunter` | Bug 探索 | Explore |
| `fix-implementer` | 修复实现 | GP |
| `devops-engineer` | 部署运维 | Bash |

---

## 典型场景模板

### 场景1: 快速模式示例

```
用户输入: "/team --quick 帮我加一个登录按钮"

流程:
Phase 0: 简化尽调（发现现成组件库）
Phase 1: 3轮问题确认（按钮位置？样式？）
[直接执行]: 单Agent实现
Phase 5: 简化验收
Phase 6: 交付

耗时: ~30分钟
```

### 场景2: 标准模式示例

```
用户输入: "我想做一个用户登录功能"

流程:
Phase 0: tech-scout 联网尽调（发现 OAuth、JWT、Auth0 等）
Phase 1: Interview 澄清需求
Phase 2: tech-scout 深度搜索
Phase 3: 架构决策 + 角色选择
Phase 4: 团队执行
Phase 5: 用户验收
Phase 6: 交付

耗时: 2-4小时
```

### 场景3: 完整模式示例

```
用户输入: "/team --full 我想做一个在线商城"

流程:
Phase 0: 完整尽调 + 备选方案
Phase 1: 完整 Interview + 文档
Phase 2: 深度搜索 + 技术选型报告
Phase 3: 架构决策 + 6+ 角色
Phase 4: 团队执行 + 冗余验证
Phase 5: 多层验收
Phase 6: 完整交付

耗时: 1-3天
```

---

## 错误处理

### 成员生成失败
```javascript
// 策略1: 更换 Agent 类型
// 策略2: 创建简化版角色
// 策略3: 将任务分配给其他成员
```

### 需求偏离
```javascript
SendMessage({
  type: "message",
  recipient: "product-owner",
  content: `[需求偏离警告] 当前实现可能与用户预期不符。原因: <具体原因>`,
  summary: "需求偏离警告"
})
```

### 尽调搜索失败
```javascript
// 策略1: 更换搜索工具
// 策略2: 调整搜索关键词（中英文）
// 策略3: 降级处理（基于已有知识继续）
```

---

## 详细参考

### 核心参考
- **角色定义**: [references/roles.md](references/roles.md)
- **协作规则**: [references/collaboration-rules.md](references/collaboration-rules.md)
- **执行模板**: [references/execution-workflow.md](references/execution-workflow.md)

### 2026 架构参考
- **架构选择**: [references/architecture-selector.md](references/architecture-selector.md)
- **拓扑模式**: [references/topology-patterns.md](references/topology-patterns.md)
- **可靠性保障**: [references/reliability-framework.md](references/reliability-framework.md)
