# Team 5.0 可靠性保障框架

> 版本：5.0.0 | 更新时间：2026-02-19

## ⭐ v5.0 新增：三角色架构可靠性保障

### 核心原则

```
┌─────────────────────────────────────────────────────────────┐
│                    价值观优先级排序                          │
├─────────────────────────────────────────────────────────────┤
│  1. 准确完成  - 任务必须完整、正确地完成                     │
│  2. 质量保证  - 输出必须符合预期标准                         │
│  3. 用户满意  - 用户对结果满意                              │
│  ...                                                        │
│  N. 速度     - 快是好的，但不是首要目标                      │
└─────────────────────────────────────────────────────────────┘
```

### 三角色架构

```
┌─────────────────────────────────────────────────────────────┐
│  Coordinator (协调者)                                        │
│  - 只协调，不执行                                            │
│  - 禁止：WebSearch、Read(研究)、Write(研究内容)             │
│  - 职责：创建团队、派发任务、整合结果、汇报用户              │
└─────────────────────────────────────────────────────────────┘
         │                           │
         ▼                           ▼
┌─────────────────┐         ┌─────────────────┐
│ Executor (执行者)│◄───────►│ Supervisor (监督者)│
│ - 完成具体任务   │  通信    │ - 每30秒健康检查  │
│ - 每60秒报告进度 │         │ - 检测异常        │
│ - 遇困难请求帮助 │         │ - 做出调整决策    │
└─────────────────┘         └─────────────────┘
```

### 状态机

```
INIT → DISPATCHING → WAITING → VALIDATING → DONE
                         │
                         ▼
                    CHECKING（健康检查）
                         │
            ┌────────────┼────────────┐
            ▼            ▼            ▼
        CONTINUE      ASSIST       RESTART
        继续等待      提供帮助      重启成员
```

---

## ⭐ v5.0 新增：健康检查机制

### 配置参数

```yaml
health_check:
  frequency: 30s           # 健康检查频率
  idle_warning: 2min       # 空闲警告阈值
  idle_timeout: 5min       # 空闲超时阈值
  progress_stale: 2min     # 进度停滞阈值

mcp_timeout:
  default: 30s             # MCP 调用默认超时
  max: 60s                 # MCP 调用最大超时

termination:
  graceful_timeout: 30s    # 优雅关闭等待时间
  force_kill_after: 60s    # 强制终止时间
```

### 检查项目

| 检查项 | 触发条件 | 严重程度 | 行动 |
|--------|----------|----------|------|
| **进度停滞** | 进度 > 2min 未更新 | warning | 发送询问 |
| **空闲过久** | 空闲 > 2min | warning → critical | 诊断 → 可能重启 |
| **错误过多** | 错误 >= 3 次 | warning | 提供协助 |
| **MCP 卡死** | I/O > 60s 无响应 | critical | 强制终止 |

### 决策类型

| 决策 | 触发条件 | 行动 |
|------|----------|------|
| **CONTINUE** | 成员响应正常 | 继续监控 |
| **ASSIST** | 成员需要帮助 | 新增协作成员或提供指导 |
| **RESTART** | 无响应/卡死 | 中止并派发新成员 |
| **REPLAN** | 进度 < 50% 且超时 | 重新规划任务 |

---

## ⭐ v5.0 新增：MCP 调用超时和强制终止

### 问题背景

Agent 可能卡在 MCP 调用上，无法响应关闭信号。

### 超时机制

```javascript
// MCP 调用超时配置
const mcpTimeout = {
  default: 30000,    // 默认 30 秒
  max: 60000,        // 最大 60 秒
  onTimeout: 'retry_once_then_fail'
};

// 超时处理
async function mcpCallWithTimeout(fn, timeout = mcpTimeout.default) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const result = await fn(controller.signal);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      // 超时，重试一次
      return await retryOnce(fn, timeout);
    }
    throw error;
  }
}
```

### 强制终止机制

```javascript
// 强制终止流程
async function forceTerminate(agentId) {
  // 1. 尝试优雅关闭
  await sendShutdownRequest(agentId);

  // 2. 等待优雅关闭超时
  await sleep(GRACEFUL_TIMEOUT);

  // 3. 如果仍在运行，强制终止
  if (isAgentRunning(agentId)) {
    console.log(`[FORCE KILL] 强制终止 Agent: ${agentId}`);
    await killAgent(agentId);
  }

  // 4. 派发接替者
  await dispatchReplacement(agentId);
}
```

---

## 四大支柱

```
+-------------+-------------+-------------+-------------+
|   熔断器    |   降级策略   |  可观测性   |   审计日志   |
|  Circuit    │ Degradation │Observability│   Audit     |
│   Breaker   │  Strategy   │             │    Log      │
+-------------+-------------+-------------+-------------+
```

---

## 1. 熔断器 (Circuit Breaker)

**原理**：当 Agent 连续失败时，自动停止调用并切换到备用方案

```javascript
class CircuitBreaker {
  constructor(options) {
    this.failureThreshold = options.failureThreshold || 3;
    this.timeout = options.timeout || 60000; // 1分钟
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.agentName = options.agentName || 'unknown';
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.onCircuitOpen();
    }
  }

  onCircuitOpen() {
    // 触发熔断，通知 tech-lead
    // 切换到备用 Agent
    console.log(`[ALERT] Agent ${this.agentName} 熔断触发`);
    notifyTechLead({
      type: 'circuit_breaker_opened',
      agent: this.agentName,
      failureCount: this.failureCount,
      timestamp: new Date().toISOString()
    });
    switchToBackupAgent(this.agentName);
  }
}

// 使用示例
const breaker = new CircuitBreaker({
  failureThreshold: 3,
  timeout: 60000,
  agentName: 'backend-developer'
});

try {
  const result = await breaker.execute(() =>
    Task({ name: 'backend-dev', ... })
  );
} catch (error) {
  // 熔断或失败，使用备用 Agent
  const fallbackResult = await Task({ name: 'backend-dev-backup', ... });
}
```

---

## 2. 降级策略 (Degradation Strategy)

**四级降级体系**：

```javascript
const degradationLevels = {
  LEVEL_0: {
    name: '完整功能',
    description: '所有 Agent 正常运行',
    agentCount: 'full',
    features: 'all',
    criteria: '系统健康'
  },

  LEVEL_1: {
    name: '简化功能',
    description: '核心 Agent 运行，非核心功能关闭',
    agentCount: 'core-only',
    features: ['essential'],
    criteria: '部分 Agent 失败或响应超时'
  },

  LEVEL_2: {
    name: '最小功能',
    description: '仅保留最基本的 Single-Agent 模式',
    agentCount: 1,
    features: ['minimal'],
    criteria: '多个 Agent 失败'
  },

  LEVEL_3: {
    name: '手动模式',
    description: 'AI 辅助，人工决策',
    agentCount: 0,
    features: ['suggestions-only'],
    criteria: '系统故障或高风险场景'
  }
};

// 自动降级逻辑
function autoDegrade(currentLevel, healthStatus) {
  if (healthStatus.failedAgents > 2 && currentLevel > 1) {
    return degradeToLevel(2);
  }
  if (healthStatus.failedAgents > 0 && currentLevel > 0) {
    return degradeToLevel(1);
  }
  if (healthStatus.criticalError) {
    return degradeToLevel(3);
  }
  return currentLevel;
}

// 降级执行
async function degradeToLevel(level) {
  const levelInfo = degradationLevels[`LEVEL_${level}`];
  console.log(`[DEGRADE] 降级到 Level ${level}: ${levelInfo.name}`);

  // 1. 保存当前状态
  await saveCurrentState();

  // 2. 优雅关闭非必要 Agent
  await shutdownNonEssentialAgents();

  // 3. 通知 tech-lead
  SendMessage({
    type: 'message',
    recipient: 'tech-lead',
    content: `[系统降级] 当前运行级别: ${levelInfo.name}\n原因: ${levelInfo.criteria}\n影响: ${levelInfo.features}`,
    summary: '系统降级通知'
  });

  // 4. 切换到降级模式
  switchToDegradedMode(level);
}
```

---

## 3. 可观测性 (Observability)

**三层监控**：

### Agent 级监控
```javascript
const agentTelemetry = {
  agentName: 'backend-developer',
  task: 'api-design',
  startTime: '2026-02-18T10:00:00Z',
  endTime: '2026-02-18T10:15:00Z',
  duration: 900, // 秒

  // Token 使用
  tokenUsage: {
    input: 1500,
    output: 2300,
    total: 3800
  },

  // 工具调用
  toolCalls: [
    { tool: 'Read', count: 5, duration: 2000 },
    { tool: 'Edit', count: 3, duration: 1500 },
    { tool: 'Bash', count: 2, duration: 3000 }
  ],

  // 决策记录
  decisions: [
    { timestamp: '...', decision: '选择 REST over GraphQL', rationale: '...' }
  ],

  // 错误记录
  errors: [
    { timestamp: '...', error: 'File not found', severity: 'warning', recovered: true }
  ],

  // 质量指标
  qualityMetrics: {
    codeCoverage: 0.92,
    complexity: 12,
    lintErrors: 0
  }
};
```

### Team 级监控
```javascript
const teamTelemetry = {
  teamName: 'feature-login',
  topology: 'star',
  phase: 'Phase 4',

  // 协作指标
  collaboration: {
    messageCount: 45,
    avgResponseTime: 120, // 秒
    conflictCount: 2,
    conflictResolutionTime: 300
  },

  // 进度指标
  progress: {
    plannedTasks: 8,
    completedTasks: 6,
    blockedTasks: 1,
    estimatedCompletion: '2026-02-18T14:00:00Z'
  },

  // 健康状态
  health: {
    status: 'healthy', // healthy, degraded, critical
    agentHealth: {
      'backend-dev': 'healthy',
      'frontend-dev': 'healthy',
      'test-engineer': 'degraded'
    }
  }
};
```

### 系统级监控
```javascript
const systemTelemetry = {
  timestamp: '2026-02-18T12:00:00Z',

  // 全局统计
  globalStats: {
    activeTeams: 5,
    activeAgents: 23,
    totalTasks: 156,
    successRate: 0.94
  },

  // 资源使用
  resourceUsage: {
    totalTokens: 450000,
    apiCalls: 1200,
    averageLatency: 2500 // ms
  },

  // 告警
  alerts: [
    { type: 'high_latency', severity: 'warning', agent: 'architect' },
    { type: 'low_success_rate', severity: 'critical', team: 'team-2' }
  ]
};
```

**监控 Dashboard 配置**：
```yaml
# 实时监控指标
metrics:
  - name: agent_response_time
    type: histogram
    labels: [agent_name, task_type]

  - name: task_success_rate
    type: gauge
    labels: [team_name, phase]

  - name: token_usage
    type: counter
    labels: [agent_name]

  - name: error_rate
    type: rate
    labels: [error_type, severity]
```

---

## 4. Agent 失败处理流程

```
+----------------+     +----------------+     +----------------+     +----------------+
|   检测失败     | --> |   触发熔断     | --> |   降级处理     | --> |  通知 tech-lead |
| Detect Failure |     | Trigger Breaker|     |   Degrade      |     |   Notify Lead  |
+----------------+     +----------------+     +----------------+     +----------------+
```

```javascript
async function handleAgentFailure(agentName, error) {
  // 1. 检测失败
  logError(agentName, error);
  recordFailure(agentName, error);

  // 2. 触发熔断
  const breaker = getCircuitBreaker(agentName);
  breaker.onFailure();

  // 3. 降级处理
  if (breaker.state === 'OPEN') {
    const currentLevel = getCurrentDegradationLevel();
    const newLevel = autoDegrade(currentLevel, getHealthStatus());
    if (newLevel !== currentLevel) {
      await degradeToLevel(newLevel);
    }
  }

  // 4. 通知 tech-lead
  SendMessage({
    type: 'message',
    recipient: 'tech-lead',
    content: `[Agent 失败] ${agentName} 遇到错误: ${error.message}\n熔断状态: ${breaker.state}\n当前降级级别: LEVEL_${getCurrentDegradationLevel()}`,
    summary: 'Agent 失败通知'
  });
}
```

---

## 5. 恢复机制 (Recovery)

### HALF_OPEN 状态测试
```javascript
async function testRecovery(breaker) {
  if (breaker.state !== 'HALF_OPEN') return;

  try {
    // 发送测试任务
    const testResult = await breaker.execute(async () => {
      return await sendTestTask(breaker.agentName);
    });

    // 测试成功，恢复 Agent
    breaker.onSuccess();
    logRecovery(breaker.agentName, 'success');

    // 尝试提升降级级别
    await attemptUpgrade();

  } catch (error) {
    // 测试失败，回到 OPEN 状态
    breaker.onFailure();
    logRecovery(breaker.agentName, 'failed', error);
  }
}
```

### 逐步恢复策略
```javascript
async function attemptUpgrade() {
  const currentLevel = getCurrentDegradationLevel();
  if (currentLevel === 0) return; // 已是最高级别

  const healthStatus = getHealthStatus();

  // 检查是否可以提升
  if (healthStatus.failedAgents === 0 && healthStatus.degradedAgents === 0) {
    const newLevel = currentLevel - 1;
    console.log(`[RECOVERY] 尝试恢复到 Level ${newLevel}`);

    // 逐步恢复
    await upgradeToLevel(newLevel);

    // 通知 tech-lead
    SendMessage({
      type: 'message',
      recipient: 'tech-lead',
      content: `[系统恢复] 已恢复到 Level ${newLevel}: ${degradationLevels[`LEVEL_${newLevel}`].name}`,
      summary: '系统恢复通知'
    });
  }
}

async function upgradeToLevel(level) {
  // 1. 初始化恢复的 Agent
  await initializeRecoveredAgents();

  // 2. 恢复完整功能
  await restoreFullFunctionality(level);

  // 3. 更新降级级别
  setCurrentDegradationLevel(level);

  // 4. 记录审计日志
  writeAuditLog({
    type: 'SYSTEM_RECOVERY',
    fromLevel: level + 1,
    toLevel: level,
    timestamp: new Date().toISOString()
  });
}
```

### 恢复检测周期
```javascript
const recoveryConfig = {
  // HALF_OPEN 状态测试间隔
  halfOpenTestInterval: 60000, // 1分钟

  // 恢复检测间隔
  recoveryCheckInterval: 300000, // 5分钟

  // 连续成功次数阈值（恢复到 CLOSED）
  successThresholdForRecovery: 3,

  // 降级级别提升检查间隔
  upgradeCheckInterval: 600000 // 10分钟
};

// 定期恢复检测
setInterval(async () => {
  const breakers = getAllCircuitBreakers();

  for (const breaker of breakers) {
    if (breaker.state === 'HALF_OPEN') {
      await testRecovery(breaker);
    }
  }

  // 检查是否可以提升降级级别
  await attemptUpgrade();

}, recoveryConfig.recoveryCheckInterval);
```

---

## 6. 审计日志 (Audit Log)

**审计事件类型**：

```javascript
const auditEvents = {
  // 决策审计
  DECISION: {
    timestamp: '2026-02-18T10:30:00Z',
    type: 'DECISION',
    actor: 'architect',
    decision: '选择 PostgreSQL 作为主数据库',
    rationale: '关系型数据，ACID 需求',
    alternatives: ['MongoDB', 'MySQL'],
    stakeholders: ['product-owner', 'tech-lead'],
    approvedBy: 'tech-lead',
    impact: 'high'
  },

  // 配置变更审计
  CONFIG_CHANGE: {
    timestamp: '2026-02-18T11:00:00Z',
    type: 'CONFIG_CHANGE',
    actor: 'tech-lead',
    change: '修改团队拓扑为网状',
    reason: '需要深度架构讨论',
    previousValue: 'star',
    newValue: 'mesh',
    rollbackPlan: '可切换回星型'
  },

  // 安全事件审计
  SECURITY: {
    timestamp: '2026-02-18T11:30:00Z',
    type: 'SECURITY',
    severity: 'high',
    event: '检测到 hardcoded secret',
    location: 'src/config/database.ts:15',
    detectedBy: 'security-reviewer',
    action: '阻止合并，通知修复'
  },

  // 降级事件审计
  DEGRADATION: {
    timestamp: '2026-02-18T12:00:00Z',
    type: 'DEGRADATION',
    fromLevel: 0,
    toLevel: 1,
    reason: 'frontend-dev 连续失败3次',
    triggeredBy: 'circuit-breaker',
    approvedBy: 'system-auto'
  }
};

// 审计日志写入
function writeAuditLog(event) {
  const logEntry = {
    ...event,
    id: generateUUID(),
    timestamp: new Date().toISOString(),
    integrity: calculateHash(event) // 防篡改
  };

  appendToFile('logs/audit.log', JSON.stringify(logEntry));
}
```

---

## 集成示例

```javascript
// 完整的可靠性保障示例
async function reliableTaskExecution(task) {
  // 1. 初始化熔断器
  const breaker = new CircuitBreaker({
    failureThreshold: 3,
    timeout: 60000,
    agentName: task.agentName
  });

  // 2. 记录开始
  writeAuditLog({
    type: 'TASK_START',
    task: task.name,
    agent: task.agentName
  });

  try {
    // 3. 执行任务（带熔断保护）
    const result = await breaker.execute(async () => {
      // 记录遥测
      const telemetry = startTelemetry();

      const output = await Task(task);

      // 结束遥测
      telemetry.end();
      reportTelemetry(telemetry);

      return output;
    });

    // 4. 记录成功
    writeAuditLog({
      type: 'TASK_COMPLETE',
      task: task.name,
      duration: result.duration
    });

    return result;

  } catch (error) {
    // 5. 处理失败
    writeAuditLog({
      type: 'TASK_FAILURE',
      task: task.name,
      error: error.message,
      action: 'triggering_degradation'
    });

    // 6. 尝试降级
    const degradedResult = await attemptDegradation(task, error);

    if (!degradedResult) {
      // 7. 降级也失败，通知人工介入
      await escalateToHuman(task, error);
    }

    return degradedResult;
  }
}
```

---

## 快速参考

### 熔断器状态
| 状态 | 含义 | 行为 |
|------|------|------|
| CLOSED | 正常 | 正常执行任务 |
| OPEN | 熔断 | 拒绝所有请求，等待超时 |
| HALF_OPEN | 探测 | 允许测试请求，决定是否恢复 |

### 降级级别
| 级别 | 名称 | 触发条件 |
|------|------|----------|
| LEVEL_0 | 完整功能 | 系统健康 |
| LEVEL_1 | 简化功能 | 部分 Agent 失败 |
| LEVEL_2 | 最小功能 | 多个 Agent 失败 |
| LEVEL_3 | 手动模式 | 系统故障/高风险 |

### 监控层级
| 层级 | 关注点 | 关键指标 |
|------|--------|----------|
| Agent | 单个 Agent | Token、工具调用、错误率 |
| Team | 团队协作 | 进度、健康状态、冲突 |
| System | 全局视图 | 资源使用、告警、成功率 |
