# 三级记忆系统

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                      L1: 工作记忆                            │
│              (Session 级别，当前对话)                         │
│                      自动管理                                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      L2: 团队记忆                            │
│              (Team 级别，本次任务)                           │
│         .claude/teams/{team-name}/                           │
│         ├── context.md                                       │
│         ├── decisions.md                                     │
│         ├── user-needs.md                                    │
│         └── progress.md                                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                      L3: 长期记忆                            │
│              (跨团队、跨会话)                                │
│         .claude/memory/                                      │
│         ├── project-knowledge/                               │
│         │   └── architecture.md                              │
│         ├── agent-experiences/                               │
│         │   └── {role}.md                                    │
│         ├── user-preferences/                                │
│         │   └── communication-style.md                       │
│         └── lessons-learned.md                               │
└─────────────────────────────────────────────────────────────┘
```

## 使用规范

### L2 → L3 记忆沉淀

任务完成后，自动提取有价值信息到长期记忆：

```javascript
// 在 Phase 8 交付阶段执行
Task({
  description: "记忆沉淀",
  prompt: `将本次任务的经验提取到长期记忆。

## 需要更新的文件
1. lessons-learned.md - 添加新的经验教训
2. {role}.md - 更新各 Agent 的经验
3. architecture.md - 如有架构决策

## 输出格式
\`\`\`yaml
更新文件:
  - path: 文件路径
    content: 新增内容
    reason: 为什么值得记录
\`\`\``,
  subagent_type: "general-purpose",
  name: "memory-archivist"
})
```

### L3 → L2 记忆加载

新团队创建时，自动加载相关记忆：

```javascript
// 在 TeamCreate 后执行
function loadRelevantMemory(taskDescription) {
  // 1. 读取项目架构知识
  const architecture = Read("~/.claude/memory/project-knowledge/architecture.md");

  // 2. 读取相关角色经验
  const roleExperiences = Read("~/.claude/memory/agent-experiences/{role}.md");

  // 3. 读取用户偏好
  const userPrefs = Read("~/.claude/memory/user-preferences/communication-style.md");

  // 4. 读取相关教训
  const lessons = Read("~/.claude/memory/lessons-learned.md");

  // 5. 整合到团队上下文
  return { architecture, roleExperiences, userPrefs, lessons };
}
```

## 记忆检索策略

### 语义搜索（推荐）

```javascript
// 使用相似度匹配找到相关记忆
function findRelevantMemory(query, memoryStore) {
  return memoryStore
    .map(item => ({
      ...item,
      similarity: calculateSemanticSimilarity(query, item.content)
    }))
    .filter(item => item.similarity > 0.7)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);
}
```

### 标签检索

```yaml
# 在记忆文件中添加标签
---
tags: ["数据库", "性能优化", "PostgreSQL"]
created: 2026-02-16
related: ["LLM-001", "LLM-003"]
---
```

## 记忆更新原则

1. **定期回顾**：每月回顾 lessons-learned.md，删除过时的
2. **增量更新**：保留原有内容，添加新条目
3. **质量优先**：只记录有价值、可复用的经验
4. **结构化**：使用 YAML frontmatter 添加元数据

## 示例工作流

```javascript
// 完整记忆流程示例

// 1. 团队创建时加载记忆
TeamCreate({ team_name: "feature-x" });
const memories = loadRelevantMemory("用户登录功能");
// → 自动加载之前的登录功能经验

// 2. 任务执行中使用记忆
Task({
  prompt: `参考之前的经验：${memories.lessons}
  现在实现新的登录功能...`
});

// 3. 任务完成后沉淀记忆
// 自动执行记忆归档，提取本次经验教训
```
