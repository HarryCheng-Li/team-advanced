# 渐进式自主框架

## 五级自主体系

```
L1 全人工 ←────── L2 辅助决策 ←────── L3 条件自主 ←────── L4 监督自主 ←────── L5 全自主
  AI只建议      AI推荐，人确认      低风险AI自主        AI自主，人监督       AI完全自主
                高风险需确认        高风险人确认        事后汇报           事后汇报
```

---

## 自主级别详解

### L1: 全人工 (Full Manual)
- **AI 角色**：纯顾问，只提供建议
- **决策权**：完全由人决定
- **适用场景**：
  - 高风险架构决策
  - 涉及安全/合规的关键修改
  - 用户明确要求控制

```javascript
const L1_Config = {
  level: 1,
  name: "全人工",
  aiRole: "advisor",
  decisionAuthority: "human-only",
  interactions: {
    beforeAction: "必须询问确认",
    duringAction: "实时汇报每一步",
    afterAction: "详细报告结果"
  }
};
```

---

### L2: 辅助决策 (Assisted Decision)
- **AI 角色**：推荐方案，等待确认
- **决策权**：AI 推荐 → 人确认
- **适用场景**：
  - 中等风险决策
  - 有多种可行方案时
  - 需要解释技术选型时

```javascript
const L2_Config = {
  level: 2,
  name: "辅助决策",
  aiRole: "recommender",
  decisionAuthority: "ai-proposes-human-confirms",
  interactions: {
    beforeAction: "提出方案，等待确认",
    duringAction: "关键节点汇报",
    afterAction: "总结执行结果"
  }
};

// 使用示例
Task({
  description: "技术选型建议",
  prompt: `分析并推荐数据库方案。

## 输出格式
\`\`\`yaml
推荐方案: PostgreSQL
理由:
  - 关系型数据需要 ACID
  - 团队熟悉度高
备选方案:
  - MongoDB: 适合文档存储，但不符合需求
  - MySQL: 可行，但功能不如 PostgreSQL 丰富

建议: 使用 PostgreSQL
\`\`\`

## 重要
这是 L2 级别任务，必须等待用户确认后才能继续。`,
  subagent_type: "Plan"
});

// 等待确认
AskUserQuestion({
  question: "推荐使用 PostgreSQL，您是否同意？",
  options: [
    { label: "同意使用 PostgreSQL", value: "approve" },
    { label: "选择其他方案", value: "other" },
    { label: "需要更多信息", value: "more-info" }
  ]
});
```

---

### L3: 条件自主 (Conditional Autonomy) ⭐ 默认级别
- **AI 角色**：低风险自主，高风险确认
- **决策权**：
  - 低风险：AI 自主执行
  - 高风险：询问确认
- **适用场景**：
  - 日常开发任务
  - 明确的代码实现
  - 已知模式的 Bug 修复

```javascript
const L3_Config = {
  level: 3,
  name: "条件自主",
  aiRole: "conditional-autonomous",
  decisionAuthority: "ai-autonomous-with-checkpoints",
  riskThreshold: {
    low: { autonomy: "full", notification: "after" },
    medium: { autonomy: "partial", notification: "during" },
    high: { autonomy: "none", notification: "before" }
  }
};

// 风险检测函数
function assessRisk(task) {
  let riskScore = 0;

  // 高风险指标
  if (task.affectsProduction) riskScore += 3;
  if (task.involvesSecurity) riskScore += 3;
  if (task.estimatedCost > 1000) riskScore += 2;
  if (task.irreversible) riskScore += 2;

  // 中风险指标
  if (task.changesApi) riskScore += 1;
  if (task.affectsMultipleModules) riskScore += 1;
  if (task.uncertainty > 0.5) riskScore += 1;

  if (riskScore >= 4) return "high";
  if (riskScore >= 2) return "medium";
  return "low";
}

// L3 执行逻辑
async function executeL3(task) {
  const risk = assessRisk(task);

  if (risk === "high") {
    // 高风险：询问确认
    const approved = await AskUserQuestion({
      question: `即将执行高风险任务：${task.description}，是否继续？`,
      options: ["继续", "查看详情", "取消"]
    });
    if (!approved) return;
  }

  // 执行任务
  const result = await Task(task);

  if (risk === "medium") {
    // 中风险：执行中汇报关键节点
    await SendMessage({
      recipient: "product-owner",
      content: `任务进行中：${task.description}\n当前进度：50%`,
      summary: "任务进度更新"
    });
  }

  // 低风险：执行后汇报
  return result;
}
```

---

### L4: 监督自主 (Supervised Autonomy)
- **AI 角色**：自主执行，实时汇报
- **决策权**：AI 自主，人监督
- **适用场景**：
  - 紧急修复
  - 明确的优化任务
  - 高置信度的重构

```javascript
const L4_Config = {
  level: 4,
  name: "监督自主",
  aiRole: "autonomous-with-oversight",
  decisionAuthority: "ai-autonomous-human-supervises",
  interactions: {
    beforeAction: "简要通知开始",
    duringAction: "关键节点实时汇报",
    afterAction: "完整报告，可回溯"
  },
  checkpoints: ["25%", "50%", "75%", "100%"]
};

// L4 执行逻辑
async function executeL4(task) {
  // 1. 简要通知
  SendMessage({
    recipient: "product-owner",
    content: `开始执行任务：${task.description}（监督模式）`,
    summary: "任务开始"
  });

  // 2. 带检查点执行
  const checkpoints = [0.25, 0.50, 0.75, 1.0];
  for (const cp of checkpoints) {
    await executeToCheckpoint(task, cp);

    SendMessage({
      recipient: "product-owner",
      content: `进度：${cp * 100}% - ${getCurrentStatus()}`,
      summary: `进度 ${cp * 100}%`
    });
  }

  // 3. 完整报告
  return generateFullReport(task);
}
```

---

### L5: 全自主 (Full Autonomy)
- **AI 角色**：完全自主，事后汇报
- **决策权**：完全由 AI 决定
- **适用场景**：
  - 例行任务
  - 低风险的自动化
  - 用户已充分信任

```javascript
const L5_Config = {
  level: 5,
  name: "全自主",
  aiRole: "fully-autonomous",
  decisionAuthority: "ai-full-control",
  interactions: {
    beforeAction: "无通知",
    duringAction: "仅异常时汇报",
    afterAction: "简要总结"
  }
};

// L5 执行逻辑
async function executeL5(task) {
  try {
    const result = await Task(task);

    // 仅完成后简要汇报
    SendMessage({
      recipient: "product-owner",
      content: `✅ 任务完成：${task.description}（耗时 ${result.duration}）`,
      summary: "任务完成"
    });

    return result;
  } catch (error) {
    // 异常时升级汇报
    escalateToL4(task, error);
  }
}
```

---

## 自主级别选择算法

```javascript
function determineAutonomyLevel(task, context) {
  const factors = {
    // 降低自主级别的因素（更保守）
    conservativeFactors: [
      { condition: task.isProduction, impact: -2 },
      { condition: task.involvesSecurity, impact: -2 },
      { condition: task.userIsBeginner, impact: -1 },
      { condition: task.highStake, impact: -2 },
      { condition: task.noRollbackPlan, impact: -1 }
    ],

    // 提高自主级别的因素（更激进）
    aggressiveFactors: [
      { condition: task.isRoutine, impact: +1 },
      { condition: task.userTrustsAI, impact: +1 },
      { condition: task.hasGoodTests, impact: +1 },
      { condition: task.uncertainty < 0.3, impact: +1 },
      { condition: task.isUrgent, impact: +1 }
    ]
  };

  // 计算基础级别（默认 L3）
  let level = 3;

  // 应用影响因素
  factors.conservativeFactors.forEach(f => {
    if (f.condition) level += f.impact;
  });

  factors.aggressiveFactors.forEach(f => {
    if (f.condition) level += f.impact;
  });

  // 限制范围 [1, 5]
  return Math.max(1, Math.min(5, level));
}
```

---

## 动态级别调整

```javascript
// 根据执行反馈动态调整
function adjustAutonomyLevel(currentLevel, feedback) {
  if (feedback.successRate < 0.7) {
    // 成功率低，降级
    return Math.max(1, currentLevel - 1);
  }

  if (feedback.successRate > 0.95 && feedback.userSatisfaction > 4) {
    // 成功率高，用户满意，升级
    return Math.min(5, currentLevel + 1);
  }

  return currentLevel;
}

// 每 5 个任务评估一次
const taskHistory = [];

function evaluateAndAdjustLevel() {
  if (taskHistory.length >= 5) {
    const recentTasks = taskHistory.slice(-5);
    const feedback = {
      successRate: recentTasks.filter(t => t.success).length / 5,
      userSatisfaction: average(recentTasks.map(t => t.userRating))
    };

    const newLevel = adjustAutonomyLevel(currentLevel, feedback);

    if (newLevel !== currentLevel) {
      SendMessage({
        recipient: "user",
        content: `根据近期表现，自主级别从 L${currentLevel} 调整为 L${newLevel}`,
        summary: "自主级别调整"
      });
      currentLevel = newLevel;
    }

    taskHistory.length = 0; // 清空历史
  }
}
```

---

## 用户界面

```javascript
// 在 Phase 0 确定自主级别
Task({
  description: "确定自主级别",
  prompt: `分析任务特征，推荐自主级别。

## 分析维度
1. 任务风险（高/中/低）
2. 用户技术背景（初学者/中级/专家）
3. 时间紧迫性
4. 是否有回滚方案

## 输出
\`\`\`yaml
推荐级别: L3
理由:
  - 生产环境部署（高风险）
  - 用户是中级开发者
  - 有完整的测试覆盖
调整建议:
  - 数据库修改需要确认
  - 代码生成可以自主
\`\`\``,
  subagent_type: "Plan",
  name: "autonomy-assessor"
});

// 向用户确认
AskUserQuestion({
  question: "建议使用 L3（条件自主）级别：\n- 低风险任务：AI 自主执行\n- 高风险任务：AI 询问后执行\n\n您是否同意？",
  options: [
    { label: "同意 L3（推荐）", value: "L3" },
    { label: "更保守（L2）", value: "L2" },
    { label: "更激进（L4）", value: "L4" },
    { label: "完全手动（L1）", value: "L1" }
  ]
});
```

---

## 完整工作流程

```javascript
// Phase 0: 确定自主级别
const autonomyLevel = determineAutonomyLevel(task, userContext);

// Phase 1-7: 根据级别执行任务
switch (autonomyLevel) {
  case 1: return executeL1(task);
  case 2: return executeL2(task);
  case 3: return executeL3(task);
  case 4: return executeL4(task);
  case 5: return executeL5(task);
}

// Phase 8: 收集反馈，用于后续级别调整
taskHistory.push({
  task: task.name,
  success: result.success,
  userRating: result.userSatisfaction
});
evaluateAndAdjustLevel();
```
