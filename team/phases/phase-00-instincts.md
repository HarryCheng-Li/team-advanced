# Phase 0: 查询 Instincts

## 目标

在任务开始前，检查是否有历史经验可以复用，避免重复错误。

## STATE VARIABLES

| 变量名 | 描述 | 来源 |
|--------|------|------|
| `{matched_instincts}` | 匹配的 instincts 列表 | 本 Phase |
| `{instinct_confidence}` | 经验复用置信度 | 本 Phase |

## 触发条件

**所有 `/team` 任务开始前**，无例外。

## 执行步骤

### Step 1: 分析任务类型

```javascript
// 从用户输入识别任务类型
const taskTypes = identifyTaskTypes(userInput);
// 可能的类型: debugging, coding-style, testing, git, workflow, architecture
```

### Step 2: 查询匹配的 Instincts

```javascript
const matchedInstincts = queryInstincts({
  task: userInput,
  types: ['debugging', 'coding-style', 'testing', 'git', 'workflow'],
  minConfidence: 0.7  // 只应用高置信度的经验
});
```

### Step 3: 应用高置信度 Instincts

```yaml
置信度规则:
  0.7-0.8: 提示用户，建议采纳
  0.8-0.9: 自动应用，告知用户
  0.9+: 直接应用，无需确认
```

### Step 4: 输出结果

```text
[Instinct 命中] 发现 N 条相关经验
- {trigger} → {solution} (置信度: {confidence})
```

## 输出格式

```markdown
# Instinct 查询结果

## 匹配的经验 (X 条)

| ID | 触发条件 | 解决方案 | 置信度 | 使用次数 |
|----|----------|----------|--------|----------|
| instinct-001 | ... | ... | 0.85 | 5 |

## 建议采纳
- [ ] 经验 A: ...
- [ ] 经验 B: ...

## 自动应用
- 经验 C 已自动应用
```

## NEXT STEP

完成本 Phase 后，加载: `phases/phase-01-due-diligence.md`

## 相关参考

- **持续学习系统**: [references/continuous-learning.md](../references/continuous-learning.md)
- **Instinct 进化**: [references/instinct-evolution.md](../references/instinct-evolution.md)
