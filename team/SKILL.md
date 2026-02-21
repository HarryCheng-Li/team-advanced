---
name: team
version: 6.0.0
description: Agent Team 自动化编排技能。当用户使用 /team 命令或请求创建 Agent Team 时触发。自动分析任务需求，从预定义角色库中选择或创建合适的团队成员，建立高效协作流程，分配任务并监控进度。支持代码审查、功能开发、重构、调试、架构设计等多场景。可调用所有可用的 skills、agents、MCP 服务器。
maturity: established
keywords: [team, agent, orchestration, multi-agent, coordination, reliability, party-mode, personas, phases]
category: development
author: harry
created: 2025-01-01
updated: 2026-02-21
dependencies:
  skills: [interview-skills, github-kb]
  tools: [Task, TaskCreate, SendMessage, Skill]
features:
  - ⭐ v6.0 Step-File 架构 (独立 Phase 文件)
  - ⭐ v6.0 Agent Persona 系统 (角色人格化)
  - ⭐ v6.0 对抗性审查 (强制找问题)
  - ⭐ v6.0 Party Mode (多 Agent 讨论)
  - ⭐ v6.0 定制化系统 (.customize.yaml)
  - ⭐ v6.0 规模自适应 (五级系统)
  - v5.0 三角色架构 (Coordinator/Executor/Supervisor)
  - v5.0 质量优于速度原则
  - v5.0 MCP 超时和强制终止机制
  - 需求锁定机制 (三阶段：捕获、确认、守护)
  - 7阶段增强验证系统 + 置信度量化
  - 组织记忆库 (Episode + Semantic + Procedural)
  - 非技术用户友好模式 (通俗语言 + 可视化)
---

# Agent Team 自动化编排

> **知识地图**: [KNOWLEDGE-MAP.md](KNOWLEDGE-MAP.md) - 完整的文档导航和学习路径
> **文档工具**: `node scripts/doc-navigator.js --topic "关键词"` - 快速查找文档

---

## 如何阅读本文档

### 如果你是新用户
1. 阅读下方的 [快速启动](#快速启动) 章节，5 分钟上手
2. 查看 [核心概念](#核心原则) 理解 Team Skill 的设计理念
3. 跟随 [第一个团队任务](examples/first-team-task.md) 完成实战教程

### 如果你想深入了解
- **角色系统**: 查看 [Agent Persona 系统](#agent-persona-系统-v60) 和 [references/roles.md](references/roles.md)
- **执行流程**: 查看 [执行流程 (8 Phase)](#执行流程-8-phase) 和各 Phase 文件
- **可靠性保障**: 查看 [hooks/health-check.js](hooks/health-check.js) 和 [references/iron-laws.md](references/iron-laws.md)

### 如果你遇到故障
- 查看 [故障排查指南](troubleshooting/health-check-issues.md) - 健康检查问题
- 查看 [消息确认问题](troubleshooting/message-issues.md) - 消息系统问题
- 查看 [性能优化](troubleshooting/performance.md) - 性能调优

### 使用文档导航工具
```bash
# 搜索文档
node ~/.claude/skills/team/scripts/doc-navigator.js --search "health-check"

# 按主题查找
node ~/.claude/skills/team/scripts/doc-navigator.js --topic "message"

# 列出所有文档
node ~/.claude/skills/team/scripts/doc-navigator.js --list

# 显示知识地图
node ~/.claude/skills/team/scripts/doc-navigator.js --map
```

---

## 快速启动

### 🎯 我想要一个新功能
```
/team 我想做一个用户登录功能
```

### 🔧 我发现有个问题
```
/team 网站打开很慢，帮我看看
```

### ⚡ 快速模式
```
/team --quick 帮我加一个按钮
```

### 🎉 Party Mode (多 Agent 讨论)
```
/team --party "Monolith 还是 Microservices?"
```

---

## 触发条件

- `/team` 或 `/team <任务描述>`
- `/team --quick` 快速模式
- `/team --full` 完整模式
- `/team --party "讨论主题"` Party Mode
- "创建一个 Agent Team"
- 任何明确表示需要多 Agent 协作的请求

---

## 核心原则

```
┌─────────────────────────────────────────────────────────────┐
│                    价值观优先级排序                          │
├─────────────────────────────────────────────────────────────┤
│  1. 准确完成  - 任务必须完整、正确地完成                     │
│  2. 质量保证  - 输出必须符合预期标准                         │
│  3. 用户满意  - 用户对结果满意                              │
│  ...                                                        │
│  N. 速度     - 快是好的，但不是首要目标                      │
└─────────────────────────────────────────────────────────────┘

铁律:
  - 不完整的结果 = 没有结果
  - 宁可多等，不可敷衍
  - 问题要解决，不是绕过
  - 成员未完成，绝不输出
```

---

## 规模自适应 (五级系统)

| 级别 | 名称 | Stories | 流程 | 预计时间 |
|------|------|---------|------|----------|
| Level 0 | 快速修复 | 1-2 | Quick Flow | 15-30分钟 |
| Level 1 | 小型任务 | 3-5 | Quick + Tech Spec | 1-2小时 |
| Level 2 | 中型任务 | 6-10 | Standard | 2-4小时 |
| Level 3 | 大型任务 | 11-30 | Full + Party Mode | 1-3天 |
| Level 4 | 企业级 | 30+ | Full + Security + DevOps | 1-2周 |

> **详细参考**: [references/scale-adaptation.md](references/scale-adaptation.md)

---

## 执行流程 (8 Phase)

| Phase | 名称 | 说明 | 文件 |
|-------|------|------|------|
| 0 | 查询 Instincts | 检查历史经验 | [phases/phase-00-instincts.md](phases/phase-00-instincts.md) |
| 1 | 技术尽调 | 联网搜索现有方案 | [phases/phase-01-due-diligence.md](phases/phase-01-due-diligence.md) |
| 2 | 需求澄清 | Interview + 需求锁定 | [phases/phase-02-clarification.md](phases/phase-02-clarification.md) |
| 3 | 深度搜索 | 深挖技术细节 | [phases/phase-03-deep-search.md](phases/phase-03-deep-search.md) |
| 4 | 架构决策 | SAS/MAS + 团队创建 | [phases/phase-04-architecture.md](phases/phase-04-architecture.md) |
| 5 | 团队执行 | 多 Agent 协作 | [phases/phase-05-execution.md](phases/phase-05-execution.md) |
| 5.5 | 7阶段验证 | 质量门禁检查 | [phases/phase-05.5-verification.md](phases/phase-05.5-verification.md) |
| 6 | 用户验收 | 从用户角度验证 | [phases/phase-06-acceptance.md](phases/phase-06-acceptance.md) |
| 7 | 交付说明 | 确保用户能使用 | [phases/phase-07-delivery.md](phases/phase-07-delivery.md) |
| 8 | 持续学习 | 积累经验 | [phases/phase-08-learning.md](phases/phase-08-learning.md) |

---

## 三角色架构 (v5.0)

```
┌─────────────────────────────────────────────────────────────┐
│  Coordinator (协调者)                                        │
│  - 只协调，不执行                                            │
│  - 职责：创建团队、派发任务、整合结果、汇报用户              │
└─────────────────────────────────────────────────────────────┘
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│ Executor (执行者)│◄───────►│ Supervisor (监督者)│
│ - 完成具体任务   │  通信    │ - 每30秒健康检查  │
│ - 每60秒报告进度 │         │ - 检测异常        │
└─────────────────┘         └─────────────────┘
```

> **详细参考**: [personas/coordinator.md](personas/coordinator.md), [personas/supervisor.md](personas/supervisor.md)

---

## Agent Persona 系统 (v6.0)

每个角色都有人格定义，包含：身份、沟通风格、核心原则

| 角色 | 人格名称 | 说明 | Persona 文件 |
|------|----------|------|--------------|
| product-owner | Mary Chen | 用户代表 | [personas/user-service/product-owner.md](personas/user-service/product-owner.md) |
| user-translator | Paige Lin | 技术翻译 | [personas/user-service/user-translator.md](personas/user-service/user-translator.md) |
| qa-verifier | Quinn Zhang | 用户验收 | [personas/user-service/qa-verifier.md](personas/user-service/qa-verifier.md) |
| architect | Winston Lee | 架构设计 | [personas/technical/architect.md](personas/technical/architect.md) |
| tech-lead | John Park | 技术负责人 | [personas/technical/tech-lead.md](personas/technical/tech-lead.md) |
| backend-developer | Amelia Wang | 后端开发 | [personas/technical/backend-developer.md](personas/technical/backend-developer.md) |
| frontend-developer | Alex Kim | 前端开发 | [personas/technical/frontend-developer.md](personas/technical/frontend-developer.md) |
| database-designer | David Chen | 数据库设计 | [personas/technical/database-designer.md](personas/technical/database-designer.md) |
| test-engineer | Tessa Zhang | 测试工程师 | [personas/technical/test-engineer.md](personas/technical/test-engineer.md) |
| tech-scout | Scout | 技术侦察 | [personas/research/tech-scout.md](personas/research/tech-scout.md) |
| repo-analyst | Robin | 仓库分析 | [personas/research/repo-analyst.md](personas/research/repo-analyst.md) |

> **完整角色列表**: [references/roles.md](references/roles.md)

---

## Party Mode (v6.0)

多 Agent 讨论模式，让团队像真人一样讨论问题：

```
Architect: "建议先从 Monolith 开始..."
Product Owner: "同意。Time to Market 更重要..."
Backend Developer: "补充：即使 Monolith 也要设计清晰的模块边界..."
```

**触发方式**:
- 手动: `/team --party "讨论主题"`
- 自动: 检测到架构选型、技术栈选择等重大决策

> **详细参考**: [party-mode/party-mode.md](party-mode/party-mode.md)

---

## 定制化系统 (v6.0)

通过 `.claude/customize.yaml` 自定义 Agent 行为：

```yaml
agents:
  product-owner:
    display_name: "产品经理"
    persona:
      communication_style: "professional_empathetic"
      principles:
        - "User first, always"
      memories:
        - "项目使用 OAuth2 认证"
```

> **详细参考**: [customization/customize-schema.yaml](customization/customize-schema.yaml)

---

## 对抗性审查 (v6.0)

**核心规则**: 必须找到问题。零发现 = 停止，重新分析。

```markdown
## HIGH 严重度
| ID | 位置 | 问题 | 建议 |
|----|------|------|------|
| H-001 | login.ts:47 | No rate limiting | Add rate limiter |
```

> **详细参考**: [references/adversarial-review.md](references/adversarial-review.md)

---

## 详细参考

### v6.0 新增参考
- **Step-File 架构**: [phases/](phases/)
- **Persona 系统**: [personas/](personas/)
- **对抗性审查**: [references/adversarial-review.md](references/adversarial-review.md)
- **Party Mode**: [party-mode/party-mode.md](party-mode/party-mode.md)
- **定制化系统**: [customization/customize-schema.yaml](customization/customize-schema.yaml)
- **规模自适应**: [references/scale-adaptation.md](references/scale-adaptation.md)

### v5.0 核心参考
- **Iron Laws 铁律**: [references/iron-laws.md](references/iron-laws.md)
- **Anti-Patterns 反模式**: [references/anti-patterns.md](references/anti-patterns.md)
- **Findings 系统**: [references/findings-system.md](references/findings-system.md)
- **Systematic Debugging**: [references/systematic-debugging.md](references/systematic-debugging.md)

### 可靠性参考
- **需求锁定**: [references/specification-lock.md](references/specification-lock.md)
- **增强验证**: [references/enhanced-verification.md](references/enhanced-verification.md)
- **角色权限**: [references/role-permission-matrix.md](references/role-permission-matrix.md)
- **通信协议**: [references/communication-protocol.md](references/communication-protocol.md)
- **回滚恢复**: [references/rollback-recovery.md](references/rollback-recovery.md)
- **非技术用户**: [references/non-technical-user-mode.md](references/non-technical-user-mode.md)

### 持续学习
- **持续学习**: [references/continuous-learning.md](references/continuous-learning.md)
- **Instinct 进化**: [references/instinct-evolution.md](references/instinct-evolution.md)
- **组织记忆**: [references/organizational-memory.md](references/organizational-memory.md)

### Hook 系统
- **Hook 配置**: [hooks/hooks.json](hooks/hooks.json)
- **健康检查**: [hooks/health-check.js](hooks/health-check.js) - 每30秒自动监控团队健康
- **资源监控**: [hooks/resource-monitor.js](hooks/resource-monitor.js) - Token/MCP使用监控和成本估算
- **团队创建**: [hooks/team-created.js](hooks/team-created.js) - 自动启动健康检查和资源监控
- **团队删除**: [hooks/team-deleted.js](hooks/team-deleted.js) - 自动停止健康检查和资源监控
- **会话开始**: [hooks/session-start.js](hooks/session-start.js)
- **会话结束**: [hooks/session-end.js](hooks/session-end.js)

### Rules 系统
- **代码风格**: [rules/common/coding-style.md](rules/common/coding-style.md)
- **安全检查**: [rules/common/security.md](rules/common/security.md)
- **TypeScript**: [rules/typescript/patterns.md](rules/typescript/patterns.md)
