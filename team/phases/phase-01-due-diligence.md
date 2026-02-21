# Phase 1: 技术尽调

## 目标

了解现有技术 landscape，让用户站在现有技术肩膀上。**所有模式必须执行**。

## STATE VARIABLES

| 变量名 | 描述 | 来源 |
|--------|------|------|
| `{due_diligence_report}` | 尽调报告文件路径 | 本 Phase |
| `{tech_landscape}` | 技术领域总结 | 本 Phase |
| `{existing_solutions}` | 现有方案列表 | 本 Phase |

## 触发条件

**所有 `/team` 任务（无例外）**

## 模式差异

| 模式 | 搜索范围 | 输出 |
|------|----------|------|
| 快速 | Top 3 方案 | 简化报告 |
| 标准 | 迭代检索 (3轮) | 详细报告 |
| 完整 | 迭代检索 + 备选方案 | 完整报告 + 技术选型建议 |

## 执行者

`tech-scout`（技术尽调专家，使用 **Haiku** 快速搜索）

## 执行步骤

### Step 1: 确定搜索策略

```javascript
// 迭代检索模式（Iterative Retrieval）
// DISPATCH → EVALUATE → REFINE → LOOP (最多 3 轮)

const searchStrategy = {
  keywords: extractKeywords(userInput),
  domains: identifyDomains(userInput),
  depth: mode === 'quick' ? 1 : 3
};
```

### Step 2: 执行迭代检索

```
第1轮 (DISPATCH):
  - 使用多个关键词组合广泛搜索
  - 收集 20-50 个候选结果

第2轮 (EVALUATE + REFINE):
  - 评估每个结果的相关性（0-1分）
  - 从高相关结果提取新模式
  - 针对缺口定向搜索

第3轮 (LOOP):
  - 补充遗漏信息
  - 深挖最佳方案细节
```

### Step 3: 搜索工具优先级

| 优先级 | 工具 | 用途 |
|--------|------|------|
| 1 | github-kb find | 本地知识库 |
| 2 | WebSearch / mcp__MiniMax__web_search | 通用搜索 |
| 3 | mcp__exa__web_search_exa | 技术内容搜索 |
| 4 | mcp__zread__search_doc | GitHub 文档搜索 |
| 5 | mcp__exa__get_code_context_exa | 代码示例 |

### Step 4: 生成尽调报告

保存到: `.claude/plans/due-diligence-<timestamp>.md`

## 输出格式

```markdown
# 技术尽调报告

## 用户需求
{用户原始需求}

## 技术领域
- 主领域: {domain}
- 相关领域: {related_domains}

## 现有方案

### 方案 A: {name}
- 描述: {description}
- 优势: {pros}
- 劣势: {cons}
- 适用场景: {use_cases}
- 技术栈: {tech_stack}

### 方案 B: {name}
...

## 最佳实践
1. {practice_1}
2. {practice_2}

## 已知坑点
1. {pitfall_1}
2. {pitfall_2}

## 推荐方向
{基于尽调结果的初步建议}
```

## 快速模式简化版

```markdown
# 快速尽调报告

## Top 3 方案
1. {方案1} - {一句话描述}
2. {方案2} - {一句话描述}
3. {方案3} - {一句话描述}

## 推荐选择
{推荐方案} (置信度: X%)

## 原因
{简要说明}
```

## NEXT STEP

完成本 Phase 后，加载: `phases/phase-02-clarification.md`

## 相关参考

- **迭代检索**: [references/iterative-retrieval.md](../references/iterative-retrieval.md)
- **规模自适应**: [references/scale-adaptation.md](../references/scale-adaptation.md)
