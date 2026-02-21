# Phase 2: 需求澄清

## 目标

结合尽调结果，确保理解用户的真实需求。**所有模式必须执行**。

## STATE VARIABLES

| 变量名 | 描述 | 来源 |
|--------|------|------|
| `{due_diligence_report}` | 尽调报告 | Phase 1 |
| `{clarified_requirements}` | 澄清后的需求 | 本 Phase |
| `{acceptance_criteria}` | 验收标准 | 本 Phase |
| `{user_type}` | 用户类型 | 本 Phase |
| `{locked_requirements}` | 锁定的需求 | 本 Phase |

## 触发条件

Phase 1 尽调完成后

## 模式差异

| 模式 | Interview 轮数 | 输出 |
|------|----------------|------|
| 快速 | 最多 3 轮 | 简化需求文档 |
| 标准 | 5-10 轮 | 完整需求文档 |
| 完整 | 完整 + 文档 | 需求规格说明书 |

## 执行步骤

### Step 1: 用户类型检测

```javascript
const userType = detectUserType(userInput);

// 技术关键词检测（40+关键词）
const techKeywords = [
  'API', 'REST', 'GraphQL', '微服务', '数据库', 'SQL',
  'Docker', 'K8s', 'TypeScript', 'React', 'Vue', ...
];

if (matchedKeywords >= 3) {
  userType = 'technical';
  // 直接进入技术讨论
} else {
  userType = 'non-technical';
  // 启动盲点问题流程
}
```

### Step 2: 启动 Interview

```javascript
Skill({
  skill: "interview-skills",
  args: `--mode feature --input ${due_diligence_report} ${mode === 'quick' ? '--quick' : ''}`
});
```

### Step 3: 用户类型策略分支

| 用户类型 | 策略 | 问题重点 |
|----------|------|----------|
| 技术用户 | 直接技术讨论 | 架构选型、技术约束、性能要求 |
| 非技术用户 | 盲点问题优先 | 使用场景、成本时间、运营安全、成功标准 |

### Step 4: 非技术用户盲点问题 (11题)

| 类别 | 编号 | 问题 |
|------|------|------|
| 使用场景 | U1-U3 | 目标用户画像、使用场景、典型流程 |
| 成本时间 | C1-C3 | 预算范围、上线时间、现有系统 |
| 运营安全 | O1-O3 | 维护方案、数据合规、用户量级 |
| 成功标准 | S1-S2 | 成功定义、竞品参考 |

### Step 5: 结合尽调结果提问

示例问题：
- "尽调发现有 A、B、C 三个开源方案，它们分别适合 X、Y、Z 场景，你的使用场景更接近哪个？"
- "这几个方案的技术栈分别是 X、Y，你的环境是否兼容？"

### Step 6: 需求锁定

```yaml
需求锁定三阶段:
  Stage 1: 捕获 (Capture)
    - 逐字记录用户原始需求
  Stage 2: 确认 (Confirm)
    - 向用户复述并确认理解
  Stage 3: 守护 (Guard)
    - 监控任何修改，触发警报
```

## 输出格式

```markdown
# 需求澄清文档

## 用户原始需求
> "{逐字记录}"

## 用户类型
{technical/non-technical}

## 澄清后需求
{详细描述}

## 验收标准
- [ ] 标准 1
- [ ] 标准 2
- [ ] 标准 3

## 需求指纹
```json
{
  "original": "...",
  "clarified": "...",
  "locked_at": "2026-02-20T10:00:00Z",
  "confidence": 0.95
}
```

## 技术约束
- {约束1}
- {约束2}

## 非目标
- {明确排除的内容}
```

## NEXT STEP

- 快速模式: 直接跳转到 `phases/phase-05-execution.md`
- 标准/完整模式: 加载 `phases/phase-03-deep-search.md`

## 相关参考

- **需求锁定**: [references/specification-lock.md](../references/specification-lock.md)
- **用户类型检测**: [references/user-type-detection.md](../references/user-type-detection.md)
- **非技术用户模式**: [references/non-technical-user-mode.md](../references/non-technical-user-mode.md)
