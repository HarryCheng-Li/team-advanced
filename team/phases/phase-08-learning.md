# Phase 8: 持续学习

## 目标

从任务执行中积累经验，避免重复错误。

## STATE VARIABLES

| 变量名 | 描述 | 来源 |
|--------|------|------|
| `{task_summary}` | 任务总结 | 本 Phase |
| `{new_instincts}` | 新增的 instincts | 本 Phase |
| `{lessons_learned}` | 经验教训 | 本 Phase |
| `{evolution_candidates}` | 进化候选 | 本 Phase |

## 触发条件

**所有任务完成后**

## 执行步骤

### Step 1: 收集学习素材

```yaml
收集来源:
  - 错误解决方案
  - 用户修正
  - 最佳实践发现
  - 效率提升技巧
  - 新发现的技术方案
```

### Step 2: 提取 Instincts

```javascript
// 从任务中提取可复用的经验
const newInstincts = extractInstincts({
  task: taskSummary,
  errors: errorLog,
  solutions: solutionLog,
  userFeedback: userFeedback
});
```

**Instinct 格式**：

```yaml
id: instinct-20260220-001
type: debugging | coding-style | testing | git | workflow
trigger: "触发条件描述"
solution: "解决方案或建议"
confidence: 0.7
created: "2026-02-20"
useCount: 0
```

### Step 3: 置信度规则

| 置信度 | 含义 | 处理 |
|--------|------|------|
| 0.3-0.4 | 首次发现 | 需确认后存储 |
| 0.5-0.6 | 验证过 1-2 次 | 可应用，提示用户 |
| 0.7-0.8 | 验证过 3+ 次 | 直接应用，告知用户 |
| 0.9+ | 从未失败 | 直接应用，无需确认 |

### Step 4: 记录经验教训

```markdown
# 经验教训记录

## 任务信息
- 任务类型: {type}
- 开始时间: {start_time}
- 结束时间: {end_time}
- 实际耗时: {duration}

## 成功经验
1. {success_1}
2. {success_2}

## 遇到的问题
| 问题 | 原因 | 解决方案 |
|------|------|----------|
| {problem} | {cause} | {solution} |

## 效率提升
- {improvement_1}
- {improvement_2}

## 用户反馈
- 正面: {positive_feedback}
- 改进: {improvement_feedback}
```

### Step 5: 评估进化候选

当相关 instincts 积累到一定数量后，可进化为更高级形式：

| 进化方向 | 条件 | 产出 |
|----------|------|------|
| **Command** | 用户显式调用，有明确触发器 | `/command create-api` |
| **Skill** | 模式匹配自动触发 | 自动检测并修复 |
| **Agent** | 复杂多步骤，需要专门上下文 | 代码审查 Agent |

```javascript
// 检查是否满足进化条件
if (relatedInstincts.length >= 5 && successRate >= 0.9) {
  // 建议进化
  suggestEvolution({
    type: 'skill',
    instincts: relatedInstincts,
    suggestedName: 'auto-fix-typescript-errors'
  });
}
```

### Step 6: 更新组织记忆库

```yaml
记忆库更新:
  Episode Memory:
    - 本次任务的完整记录
    - 关键决策和原因

  Semantic Memory:
    - 新学到的概念和关系
    - 技术方案知识

  Procedural Memory:
    - 新发现的流程和步骤
    - 效率提升方法
```

## 输出格式

```markdown
# 持续学习报告

## 任务总结
- 任务: {task_name}
- 状态: 成功
- 耗时: {duration}
- 参与角色: {roles}

## 新增 Instincts (X 条)

| ID | 类型 | 触发条件 | 置信度 |
|----|------|----------|--------|
| instinct-001 | debugging | ... | 0.7 |

## 经验教训
1. {lesson_1}
2. {lesson_2}

## 进化建议
- {instinct_group} 可进化为 {skill/command/agent}

## 记忆库更新
- Episode: {episode_id}
- Semantic: {semantic_updates}
- Procedural: {procedural_updates}
```

## 相关命令

| 命令 | 描述 |
|------|------|
| `/evolve` | 触发 Instinct 进化流程 |
| `/instincts` | 列出所有 instincts |
| `/instincts <category>` | 列出特定类别的 instincts |
| `/devolve <name>` | 将 command/skill/agent 恢复为 instincts |
| `/merge <name1> <name2>` | 合并两个进化产物 |

## 任务完成

本 Phase 是最后一个阶段。任务至此全部完成。

```text
╔══════════════════════════════════════╗
║           TASK COMPLETED             ║
╠══════════════════════════════════════╣
║ 感谢使用 Agent Team 自动化编排系统   ║
║                                      ║
║ 经验已记录，团队已关闭               ║
║ 如需帮助，请使用 /team 命令          ║
╚══════════════════════════════════════╝
```

## 相关参考

- **持续学习**: [references/continuous-learning.md](../references/continuous-learning.md)
- **Instinct 进化**: [references/instinct-evolution.md](../references/instinct-evolution.md)
- **组织记忆库**: [references/organizational-memory.md](../references/organizational-memory.md)
