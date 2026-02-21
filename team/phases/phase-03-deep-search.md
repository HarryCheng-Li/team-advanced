# Phase 3: 深度搜索

## 目标

基于澄清结果深挖技术细节，生成综合分析报告。

## STATE VARIABLES

| 变量名 | 描述 | 来源 |
|--------|------|------|
| `{due_diligence_report}` | 尽调报告 | Phase 1 |
| `{clarified_requirements}` | 澄清后的需求 | Phase 2 |
| `{analysis_report}` | 综合分析报告 | 本 Phase |
| `{technical_decisions}` | 技术决策建议 | 本 Phase |

## 触发条件

- Phase 2 需求澄清完成后
- **快速模式跳过此阶段**

## 执行者

`tech-scout`（再次搜索，使用 **Haiku**）

## 执行步骤

### Step 1: 确定深挖方向

基于 Phase 2 澄清结果：
1. 用户选择的技术方向
2. 选定方案的 API 文档
3. 潜在坑点和已知问题
4. 最佳实践和设计模式

### Step 2: 执行深度搜索

```javascript
Task({
  description: "深度技术搜索",
  prompt: `你是 tech-scout。

## 输入
- 尽调报告: ${due_diligence_report}
- Interview 澄清结果: ${clarified_requirements}

## 任务
使用迭代检索模式深度搜索：
1. 基于用户选择的方向，搜索具体实现细节
2. 搜索选定方案的 API 文档、最佳实践
3. 搜索潜在坑点和已知问题
4. 生成综合分析报告`,
  model: "haiku",
  name: "tech-scout"
})
```

### Step 3: 分析参考仓库 (可选)

如果有相关的开源项目，调用 `repo-analyst` 分析：

```javascript
Task({
  description: "分析参考仓库",
  prompt: `你是 repo-analyst。
分析仓库: {repo_url}
提取最佳实践和关键模式`,
  model: "haiku",
  name: "repo-analyst"
})
```

### Step 4: 生成综合分析报告

保存到: `.claude/plans/analysis-report-<timestamp>.md`

## 输出格式

```markdown
# 综合分析报告

## 选定方向
{用户选择的技术方向}

## 技术细节

### API 文档摘要
{关键 API 说明}

### 最佳实践
1. {practice_1}
2. {practice_2}

### 已知问题
1. {issue_1}: {解决方案}
2. {issue_2}: {解决方案}

## 实现建议

### 推荐架构
{架构图或描述}

### 关键文件
- {file_1}: {用途}
- {file_2}: {用途}

### 依赖项
- {dependency_1}: {版本}
- {dependency_2}: {版本}

## 风险评估
| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| ... | ... | ... | ... |

## 预计工作量
{基于分析的工时估算}
```

## NEXT STEP

完成本 Phase 后，加载: `phases/phase-04-architecture.md`

## 相关参考

- **迭代检索**: [references/iterative-retrieval.md](../references/iterative-retrieval.md)
- **架构选择**: [references/architecture-selector.md](../references/architecture-selector.md)
