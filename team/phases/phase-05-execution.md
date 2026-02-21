# Phase 5: 团队执行

## 目标

合并执行：生成成员 + 任务分配 + 结果整合。

## STATE VARIABLES

| 变量名 | 描述 | 来源 |
|--------|------|------|
| `{architecture_type}` | 架构选择 | Phase 4 |
| `{selected_roles}` | 选定的角色 | Phase 4 |
| `{team_name}` | 团队名称 | Phase 4 |
| `{execution_results}` | 执行结果 | 本 Phase |
| `{progress_reports}` | 进度报告集合 | 本 Phase |

## 触发条件

- Phase 4 架构决策完成后
- 快速模式：Phase 2 直接跳转

## 模式差异

| 模式 | 执行方式 | 监控频率 |
|------|----------|----------|
| 快速 | 单 Agent 直接执行 | 无 |
| 标准 | 多 Agent 协作 | 60秒 |
| 完整 | 多 Agent + 冗余验证 | 30秒 |

## 执行步骤

### Step 1: 生成用户服务角色（面向用户任务必须）

```javascript
// product-owner（必须有）
Task({
  description: "生成产品负责人",
  prompt: `你是 product-owner (Mary)。

## 用户原始需求
"${userInput}"

## 你的角色
你是用户的代表。确保团队的产出符合用户的真实需求。

## 人格定义
- 名称: Mary Chen
- 背景: 10年产品管理经验
- 沟通风格: 专业但有同理心

## 核心职责
1. 理解用户真实意图
2. 翻译需求为技术任务
3. 定义验收标准
4. 监控方向不偏离
5. 汇报进度（用简单语言）
6. 最终验收`,
  subagent_type: "general-purpose",
  model: "sonnet",
  name: "product-owner",
  team_name: teamName,
  max_turns: 150
})
```

### Step 2: 生成技术团队成员

按角色配置生成成员，加载对应的 Persona：

| 角色 | 模型 | Persona 文件 |
|------|------|--------------|
| backend-developer | sonnet | personas/technical/backend-developer.md |
| frontend-developer | sonnet | personas/technical/frontend-developer.md |
| architect | opus | personas/technical/architect.md |
| ... | ... | ... |

### Step 3: 创建任务链

```javascript
// 创建任务
TaskCreate({
  subject: "设计数据库 Schema",
  description: "根据需求设计用户表结构",
  activeForm: "设计数据库中"
})

// 设置依赖关系
TaskUpdate({
  taskId: "2",
  addBlockedBy: ["1"],
  metadata: { priority: "P0" }
})
```

### Step 4: Supervisor 监控（标准/完整模式）

```yaml
健康检查:
  frequency: 30s
  checks:
    - progress_stale: 进度超过 2 分钟未更新 → 发送询问
    - idle_too_long: 空闲超过 2 分钟 → 诊断问题
    - error_count: 错误次数过多 → 分析是否需要帮助
    - quality_check: 50% 进度时检查质量

决策类型:
  - CONTINUE: 继续等待
  - ASSIST: 提供帮助/新增协作成员
  - RESTART: 中止当前成员，派发接替者
  - REPLAN: 重新规划任务
```

### Step 5: 结果整合

1. 收集所有成员结果
2. product-owner 确认是否符合用户需求
3. 整合为统一输出

## 进度报告格式

```markdown
# 进度报告

## 状态
- overall: {working|idle|blocked|complete}
- progress_percent: {0-100}

## 已完成
- {task_1} ✅
- {task_2} ✅

## 进行中
- {task_3} (预计 {eta} 分钟)

## 问题
- {issue_1}
- {issue_2}

## 下一步
- {next_step}
```

## 3-Strike 错误协议

```
ATTEMPT 1: 诊断与修复
  → 仔细阅读错误信息
  → 识别根因
  → 针对性修复

ATTEMPT 2: 替代方案
  → 同样错误？尝试不同方法
  → 不同工具？不同库？

ATTEMPT 3: 更广泛的重思
  → 质疑假设
  → 搜索解决方案

AFTER 3 FAILURES: 上报 Coordinator
  → 解释尝试了什么
  → 分享具体错误
```

## NEXT STEP

完成本 Phase 后，加载: `phases/phase-05.5-verification.md`

## 相关参考

- **协作规则**: [references/collaboration-rules.md](../references/collaboration-rules.md)
- **铁律**: [references/iron-laws.md](../references/iron-laws.md)
- **Supervisor Agent**: [templates/supervisor-agent.md](../templates/supervisor-agent.md)
