---
name: interview-skills
version: 2.0.0
description: Multi-round interview skill for deep discovery before implementation. Use when user types /interview or wants to (1) implement a new feature - triggers feature interview, (2) fix a bug - triggers bug diagnosis, (3) explore a technical idea or product concept - triggers think-through mode, or (4) create test workflows - triggers workflow generator. Prevents premature coding by conducting thorough Socratic questioning first. Can accept due diligence report as input for more informed questioning. Supports quick mode for simple tasks.
maturity: established
keywords: [interview, requirements, discovery, clarification, socratic]
category: productivity
author: harry
created: 2025-01-01
updated: 2026-02-16
dependencies:
  skills: []
  tools: [Read, Write, AskUserQuestion]
---

# Interview Skills

Conduct thorough discovery sessions through multi-round questioning before any implementation. This skill forces systematic exploration of requirements, edge cases, and design decisions.

## Command

```
/interview [--mode <feature|bug|think|workflow>] [--input <due-diligence-report-path>] [--quick]
```

**Parameters:**
- `--mode`: Interview mode (default: auto-detect based on user intent)
- `--input`: Optional path to due diligence report file (e.g., `.claude/plans/due-diligence-xxx.md`)
- `--quick`: Quick mode - simplified interview with max 3 rounds

## Interview Modes

Select the appropriate mode based on user's intent:

| Mode | Trigger | Purpose |
|------|---------|---------|
| **feature** | "新功能", "实现功能", "添加功能", "plan feature" | Deep requirements discovery for new features |
| **bug** | "bug", "修复", "fix", "debug" | Systematic bug diagnosis before fixing |
| **think** | "思考", "探索", "想法", "think through", "explore idea" | Socratic exploration of technical/product ideas |
| **workflow** | "工作流", "workflow", "测试流程" | Generate test workflow specifications |

---

## User Type Detection ⭐ 2026 新增

### Detection Logic

```javascript
function detectUserType(userInput) {
  const nonTechIndicators = [
    // 技术术语缺失
    !userInput.includesAny(['API', '数据库', '后端', '前端', '部署', '架构']),
    // 使用比喻或日常语言
    userInput.includesAny(['像', '类似', '比如', '就像']),
    // 关注商业价值而非技术实现
    userInput.includesAny(['用户', '客户', '体验', '收入', '成本']),
    // 模糊的需求描述
    userInput.includesAny(['一个东西', '某种功能', '一个系统']),
    // 避免技术细节
    !userInput.includesAny(['实现', '开发', '编写', '代码']),
  ];

  return nonTechIndicators.filter(Boolean).length >= 3 ? 'non-technical' : 'technical';
}
```

### Behavior by User Type

| 维度 | 技术用户 | 非技术用户 |
|------|----------|------------|
| 问题深度 | 技术细节优先 | 使用场景优先 |
| 术语使用 | 可用专业术语 | 避免或解释术语 |
| 盲点覆盖 | 可选 | **必须** |
| 验收定义 | 技术指标 | 业务场景 |
| 示例方式 | 代码/架构 | 用户故事/类比 |

---

## Non-Technical User Blind Spot Module ⭐ 2026 新增

### 核心理念

非技术用户往往不知道自己不知道什么。这个模块提供一份**强制检查清单**，在访谈非技术用户时，即使他们没有提到这些问题，也必须主动询问。

### 四大盲点类别（11个必问问题）

#### 类别1: 使用场景盲点（3题）

| 问题 | 技术用户默认理解 | 非技术用户盲点 | 提问方式 |
|------|------------------|----------------|----------|
| **用户量级** | "预计 QPS 是多少？" | 没想过规模问题 | "这个功能大概有多少人同时用？是几个人、几十人、还是成百上千人？" |
| **使用频率** | "高频/低频场景？" | 没考虑频次影响设计 | "用户是每天都用，还是偶尔用一次？如果是每天都用，可能需要更方便的入口。" |
| **使用环境** | "移动端/PC端/多端？" | 只想到自己常用的设备 | "用户主要在什么场景下用？手机上、电脑上、还是都需要支持？" |

#### 类别2: 成本与时间盲点（3题）

| 问题 | 技术用户默认理解 | 非技术用户盲点 | 提问方式 |
|------|------------------|----------------|----------|
| **预算范围** | "预算决定了技术选型" | 以为软件没有成本 | "这个功能有预算考虑吗？如果是用第三方服务，可能需要按月付费，比如一个月几百到几千不等。" |
| **时间预期** | "需要评估工期" | 不知道开发需要多久 | "你希望这个功能什么时候能用上？如果是很急的话，我们可能需要选择更快的方案。" |
| **维护成本** | "谁来运维？" | 以为上线就完事 | "这个功能上线后，谁来负责日常管理？比如用户遇到问题、数据备份这些。" |

#### 类别3: 运营与安全盲点（3题）

| 问题 | 技术用户默认理解 | 非技术用户盲点 | 提问方式 |
|------|------------------|----------------|----------|
| **数据归属** | "数据存在哪？谁有权访问？" | 没想过数据在哪里 | "用户的数据会存在哪里？您公司对这个有要求吗？有些公司要求数据必须存在自己的服务器上。" |
| **账号权限** | "需要角色/权限系统吗？" | 以为所有人权限一样 | "是不是所有人都能看所有内容？还是不同的人看到的东西不一样？" |
| **合规要求** | "GDPR/等保/行业规范？" | 不知道合规是什么 | "您所在的行业有没有特殊的规定？比如金融、医疗这些行业对用户数据有特别的要求。" |

#### 类别4: 成功标准盲点（2题）

| 问题 | 技术用户默认理解 | 非技术用户盲点 | 提问方式 |
|------|------------------|----------------|----------|
| **核心价值** | "MVP 范围是什么？" | 想要所有功能 | "如果这个功能只能做一件事，您觉得最重要的是哪件事？其他功能可以后面再加。" |
| **验收标准** | "Done 的定义是什么？" | 用"感觉"来验收 | "怎么算这个功能做好了？比如用户能完成某个操作？还是达到某个数据指标？" |

### 什么时候触发盲点模块

```javascript
if (userType === 'non-technical') {
  // 在第一轮结束后，插入盲点问题
  // 选择与当前话题相关的 3-5 个问题
  // 用通俗易懂的方式提问
}
```

### 示例对话

```
用户（非技术）：我想做一个员工管理系统

Interview（第一轮）：了解了，能具体说说您想管理员工的哪些信息吗？
用户：就是基本信息，姓名、部门这些。

Interview（盲点插入 - 使用场景）：
"明白。那大概有多少员工需要管理？是几十人的小公司，还是几百上千人的规模？
这个很重要，因为人数不同，我们选择的方案会完全不一样。"

用户：大概200人左右。

Interview（盲点插入 - 运营与安全）：
"好的。那这200人是不是所有人都能看所有信息？
还是说普通员工只能看自己的，只有HR能看所有人的？"

用户：哦这个我没想到，应该是只有HR能看全部。
```

---

## Question Priority Classification ⭐ 2026 新增

### Three-Tier Priority System

| 优先级 | 定义 | 什么时候问 | 示例 |
|--------|------|------------|------|
| **P0 必问** | 不问就无法继续 | 第一轮 | 核心功能是什么？用户是谁？ |
| **P1 应问** | 影响方案选择 | 第二轮后 | 技术栈偏好？预算范围？ |
| **P2 可问** | 优化体验/边界情况 | 有余力时 | 错误处理方式？极端场景？ |

### Feature Mode 问题优先级表

```
P0 (必问):
├── 这个功能是给谁用的？
├── 核心要解决的问题是什么？
├── 成功的标准是什么？
└── [非技术用户] 使用场景盲点 3 题

P1 (应问):
├── 技术栈/环境约束？
├── 预算/时间约束？
├── 与现有系统的关系？
└── [非技术用户] 成本与时间盲点 3 题

P2 (可问):
├── 边界情况处理？
├── 未来的扩展需求？
└── 用户体验细节？
```

### Bug Mode 问题优先级表

```
P0 (必问):
├── 问题现象是什么？
├── 什么时候开始出现的？
└── 能稳定复现吗？

P1 (应问):
├── 最近有什么变化？
├── 影响范围？
└── 环境信息？

P2 (可问):
├── 历史类似问题？
└── 临时解决方案？
```

---

## Smart Termination Judgment ⭐ 2026 新增

### 自动判断是否可以结束访谈

```javascript
function shouldTerminateInterview(context) {
  const signals = {
    // 正向信号（可以结束）
    positive: [
      context.coreQuestionsAnswered >= 3,      // 核心问题已回答
      context.userShowsConfidence,             // 用户表现出信心
      context.scopeIsClear,                    // 范围清晰
      context.successCriteriaDefined,          // 成功标准已定义
      context.solutionSelected,                // 方案已选定（有尽调输入时）
      context.rounds >= 3 && context.noNewInfo, // 3轮后无新信息
    ],

    // 负向信号（需要继续）
    negative: [
      context.hasContradictions,               // 存在矛盾
      context.userHesitates,                   // 用户犹豫
      context.technicalUncertainty,            // 技术不确定性高
      context.scopeCreep,                      // 范围蔓延
    ]
  };

  const positiveScore = signals.positive.filter(Boolean).length;
  const negativeScore = signals.negative.filter(Boolean).length;

  return positiveScore >= 4 && negativeScore === 0;
}
```

### 终止确认话术

```
"基于我们的讨论，我理解您需要的是：
- [核心需求1]
- [核心需求2]
- [成功标准]

推荐的方案是 [方案名]，因为 [理由]。

这个理解准确吗？如果没有补充，我们可以进入实施规划阶段。"
```

### 强制终止条件

| 条件 | 处理 |
|------|------|
| 达到 --quick 模式上限（3轮） | 直接总结，请求确认 |
| 用户明确表示"够了"/"可以了" | 立即终止，生成方案 |
| 信息矛盾且无法澄清 | 记录矛盾点，让用户决策 |

---

## Core Principles

1. **Do not ask obvious questions** - Ask questions that reveal hidden assumptions and expose edge cases
2. **Sequential questioning within rounds** - Ask questions one by one within each round, not all at once
   <!-- 核心要点：同一轮的问题要顺序提问、顺序回答，不要一次性抛出多个问题让用户同时填写 -->
3. **Multi-round exploration** - Use 5-10 rounds (standard) or max 3 rounds (quick mode)
4. **Gate on approval** - Never proceed to implementation without explicit user confirmation
5. **Document decisions** - Capture design decisions, tradeoffs, and scope boundaries
6. **Leverage due diligence** - When input report is provided, use it to inform questions
7. **Non-technical user awareness** - Detect user type and apply blind spot module when needed ⭐ New

---

## Input Processing ⭐ 2026

### When `--input` Parameter is Provided

1. **Read the due diligence report**
   ```bash
   Read <input-file-path>
   ```

2. **Extract key information**
   - Existing solutions list (开源方案、SaaS产品、技术框架)
   - Pros and cons of each solution
   - Recommended solutions
   - Questions to clarify (待澄清问题)

3. **Generate informed questions**
   - Combine existing solutions with user requirements
   - Ask about solution preferences
   - Clarify trade-offs between options

### Example Questions Based on Due Diligence

```
"When there are existing solutions found:

- '尽调发现有几个现成方案：A（开源，适合 X 场景）、B（SaaS，每月 Y 元）、C（框架，需要 Z 技术栈）。你对使用现成方案还是自己开发有什么倾向？'

- '这几个方案的优缺点分别是：A（优点...缺点...）、B（优点...缺点...）。你觉得哪个更符合你的需求？为什么？'

- '如果使用方案 A，可能需要 [权衡点]，你能接受吗？'

- '现有方案大多使用 [技术栈]，你的环境是否兼容？'

- 'SaaS 方案 [Y] 每月费用 [价格]，自建方案需要 [工期]，你更看重哪个？'
"
```

---

## Feature Interview Mode

### Process

1. **User Type Detection** - Detect if user is technical or non-technical ⭐ New
2. **Initial Understanding** - Read any context provided (including due diligence report if `--input` is specified)
3. **Multi-Round Questioning** (5-10 rounds standard, max 3 rounds quick)
   <!-- 核心要点：每轮 1-3 个问题，顺序提问 -->
   - Use separate AskUserQuestion calls for each question
   - Wait for user response before asking the next question
   - **Apply blind spot questions for non-technical users** ⭐ New
   - After completing all questions in the round, summarize and confirm understanding
   - Ask user if the understanding is accurate and whether to continue to the next round
4. **Smart Termination Check** - Evaluate if enough information gathered ⭐ New
5. **Synthesize & Plan** - Write implementation plan document
6. **Approval Gate** - Get explicit confirmation before proceeding

### Question Categories (with Priority)

**P0 - Core Questions (必须问):**

- "这个功能是给谁用的？"
- "要解决的核心问题是什么？"
- "怎么算做好了？"

**P0 - Solution Selection (with due diligence):**

- "我找到了 [方案A]、[方案B]、[方案C] 三个现有方案。你对使用现成方案还是自己开发有什么倾向？"
- "这几个方案分别是 [简要说明各方案特点]，你觉得哪个更符合你的需求？为什么？"

**P1 - Technical Architecture:**

- How does this interact with existing state/data flows?
- What happens if this operation fails halfway through?
- What's the data model and relationships?

**P1 - User Experience:**

- What's the user's mental model? Does our UI match it?
- What feedback does the user need at each step?

**P2 - Scope & Priorities:**

- If you had to cut 50% of this feature, what stays?
- What's explicitly out of scope?

**P2 - Integration & Testing:**

- How does this affect existing features?
- What's hard to test here?

### Output Format

Create implementation plan at `.claude/plans/<feature-name>.md`:

```markdown
# Feature: [Name]

> One-line description

## User Type ⭐ 2026 新增
- **类型**: [技术用户/非技术用户]
- **判断依据**: [关键词/表达方式]

## Technical Due Diligence Reference

- **参考方案**: [从尽调报告中引用的方案列表]
- **选择倾向**: [用户选择的方案类型：自建/现成/混合]
- **决策理由**: [为什么选择这个方向]

## Summary
2-3 paragraph overview

## Goals
- Goal 1
- Goal 2

## Non-Goals
- Out of scope item 1
- Out of scope item 2

## Selected Approach

| 决策 | 选择 | 理由 |
|------|------|------|
| 自建 vs 现成方案 | ... | ... |
| 技术栈选择 | ... | ... |
| 部署方式 | ... | ... |

## Design Decisions
| Decision | Rationale |
|----------|-----------|
| Decision 1 | Why |

## Implementation Phases
### Phase 1: [Foundation]
1. Step 1
2. Step 2

### Phase 2: [Core]
...

## Edge Cases & Error Handling
| Scenario | Handling |
|----------|----------|
| Case 1 | Approach |

## Testing Strategy
- Unit tests: [what to test]
- E2E tests: [critical flows]

## Reference Resources
- [从尽调报告中提取的参考链接]
- [相关文档和教程]

## Open Questions
- [ ] Question needing research
```

---

## Bug Interview Mode

### Process

1. **Initial Reading** - Read relevant code files mentioned (and due diligence report if provided)
2. **Diagnostic Questions** - Ask systematic questions about the bug sequentially (by priority)
   <!-- 核心要点：按优先级顺序提问关于 bug 的系统性问题 -->
3. **Root Cause Analysis** - Document findings
4. **Fix Planning** - Propose fix approach

### Diagnostic Questions (with Priority)

**P0 (必问):**
- What is the exact symptom?
- When did it start happening?
- Can you reproduce it consistently?

**P1 (应问):**
- Environment details (browser, OS, network)
- What changed recently?
- Pattern: every time? Only certain users/conditions?

**P2 (可问):**
- Expected vs actual behavior
- Error messages or logs
- Temporary workarounds tried?

### With Due Diligence Input - Common Issues Questions:

- "这个问题在 [框架/库] 的 GitHub Issues 中有类似报告，你的情况是否和 [具体场景] 相似？"
- "官方文档建议的解决方案是 [方案]，你尝试过吗？"
- "这个问题在版本 [X] 中已被修复，你使用的是哪个版本？"

### Output Format

Create diagnosis document at `.claude/plans/bug-<name>.md`:

```markdown
# Bug Diagnosis: [Brief Description]

## Symptoms
- Symptom 1
- Symptom 2

## Environment
- Browser/Version:
- OS:
- App Version:

## Known Similar Issues
- [从尽调报告中找到的类似问题]
- [相关的 GitHub Issues]

## Reproduction Steps
1. Step 1
2. Step 2

## Root Cause Analysis
[Analysis of what's causing the bug]

## Proposed Fix
[Description of fix approach]

## Testing the Fix
- [ ] Test case 1
- [ ] Test case 2

## Prevention
[How to prevent similar bugs]
```

---

## Think-Through Mode

### Process

1. **Idea Exploration** - Understand the concept/app/product idea
2. **User Type Detection** - Detect if user is technical or non-technical ⭐ New
3. **Socratic Questioning** - Ask probing questions from multiple angles sequentially
   <!-- 核心要点：从多个角度顺序提问深入探讨 -->
4. **Market & Technical Analysis** - Explore viability and risks
5. **Recommendation** - Provide thoughtful assessment

### Question Areas (with Priority)

**P0 (必问):**
- What's the core problem being solved?
- Who is the target user?

**P1 (应问):**

**With Due Diligence Input - Competitive Analysis:**
- "市场上已有 [产品A]、[产品B] 等类似产品，你的产品与它们的主要区别是什么？"
- "根据调研，[领域] 的市场规模是 X，年增长率是 Y%，你如何看待这个机会？"

**Usage Scenario:**
- When you imagine people using this, what's the scenario?

**Target Audience:**
- Who's the user? Age, tech-savviness, context?

**P2 (可问):**

**Technical Complexity:**
- What's the hardest technical challenge?
- What could make this infeasible?

**Core Value:**
- What's the one-sentence value proposition?

### Output Format

Create analysis document at `.claude/plans/think-<topic>.md`:

```markdown
# Thinking Through: [Topic]

## User Type ⭐ 2026 新增
- **类型**: [技术用户/非技术用户]

## Concept
[Core idea in 1-2 sentences]

## Market Research Summary
[从尽调报告中提取的市场信息]

## Target Users
[Who and why]

## Problem Statement
[What pain point this solves]

## Competitive Analysis
| Alternative | Pros | Cons | Our Advantage |
|-------------|------|------|---------------|
| Competitor A | ... | ... | ... |

## Technical Considerations
- Challenges:
- Risks:
- Open questions:

## Recommendation
[Go/No-go/Refine with specific reasoning]

## Next Steps
[If proceeding, what to do first]
```

---

## Workflow Generator Mode

### Process

1. **Explore Codebase** - Understand the app structure
2. **Identify User Journeys** - Map key workflows
3. **Propose Workflows** - Confirm workflow details by asking questions sequentially
   <!-- 核心要点：顺序提问确认工作流细节 -->
4. **User Review** - Get approval on workflow coverage
5. **Generate Tests** - Create test files

### Output Format

Create workflow spec at `.claude/plans/workflows.md`:

```markdown
# Test Workflows

## Workflow 1: [Name]
- **Entry point:** [URL/screen]
- **Steps:**
  1. Step 1
  2. Step 2
- **Expected result:** [Outcome]
- **Critical assertions:**
  - [ ] Assertion 1

## Workflow 2: [Name]
...
```

---

## Interview Style Guidelines

### Sequential Questioning Within Rounds
<!-- 顺序提问模式 - 核心交互设计 -->

**Core Principle: Ask questions sequentially within each round, not in parallel.**
<!-- 核心原则：同一轮的问题要顺序回答，而不是并行填写 -->

**Correct approach:**
```
Round 1 (Solution Selection - with due diligence):
├── AskUserQuestion: "Question 1: 尽调发现有 A、B、C 三个方案，你对哪个方向感兴趣？"
├── After user responds
├── AskUserQuestion: "Question 2: 方案 A 需要 X 环境，你有这个条件吗？"
├── After user responds
├── AskUserQuestion: "Question 3: 你更看重快速上线还是长期可维护性？"
├── After user responds
└── Summarize → "Based on your answers, I understand... Shall we continue deeper?"
```
<!-- 正确做法示例 -->

**Incorrect approach:**
```
Round 1:
└── AskUserQuestion: [Question 1, Question 2, Question 3]  ← User must fill all at once
```
<!-- 错误做法示例 -->

### Implementation Steps
<!-- 实施步骤 -->

1. **Split round questions into multiple AskUserQuestion calls**
   <!-- 将一轮的问题拆分为多次 AskUserQuestion 调用 -->
   - Each AskUserQuestion contains only 1 question
   - Wait for user response before proceeding to the next
   - Maintain conversational context

2. **Apply blind spot questions for non-technical users**
   <!-- 对非技术用户应用盲点问题 -->
   - After Round 1, insert relevant blind spot questions
   - Use plain language with analogies
   - Explain why the question matters

3. **Summarize and confirm after each round**
   <!-- 每轮结束后进行思考和确认 -->
   - Summarize information gathered in the round
   - Present your understanding and inferences
   - Check smart termination conditions ⭐ New
   - Ask if the understanding is accurate and whether to continue

4. **Question design principles**
   <!-- 问题设计原则 -->
   - **Ask 1-3 questions per round** - Control the volume per round
   - **Follow priority order** - P0 first, then P1, P2 if time ⭐ New
   - **Be concrete** - "So if a user has 50 tables..." not "What about scale?"
   - **Follow up** - Don't just tick boxes, pursue interesting threads
   - **Admit uncertainty** - "I'm not sure I understand X, can you clarify?"
   - **Offer options** - "We could do A, B, or C—what resonates?"
   - **Push on vagueness** - "You said 'fast'—what's the actual threshold?"
   - **Leverage due diligence** - "根据调研，方案 A 在 X 场景下表现更好..."

---

## Integration with Team Skill ⭐ 2026

### How Team Skill Calls Interview

```javascript
// Team Skill Phase 1 calls Interview with due diligence input
Skill({
  skill: "interview-skills",
  args: `--mode feature --input .claude/plans/due-diligence-<timestamp>.md`
})

// Quick mode for simple tasks
Skill({
  skill: "interview-skills",
  args: `--mode feature --quick`
})
```

### Expected Behavior

1. **Interview receives the due diligence report**
2. **Detect user type (technical vs non-technical)** ⭐ New
3. **Questions are informed by the report content**
4. **Apply blind spot module for non-technical users** ⭐ New
5. **Output includes reference to due diligence findings**
6. **User decisions about solutions are documented**

### Output Handoff to Team Skill Phase 2

After Interview completes, the output is used by Team Skill Phase 2 (深度搜索) to:
- Search for specific implementation details of selected solutions
- Generate the comprehensive analysis report

---

## Quick Mode ⭐ 2026 新增

When `--quick` flag is set:

| 维度 | 标准模式 | 快速模式 |
|------|----------|----------|
| 最大轮数 | 5-10 轮 | 3 轮 |
| 每轮问题 | 1-3 个 | 1 个 |
| 盲点问题 | 完整 11 题 | 精选 3 题 |
| 输出文档 | 完整计划 | 简化计划 |
| 终止条件 | 智能判断 | 达到 3 轮强制终止 |

### Quick Mode Workflow

```
Round 1: P0 核心问题（1题）+ 用户类型检测
Round 2: 方案选择（如有尽调）+ 精选盲点（1-2题）
Round 3: 成功标准确认 → 总结 → 立即进入实施
```

---

## When to Stop Interviewing

### Smart Termination Conditions ⭐ New

Stop when:
- ✅ P0 questions all answered
- ✅ Solution selected (when due diligence input provided)
- ✅ Success criteria defined
- ✅ User shows confidence in the plan
- ✅ No contradictions in requirements
- ✅ Positive signals ≥ 4, Negative signals = 0

Continue when:
- ❌ P0 questions unanswered
- ❌ Requirements have contradictions
- ❌ User hesitates or seems confused
- ❌ Technical uncertainty is high
- ❌ Scope keeps expanding

## Implementation Phase (After Approval)

Once user explicitly approves the plan:
1. Review the approved plan
2. Create/update todo list if complex
3. Implement following the plan phases
4. Reference edge cases document while coding
5. Reference due diligence resources when needed
