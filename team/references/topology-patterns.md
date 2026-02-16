# 动态团队拓扑模式

## 四种核心拓扑

### 1. 星型拓扑 (Star) ⭐ 默认
适合：层级明确、需要统一协调的任务

```
        tech-lead
       /    |    \
      /     |     \
backend  frontend  test
      \     |     /
       \    |    /
        product-owner
```

**使用场景**：
- 功能开发（需要前后端协调）
- 中等复杂度项目
- 需要统一决策

**通信规则**：
- 所有横向通信通过中心节点
- 中心节点负责任务分配
- 中心节点负责冲突仲裁

**代码示例**：
```javascript
// 星型拓扑配置
const starTopology = {
  type: "star",
  center: "tech-lead",
  nodes: ["backend-dev", "frontend-dev", "test-engineer", "database-designer"],
  communication: "hub-and-spoke",  // 所有消息经过中心
  decisionAuthority: "center"      // 中心节点决策
};

// 创建 Agent 时指定拓扑
Task({
  description: "创建星型团队",
  prompt: `你是 tech-lead（中心节点）。

## 拓扑：星型
- 节点：backend-dev, frontend-dev, test-engineer
- 你的角色：协调中心，所有重要决策需经你确认

## 职责
1. 接收所有节点的进度汇报
2. 协调节点间的依赖
3. 仲裁冲突
4. 向 product-owner 汇报`,
  subagent_type: "general-purpose",
  name: "tech-lead"
});
```

---

### 2. 网状拓扑 (Mesh) 🕸️
适合：需要多方协商、创意碰撞的任务

```
    architect-A ←→ architect-B
         ↑      ↘   ↑
         └──────→ architect-C
```

**使用场景**：
- 架构方案讨论
- 技术选型辩论
- 复杂问题 brainstorming

**通信规则**：
- peer-to-peer 直接通信
- 无中心节点
- 共识驱动决策

**代码示例**：
```javascript
// 网状拓扑配置
const meshTopology = {
  type: "mesh",
  nodes: ["architect-A", "architect-B", "architect-C"],
  communication: "peer-to-peer",
  decisionMode: "consensus",  // 共识决策
  maxRounds: 3                // 最多3轮讨论
};

// 创建辩论式团队
Task({
  description: "架构方案A",
  prompt: `你是 architect-A。

## 拓扑：网状（辩论模式）
- 对手：architect-B, architect-C
- 规则：每人提出方案，多轮辩论，最后投票

## 你的任务
提出并捍卫你的架构方案，同时评估他人方案的优缺点。`,
  subagent_type: "Plan",
  name: "architect-A"
});

Task({
  description: "架构方案B",
  prompt: `你是 architect-B（方案B提出者）...`,
  subagent_type: "Plan",
  name: "architect-B"
});
```

---

### 3. 流水线拓扑 (Pipeline) 🔄
适合：明确阶段、顺序执行的任务

```
design → develop → review → test → deploy
```

**使用场景**：
- 标准化的功能开发流程
- CI/CD 流水线
- 文档编写流程

**通信规则**：
- 单向数据流
- 前一阶段输出作为后一阶段输入
- 可并行处理多个任务

**代码示例**：
```javascript
// 流水线拓扑配置
const pipelineTopology = {
  type: "pipeline",
  stages: [
    { name: "design", agent: "architect", output: "design-doc" },
    { name: "develop", agent: "developer", input: "design-doc", output: "code" },
    { name: "review", agent: "code-reviewer", input: "code", output: "review-report" },
    { name: "test", agent: "test-engineer", input: "code", output: "test-report" }
  ],
  allowParallel: true,  // 允许多个任务同时在不同阶段
  autoPromote: false    // 需要手动确认才进入下一阶段
};

// 创建流水线阶段
// Stage 1: Design
Task({
  description: "架构设计阶段",
  prompt: `完成架构设计后，将设计文档传递给下一阶段。`,
  subagent_type: "Plan",
  name: "architect"
});

// Stage 2: Develop（依赖 Stage 1）
Task({
  description: "开发阶段",
  prompt: `基于设计文档进行开发...`,
  subagent_type: "general-purpose",
  name: "developer"
});
// 设置依赖
// TaskUpdate({ taskId: "2", addBlockedBy: ["1"] });
```

---

### 4. 竞技场拓扑 (Arena) 🏟️
适合：需要多方案竞争、择优录取的任务

```
  方案A      方案B      方案C
     \         |         /
      \        |        /
       \       |       /
        \      |      /
         \     |     /
          \    |    /
           judge（裁决）
```

**使用场景**：
- 算法选型
- UI 设计方案选择
- 关键技术决策

**通信规则**：
- 竞争者并行提出方案
- 评委独立评估
- 最终决策者可参考评委意见

**代码示例**：
```javascript
// 竞技场拓扑配置
const arenaTopology = {
  type: "arena",
  competitors: ["solution-A", "solution-B", "solution-C"],
  judges: ["architect-1", "architect-2"],
  finalDecision: "tech-lead",
  evaluationCriteria: ["性能", "可维护性", "成本"]
};

// 竞争者
Task({
  description: "解决方案A",
  prompt: `提出你的解决方案，突出优势...`,
  name: "solution-A"
});

Task({
  description: "解决方案B",
  prompt: `提出你的解决方案，突出优势...`,
  name: "solution-B"
});

// 评委
Task({
  description: "方案评审",
  prompt: `评审所有方案，按标准打分...`,
  name: "judge"
});
```

---

## 拓扑选择决策表

| 任务类型 | 推荐拓扑 | 原因 |
|----------|----------|------|
| 新功能开发 | 星型 或 流水线 | 需要协调或多个阶段 |
| Bug 排查 | 竞技场（并行探索） | 快速定位根因 |
| 架构设计 | 网状 | 需要多方辩论 |
| 代码审查 | 竞技场（多 reviewer） | 多角度评估 |
| 技术选型 | 竞技场 | 方案对比 |
| 文档编写 | 流水线 | 明确流程 |
| 紧急修复 | 星型（简化版） | 快速决策 |

## 动态切换

```javascript
// 根据任务进展动态切换拓扑
function switchTopology(current, newTopology) {
  // 1. 保存当前状态
  const snapshot = captureTeamState();

  // 2. 通知所有成员
  broadcast({
    type: "topology_change",
    from: current.type,
    to: newTopology.type,
    reason: newTopology.reason
  });

  // 3. 重新配置通信规则
  reconfigureCommunication(newTopology);

  // 4. 恢复任务状态
  restoreTeamState(snapshot);
}

// 示例：从星型切换到网状（需要深度讨论时）
if (needDeepDiscussion) {
  switchTopology(starTopology, meshTopology);
}
```
