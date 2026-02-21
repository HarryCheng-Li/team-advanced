# Team Skill 架构设计

> 版本: 6.0.0 | 更新时间: 2026-02-20

本文档描述 Team Skill 的整体架构、数据流和模块依赖关系。

---

## 架构概览

### 系统架构图

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Team Skill 系统                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      用户接口层                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │  /team 命令  │  │  --party    │  │  --quick / --full   │  │   │
│  │  │             │  │  模式       │  │  模式               │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      协调控制层                              │   │
│  │  ┌─────────────────────────────────────────────────────┐   │   │
│  │  │              Coordinator (协调者)                    │   │   │
│  │  │  - 需求分析    - 团队创建    - 任务分配    - 进度监控 │   │   │
│  │  └─────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│              ┌───────────────┼───────────────┐                      │
│              ▼               ▼               ▼                      │
│  ┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐           │
│  │   Supervisor    │ │   Phase     │ │   Hook System   │           │
│  │   (监督者)       │ │   Engine    │ │                 │           │
│  │  每30秒健康检查  │ │  8阶段流程   │ │  事件钩子       │           │
│  └─────────────────┘ └─────────────┘ └─────────────────┘           │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      执行层 (Agent Team)                     │   │
│  │                                                             │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │   │
│  │  │  用户服务层   │  │  技术执行层   │  │  研究层       │      │   │
│  │  │  product-    │  │  architect   │  │  tech-scout  │      │   │
│  │  │  owner       │  │  tech-lead   │  │  repo-analyst│      │   │
│  │  │  user-       │  │  backend-dev │  │              │      │   │
│  │  │  translator  │  │  frontend-dev│  │              │      │   │
│  │  │  qa-verifier │  │  db-designer │  │              │      │   │
│  │  │              │  │  test-engineer│  │              │      │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘      │   │
│  │                                                             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                      │
│                              ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                      基础设施层                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │   │
│  │  │ Task     │ │ SendMessage│ │ Health   │ │ Resource     │   │   │
│  │  │ System   │ │ System   │ │ Check    │ │ Monitor      │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │   │
│  │  │ Saga     │ │ Memory   │ │ Party    │ │ Customization│   │   │
│  │  │ Executor │ │ System   │ │ Mode     │ │ System       │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 核心组件

### 1. Coordinator (协调者)

**职责:**
- 解析用户输入，确定任务类型和规模
- 创建和配置 Agent Team
- 派发任务给合适的 Agent
- 监控整体进度
- 整合结果并汇报给用户

**状态机:**
```
INIT → DISPATCHING → WAITING → VALIDATING → DONE
              │          │
              ▼          ▼
           CHECKING (健康检查)
              │
   ┌──────────┼──────────┐
   ▼          ▼          ▼
CONTINUE    ASSIST     RESTART
```

**关键代码位置:**
- Persona 定义: `personas/coordinator.md`
- 主逻辑: `SKILL.md`

### 2. Supervisor (监督者)

**职责:**
- 每 30 秒检查所有 Executor 状态
- 检测异常（空闲、卡住、错误、MCP 超时）
- 诊断问题原因
- 向 Coordinator 报告重大问题

**健康检查流程:**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  被动检测    │────▶│  消息检查    │────▶│  MCP 检查   │
│ (输出分析)   │     │ (超时检查)   │     │ (卡住检测)  │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  异常处理    │
                                        │ - CONTINUE  │
                                        │ - ASSIST    │
                                        │ - RESTART   │
                                        └─────────────┘
```

**关键代码位置:**
- Persona 定义: `personas/supervisor.md`
- 实现: `hooks/health-check.js`

### 3. Phase Engine (阶段引擎)

**8 阶段执行流程:**

| Phase | 名称 | 职责 | 输出 |
|-------|------|------|------|
| 0 | Instincts | 查询历史经验 | 经验建议 |
| 1 | Due Diligence | 技术尽调 | 调研报告 |
| 2 | Clarification | 需求澄清 | 需求文档 |
| 3 | Deep Search | 深度搜索 | 技术细节 |
| 4 | Architecture | 架构决策 | 架构设计 |
| 5 | Execution | 团队执行 | 代码实现 |
| 5.5 | Verification | 7 阶段验证 | 验证报告 |
| 6 | Acceptance | 用户验收 | 验收报告 |
| 7 | Delivery | 交付说明 | 用户文档 |
| 8 | Learning | 持续学习 | 经验积累 |

**关键代码位置:**
- Phase 文件: `phases/phase-*.md`

---

## 数据流图

### 任务执行数据流

```
用户输入
    │
    ▼
┌─────────────────┐
│  Coordinator    │
│  - 解析任务      │
│  - 确定规模      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Phase Engine   │
│  - 顺序执行      │
│  - 状态管理      │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│Phase 1 │ │Phase 2 │ ...
│尽调    │ │澄清    │
└───┬────┘ └───┬────┘
    │          │
    ▼          ▼
┌─────────────────┐
│   Agent Team    │
│  - 并行执行      │
│  - 协作完成      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Supervisor    │
│  - 监控状态      │
│  - 检测异常      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Coordinator   │
│  - 整合结果      │
│  - 汇报用户      │
└────────┬────────┘
         │
         ▼
      交付结果
```

### 消息系统数据流

```
Sender Agent
    │
    │ sendMessage()
    ▼
┌─────────────────┐
│  Message Queue  │
│  (JSON File)    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Health Check   │
│  - 状态追踪      │
│  - 超时检测      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Receiver Agent │
│  - 接收消息      │
│  - 发送确认      │
└────────┬────────┘
         │
         │ acknowledgeMessage()
         ▼
┌─────────────────┐
│  Message Store  │
│  (状态更新)      │
└─────────────────┘
```

---

## 模块依赖图

### 核心模块依赖

```
skills/team/
│
├── SKILL.md
│   ├── personas/coordinator.md
│   ├── personas/supervisor.md
│   ├── references/roles.md
│   └── phases/
│       ├── phase-00-instincts.md
│       ├── phase-01-due-diligence.md
│       ├── phase-02-clarification.md
│       ├── phase-03-deep-search.md
│       ├── phase-04-architecture.md
│       ├── phase-05-execution.md
│       ├── phase-05.5-verification.md
│       ├── phase-06-acceptance.md
│       ├── phase-07-delivery.md
│       └── phase-08-learning.md
│
├── hooks/
│   ├── hooks.json
│   ├── health-check.js
│   │   └── resource-monitor.js
│   ├── saga-executor.js
│   ├── team-created.js
│   ├── team-deleted.js
│   ├── session-start.js
│   └── session-end.js
│
├── references/
│   ├── saga-pattern.md
│   ├── iron-laws.md
│   ├── anti-patterns.md
│   ├── reliability-framework.md
│   ├── resource-monitoring.md
│   └── architecture.md (本文档)
│
├── party-mode/
│   ├── party-mode.md
│   └── discussion-templates.md
│
├── customization/
│   └── customize-schema.yaml
│
└── rules/
    ├── common/
    │   ├── coding-style.md
    │   ├── security.md
    │   └── testing.md
    └── typescript/
        ├── patterns.md
        └── tools.md
```

### Hook 系统依赖

```
hooks.json (配置中心)
    │
    ├── team-created.js
    │   └── health-check.js (启动)
    │       └── resource-monitor.js (启动)
    │
    ├── team-deleted.js
    │   └── health-check.js (停止)
    │       └── resource-monitor.js (停止)
    │
    ├── session-start.js
    │   └── 初始化会话状态
    │
    ├── session-end.js
    │   └── 生成最终报告
    │
    ├── pre-compact.js
    │   └── 压缩历史数据
    │
    └── post-tool-use.js
        └── 记录工具使用
```

---

## 状态管理

### 团队状态存储

```
~/.claude/tasks/{team-name}/
│
├── team-config.json          # 团队配置
│
├── {agent-id}.state.json     # Agent 状态 (每个成员一个)
│   ├── status: working|idle|completed|error
│   ├── progress: 0-100
│   ├── lastUpdate: timestamp
│   └── errorCount: number
│
├── message-queue.json        # 消息队列
│   └── [{id, type, sender, receiver, content, timestamp}]
│
├── message-store.json        # 消息存储 (完整历史)
│   └── {messages: [...], timestamp}
│
├── health-report.json        # 健康报告
│   └── {members: [...], summary: {...}, timestamp}
│
├── resource-report.json      # 资源报告
│   └── {tokenStats: {...}, mcpStats: {...}, budget: {...}}
│
└── passive-check-log.jsonl   # 被动检测日志
    └── 每行一个检测记录
```

### 状态流转

#### Agent 状态

```
registered ──▶ working ──▶ completed
                  │
                  ▼
               idle ◀──▶ error
                  │
                  ▼
            terminating ──▶ terminated
```

#### 消息状态

```
PENDING ──▶ SENT ──▶ DELIVERED ──▶ ACKNOWLEDGED
   │          │           │
   ▼          ▼           ▼
FAILED    EXPIRED    (timeout)
```

#### Saga 状态

```
pending ──▶ running ──▶ succeeded
               │
               ▼
            failed
               │
               ▼
         compensating ──▶ compensated
               │
               ▼
      compensation_failed
```

---

## 可靠性设计

### 三角色架构

```
┌─────────────────────────────────────────┐
│           Coordinator (协调者)           │
│         - 只协调，不执行                 │
│         - 成员未完成不输出               │
└─────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌─────────────────┐   ┌─────────────────┐
│  Executor (执行) │   │ Supervisor (监督)│
│  - 完成任务      │◀─▶│ - 每30秒检查     │
│  - 报告进度      │   │ - 检测异常       │
└─────────────────┘   └─────────────────┘
```

### 可靠性保障机制

| 机制 | 实现 | 作用 |
|------|------|------|
| 健康检查 | health-check.js | 每 30 秒监控成员状态 |
| 消息确认 | message-store.json | 确保消息送达 |
| MCP 超时检测 | passive + active | 检测并处理卡住 |
| 强制终止 | forceTerminate() | 重启异常成员 |
| Saga 事务 | saga-executor.js | 保证操作原子性 |
| 资源监控 | resource-monitor.js | 预算和 Token 控制 |

---

## 扩展性设计

### 角色扩展

```yaml
# 添加新角色步骤:
1. 创建 persona 文件: personas/{category}/{role-name}.md
2. 更新角色索引: references/roles.md
3. (可选) 添加到 customize-schema.yaml
```

### Phase 扩展

```yaml
# 添加新 Phase 步骤:
1. 创建 phase 文件: phases/phase-{NN}-{name}.md
2. 更新 SKILL.md 中的 Phase 表格
3. 在 Coordinator 逻辑中添加调用
```

### Hook 扩展

```yaml
# 添加新 Hook 步骤:
1. 创建 hook 文件: hooks/{hook-name}.js
2. 注册到 hooks.json
3. 在触发点调用
```

---

## 性能考虑

### 瓶颈分析

| 组件 | 潜在瓶颈 | 优化方案 |
|------|----------|----------|
| 健康检查 | 成员过多 | 分层监控，降低频率 |
| 消息系统 | 队列阻塞 | 批量处理，超时丢弃 |
| MCP 调用 | 网络延迟 | 并发控制，缓存结果 |
| 状态存储 | 文件 IO | 内存缓存，批量写入 |

### 扩展策略

1. **水平扩展**: 多个子团队并行
2. **分层监控**: 全局 + 子团队 Supervisor
3. **异步处理**: 非关键操作异步执行
4. **数据分区**: 按团队隔离状态

---

## 安全设计

### 权限控制

```
Coordinator: 团队管理、任务分配
Supervisor:  只读监控、发送消息
Executor:    只执行分配的任务
```

### 数据隔离

```
~/.claude/tasks/{team-name}/
├── 每个团队独立目录
├── 文件权限控制
└── 敏感数据加密 (可选)
```

---

## 相关文档

- [SKILL.md](../SKILL.md) - 主要技能文档
- [Persona 系统](../personas/) - 角色定义
- [Phase 系统](../phases/) - 阶段流程
- [Hook 系统](../hooks/) - 事件钩子
- [Saga 模式](./saga-pattern.md) - 事务管理
- [可靠性框架](./reliability-framework.md) - 可靠性设计

---

*本文档由 Team Skill 维护，最后更新: 2026-02-20*
