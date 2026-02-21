# Phase 6: 用户验收

## 目标

从用户角度验证产出是否符合预期。

## STATE VARIABLES

| 变量名 | 描述 | 来源 |
|--------|------|------|
| `{verification_report}` | 验证报告 | Phase 5.5 |
| `{acceptance_result}` | 验收结果 | 本 Phase |
| `{user_feedback}` | 用户反馈 | 本 Phase |

## 触发条件

**所有模式必须执行**

Phase 5.5 验证完成后

## 执行步骤

### Step 1: 生成 qa-verifier

```javascript
Task({
  description: "用户验收",
  prompt: `你是 qa-verifier (Quinn)。

## 用户原始需求
"${userInput}"

## 验证报告
${verification_report}

## 人格定义
- 名称: Quinn Zhang
- 背景: 质量保证专家
- 沟通风格: 魔鬼代言人，善于发现问题

## 验收清单
- [ ] 功能是否符合用户描述的场景？
- [ ] 用户能否理解如何使用？
- [ ] 是否有用户友好的使用说明？
- [ ] 边界情况是否考虑？`,
  model: "sonnet",
  name: "qa-verifier",
  team_name: teamName
})
```

### Step 2: 向用户展示成果

用简单语言解释：
1. 完成了什么功能
2. 如何使用
3. 有什么变化

### Step 3: 收集用户反馈

```markdown
## 验收问题

### 功能确认
- 这个功能是否解决了您的问题？
- 有没有遗漏的场景？

### 体验确认
- 使用方式是否符合预期？
- 界面/交互是否满意？

### 改进建议
- 还有什么需要调整的吗？
```

### Step 4: 验收结果处理

| 验收结论 | 处理方式 |
|----------|----------|
| **通过** | 进入 Phase 7 交付 |
| **不通过** | 收集问题 → 返回修改 → 再次验收 |
| **有条件通过** | 记录条件 → 修复后直接交付 |

## 输出格式

```markdown
# 用户验收报告

## 验收结论
{通过 / 不通过 / 有条件通过}

## 符合预期的部分
1. {item_1}
2. {item_2}

## 用户视角的问题
| 问题 | 严重度 | 建议 |
|------|--------|------|
| {issue_1} | 高/中/低 | {suggestion} |

## 改进建议
1. {suggestion_1}
2. {suggestion_2}

## 用户签字
- 验收人: {user}
- 时间: {timestamp}
- 状态: {status}
```

## 非技术用户友好验收

对于非技术用户：

```markdown
# 功能完成确认

## 您可以使用的功能

### 1. {功能名称}
- 说明: {用简单语言解释}
- 使用方法: {步骤}

### 2. {功能名称}
- 说明: {用简单语言解释}
- 使用方法: {步骤}

## 请确认
这个功能是否符合您的预期？

[ ] 符合预期，可以交付
[ ] 需要调整（请说明）: ___________
```

## NEXT STEP

完成本 Phase 后：
- 通过 → 加载 `phases/phase-07-delivery.md`
- 不通过 → 返回 Phase 5 修复问题

## 相关参考

- **非技术用户模式**: [references/non-technical-user-mode.md](../references/non-technical-user-mode.md)
- **角色定义**: [references/roles.md](../references/roles.md)
