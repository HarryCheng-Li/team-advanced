# Instincts 进化机制

## 概念

```
instincts 累积 → 聚类 → 进化为 skill / command / agent
```

当用户频繁执行某类任务时，系统会生成对应的 instincts。当相关 instincts 积累到一定数量后，可以通过 `/evolve` 命令将其"进化"为更高级的形式。

---

## /evolve 命令

### 触发条件

- 用户执行 `/evolve` 命令
- 相关领域的 instincts 数量 > 5

### 流程

```
1. 收集所有 instincts
   ↓
2. 按类型/领域聚类
   ↓
3. 识别进化方向 (command / skill / agent)
   ↓
4. 生成草案
   ↓
5. 用户确认
```

---

## 进化规则

### → Command（用户显式调用）

**适用场景：**
- 多个 instincts 描述"当用户要求..."
- 有明确的触发器
- 遵循可重复的步骤流程

**示例：**

```
instinct-1: "当用户要求创建 API，先检查现有 API"
instinct-2: "当用户要求创建 API，使用 RESTful 规范"
instinct-3: "当用户要求创建 API，添加 Swagger 文档"
instinct-4: "当用户要求创建 API，实现输入验证"
instinct-5: "当用户要求创建 API，添加错误处理"
↓ /evolve
/command create-api
```

**生成的 Command：**

```javascript
// /command create-api
{
  name: "create-api",
  trigger: "user request to create API",
  steps: [
    "检查现有 API",
    "使用 RESTful 规范设计路由",
    "添加 Swagger 文档",
    "实现输入验证",
    "添加错误处理"
  ]
}
```

---

### → Skill（自动触发）

**适用场景：**
- 基于模式匹配自动触发
- 错误处理响应
- 代码风格执行

**示例：**

```
instinct-1: "遇到 TypeScript 错误，检查 tsconfig.json"
instinct-2: "遇到 TypeScript 错误，检查 import 路径"
instinct-3: "遇到 TypeScript 错误，重启 TS server"
instinct-4: "遇到 TypeScript 错误，检查类型定义"
instinct-5: "遇到 TypeScript 错误，验证 @types 包"
↓ /evolve
/skill typescript-troubleshooting
```

**生成的 Skill：**

```javascript
// /skill typescript-troubleshooting
{
  name: "typescript-troubleshooting",
  trigger: "TypeScript error detected",
  actions: [
    "检查 tsconfig.json 配置",
    "检查 import 路径",
    "重启 TS server",
    "检查类型定义",
    "验证 @types 包"
  ]
}
```

---

### → Agent（需要深度/隔离）

**适用场景：**
- 复杂的多步骤过程
- 需要专门的上下文管理
- 需要独立决策能力

**示例：**

```
instinct-1: "代码审查：检查安全问题"
instinct-2: "代码审查：检查性能问题"
instinct-3: "代码审查：检查代码风格"
instinct-4: "代码审查：检查测试覆盖"
instinct-5: "代码审查：生成审查报告"
instinct-6: "代码审查：与作者沟通反馈"
↓ /evolve
/agent code-reviewer
```

**生成的 Agent：**

```javascript
// /agent code-reviewer
{
  name: "code-reviewer",
  purpose: "执行全面的代码审查",
  capabilities: [
    "安全检查",
    "性能分析",
    "代码风格验证",
    "测试覆盖率检查",
    "报告生成",
    "反馈沟通"
  ],
  autonomy: "high"
}
```

---

## 聚类算法

```javascript
/**
 * Instinct 聚类算法
 * 将相似的 instincts 分组以识别进化方向
 */

class InstinctCluster {
  constructor(instincts) {
    this.instincts = instincts;
  }

  /**
   * 提取关键词
   */
  extractKeywords(instinct) {
    // 简单的关键词提取
    const words = instinct.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/);
    return new Set(words.filter(w => w.length > 3));
  }

  /**
   * 计算 Jaccard 相似度
   */
  similarity(set1, set2) {
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }

  /**
   * 聚类 instincts
   */
  cluster(threshold = 0.3) {
    const clusters = [];
    const keywords = this.instincts.map(i => this.extractKeywords(i.content));

    for (let i = 0; i < this.instincts.length; i++) {
      let added = false;

      // 尝试加入现有聚类
      for (const cluster of clusters) {
        const avgSim = cluster.members.reduce((sum, idx) =>
          sum + this.similarity(keywords[i], keywords[idx]), 0) / cluster.members.length;

        if (avgSim >= threshold) {
          cluster.members.push(i);
          cluster.keywords = new Set([...cluster.keywords, ...keywords[i]]);
          added = true;
          break;
        }
      }

      // 创建新聚类
      if (!added) {
        clusters.push({
          members: [i],
          keywords: keywords[i],
          instincts: [this.instincts[i]]
        });
      }
    }

    return clusters;
  }

  /**
   * 识别进化方向
   */
  identifyEvolutionPath(cluster) {
    const instincts = cluster.instincts;
    const firstInstinct = instincts[0].content.toLowerCase();

    // Command: 用户显式请求
    if (firstInstinct.includes('当用户要求') || firstInstinct.includes('when user asks')) {
      return 'command';
    }

    // Skill: 模式匹配/错误处理
    if (firstInstinct.includes('遇到') || firstInstinct.includes('error') ||
        firstInstinct.includes('检查') || firstInstinct.includes('检测')) {
      return 'skill';
    }

    // Agent: 复杂多步骤
    if (cluster.members.length >= 5) {
      // 检查是否需要隔离/专门上下文
      const hasComplexKeywords = cluster.keywords.has('review') ||
                                  cluster.keywords.has('analyze') ||
                                  cluster.keywords.has('design');
      if (hasComplexKeywords) {
        return 'agent';
      }
    }

    // 默认: skill
    return 'skill';
  }

  /**
   * 生成进化提案
   */
  generateProposals() {
    const clusters = this.cluster();
    return clusters.map(cluster => ({
      instincts: cluster.instincts.map(i => i.content),
      count: cluster.members.length,
      evolutionPath: this.identifyEvolutionPath(cluster),
      suggestedName: this.suggestName(cluster),
      keywords: [...cluster.keywords]
    }));
  }

  /**
   * 生成建议名称
   */
  suggestName(cluster) {
    const path = this.identifyEvolutionPath(cluster);
    const keywords = [...cluster.keywords];

    // 提取核心主题
    const topicKeywords = keywords.filter(k =>
      !['when', 'user', 'asks', 'error', 'check', 'create'].includes(k)
    );

    const topic = topicKeywords[0] || 'action';
    const formatted = topic.replace(/[^a-zA-Z0-9]/g, '-');

    return `/${path} ${formatted.toLowerCase()}`;
  }
}

// 使用示例
const instincts = [
  { content: "当用户要求创建 API，先检查现有 API" },
  { content: "当用户要求创建 API，使用 RESTful 规范" },
  { content: "当用户要求创建 API，添加 Swagger 文档" },
  { content: "遇到 TypeScript 错误，检查 tsconfig" },
  { content: "遇到 TypeScript 错误，检查 import 路径" }
];

const clusterer = new InstinctCluster(instincts);
const proposals = clusterer.generateProposals();

console.log(proposals);
/*
[
  {
    instincts: [...],
    count: 3,
    evolutionPath: 'command',
    suggestedName: '/command create-api',
    keywords: ['user', 'create', 'api', 'restful', 'swagger']
  },
  {
    instincts: [...],
    count: 2,
    evolutionPath: 'skill',
    suggestedName: '/skill typescript',
    keywords: ['typescript', 'error', 'check', 'import']
  }
]
*/
```

---

## 完整进化示例

### 场景：API 开发流程

#### 1. Instincts 积累

```
instinct-001: "当用户要求创建 API，先检查现有 API"
instinct-002: "当用户要求创建 API，使用 RESTful 规范"
instinct-003: "当用户要求创建 API，添加 Swagger 文档"
instinct-004: "当用户要求创建 API，实现输入验证"
instinct-005: "当用户要求创建 API，添加错误处理"
instinct-006: "当用户要求创建 API，添加单元测试"
```

#### 2. 用户执行 /evolve

```
user: /evolve
```

#### 3. 系统聚类分析

```javascript
{
  cluster: {
    members: [0, 1, 2, 3, 4, 5],
    keywords: new Set(['user', 'create', 'api', 'restful', 'swagger', 'validation', 'test'])
  },
  evolutionPath: 'command',
  confidence: 0.92
}
```

#### 4. 生成草案

```
建议进化为：/command create-api

描述：创建符合 RESTful 规范的 API，包含完整文档、验证和测试

步骤：
1. 检查现有 API（避免重复）
2. 设计 RESTful 路由
3. 实现输入验证
4. 添加错误处理
5. 编写 Swagger 文档
6. 创建单元测试

触发器：用户明确要求"创建 API"或类似表述

确认？(y/n)
```

#### 5. 用户确认后创建

```javascript
// /commands/create-api.js
export default {
  name: 'create-api',
  description: '创建符合 RESTful 规范的 API',
  trigger: /创建.*API|create.*API/i,

  execute(context) {
    return [
      'checkExistingApis',
      'designRESTfulRoutes',
      'implementValidation',
      'addErrorHandling',
      'writeSwaggerDocs',
      'createUnitTests'
    ];
  }
};
```

---

## 进化决策树

```
                    ┌─────────────────┐
                    │  执行 /evolve   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ 收集所有 instincts │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │   按相似度聚类   │
                    └────────┬────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
      ┌──────────────────┐      ┌──────────────────┐
      │ 包含"用户要求"？  │      │  聚类大小 >= 5？ │
      └────────┬─────────┘      └────────┬─────────┘
               │                          │
        Yes ───┴─── No              Yes ──┴─── No
               │                          │
               ▼                          ▼
      ┌──────────────────┐      ┌──────────────────┐
      │   → Command       │      │ 需要隔离上下文？  │
      │   (用户显式调用)  │      └────────┬─────────┘
      └──────────────────┘               │
                               Yes ───────┴───── No
                                       │              │
                                       ▼              ▼
                              ┌──────────────────┐ ┌──────────────┐
                              │    → Agent       │ │  → Skill     │
                              │ (复杂/隔离/决策)  │ │ (自动触发)   │
                              └──────────────────┘ └──────────────┘
```

---

## 配置选项

```javascript
// evolution.config.js
export default {
  // 最小聚类阈值 (0-1)
  minClusterThreshold: 0.3,

  // 最小进化所需的 instincts 数量
  minInstinctsForEvolution: 5,

  // 自动进化（无需用户确认）
  autoEvolve: false,

  // 进化偏好
  preferences: {
    // 倾向于创建 agent
    preferAgent: false,
    // 倾向于创建 skill
    preferSkill: true
  }
};
```

---

## 注意事项

1. **进化是单向的**：一旦进化，原始 instincts 被归档
2. **可逆性**：可以通过 `/devolve` 恢复到 instincts 状态
3. **增量进化**：新的 instincts 可以加入到现有的 command/skill/agent
4. **冲突解决**：当检测到冲突行为时，提示用户选择

---

## 相关命令

| 命令 | 描述 |
|------|------|
| `/evolve` | 触发进化流程 |
| `/instincts` | 列出所有 instincts |
| `/instincts <category>` | 列出特定类别的 instincts |
| `/devolve <name>` | 将 command/skill/agent 恢复为 instincts |
| `/merge <name1> <name2>` | 合并两个进化产物 |
