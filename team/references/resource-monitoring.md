# Team Skill - 资源监控指南

## 概述

资源监控器是 Team Skill v6.0 的可靠性保障组件，用于跟踪和监控多 Agent 协作过程中的资源使用情况，包括 Token 使用量、MCP 调用次数、成本估算等。

## 功能特性

### 1. Token 使用监控

- 记录每次调用的输入/输出 Token 数量
- 支持多种模型定价（Anthropic、OpenAI）
- 按 Agent 统计 Token 使用量
- 实时成本计算

### 2. MCP 调用监控

- 记录每个 MCP 工具的调用情况
- 跟踪调用耗时和成功率
- 检测调用频率异常
- 按工具类型统计分析

### 3. 成本计算

支持以下模型的定价计算：

| 模型 | 输入价格 ($/1K tokens) | 输出价格 ($/1K tokens) |
|------|------------------------|------------------------|
| claude-opus-4-6 | 15.0 | 75.0 |
| claude-sonnet-4 | 3.0 | 15.0 |
| claude-haiku-3 | 0.25 | 1.25 |
| gpt-4o | 5.0 | 15.0 |
| gpt-4o-mini | 0.15 | 0.6 |
| gpt-3.5-turbo | 0.5 | 1.5 |

### 4. 预算管理

- 可设置预算上限（默认 $10）
- 预警阈值：80%
- 严重阈值：95%
- 超预算自动告警

### 5. 资源报告

生成包含以下内容的 JSON 报告：
- 会话概览（时长、总成本、总Token数）
- 按模型统计
- 按工具统计MCP调用
- Agent资源使用排行
- 成本趋势分析
- 预算使用情况

## 使用方法

### 初始化监控

```javascript
const ResourceMonitor = require('./hooks/resource-monitor');

// 初始化
ResourceMonitor.initialize({
  teamName: 'my-team',
  sessionId: 'session-001',
  budget: {
    limit: 50.0,  // $50 USD
    currency: 'USD'
  }
});
```

### 记录 Token 使用

```javascript
ResourceMonitor.recordTokenUsage({
  model: 'claude-opus-4-6',
  inputTokens: 1500,
  outputTokens: 800,
  agentId: 'backend-developer',
  metadata: {
    taskId: 'task-001',
    operation: 'code-review'
  }
});
```

### 记录 MCP 调用

```javascript
ResourceMonitor.recordMCPCall({
  toolName: 'Read',
  duration: 150,  // 毫秒
  success: true,
  agentId: 'backend-developer',
  metadata: {
    filePath: '/path/to/file'
  }
});
```

### 生成报告

```javascript
// 生成资源报告
const report = ResourceMonitor.generateResourceReport();

// 保存报告到文件
ResourceMonitor.saveResourceReport(report);
```

### 关闭监控

```javascript
// 生成最终报告并清理
const finalReport = ResourceMonitor.shutdown();
```

## CLI 使用

```bash
# 初始化监控
node resource-monitor.js init --team my-team --budget 50

# 生成报告
node resource-monitor.js report

# 查看统计
node resource-monitor.js stats

# 关闭监控
node resource-monitor.js shutdown
```

## 报告格式

资源报告以 JSON 格式保存，包含以下结构：

```json
{
  "timestamp": "2026-02-20T10:30:00.000Z",
  "teamName": "my-team",
  "sessionId": "session-001",
  "sessionDuration": {
    "milliseconds": 3600000,
    "formatted": "1h 0m 0s"
  },
  "summary": {
    "totalTokens": 50000,
    "totalInputTokens": 30000,
    "totalOutputTokens": 20000,
    "totalCost": 2.5,
    "totalMCPCalls": 150,
    "mcpSuccessRate": "98.5%",
    "avgMCPDuration": "120ms",
    "budgetUsage": "25%",
    "budgetRemaining": 7.5
  },
  "budget": {
    "limit": 10,
    "used": 2.5,
    "remaining": 7.5,
    "currency": "USD",
    "usagePercent": 25
  },
  "tokenStats": {
    "byModel": [...],
    "recentRecords": [...]
  },
  "mcpStats": {
    "total": 150,
    "success": 148,
    "failed": 2,
    "successRate": "98.5%",
    "avgDuration": "120ms",
    "byTool": [...],
    "recentRecords": [...]
  },
  "agentRankings": [...],
  "alerts": [...],
  "trends": {
    "hourlyTokenRate": 5000,
    "hourlyMCPRate": 25,
    "hourlyCost": 0.5,
    "estimatedHoursRemaining": 15
  }
}
```

## 集成说明

### 与 Health Check 集成

资源监控器已集成到 Health Check 系统中：
- 每 60 秒自动生成资源报告
- 预算告警通过消息队列发送给 Coordinator
- 资源数据保存在团队状态目录

### 文件位置

- 监控器：`~/.claude/skills/team/hooks/resource-monitor.js`
- 状态数据：`~/.claude/tasks/{team-name}/resource-monitor.json`
- 报告文件：`~/.claude/tasks/{team-name}/resource-report.json`

## 告警类型

| 告警类型 | 级别 | 触发条件 |
|----------|------|----------|
| budget_warning | warning | 预算使用率 >= 80% |
| budget_exceeded | critical | 预算使用率 >= 95% |
| mcp_rate_high | warning | MCP调用 > 60次/分钟 |
| token_usage_high | warning | Token使用量接近上限 |

## 配置选项

### 预算配置

```javascript
const BUDGET_CONFIG = {
  defaultBudget: 10.0,           // 默认预算：$10
  warningThreshold: 0.8,         // 预警阈值：80%
  criticalThreshold: 0.95,       // 严重阈值：95%
  maxMCPCallsPerMinute: 60,      // 每分钟最大MCP调用数
  maxTokensPerSession: 1000000,  // 每会话最大Token数
};
```

### 添加新模型定价

```javascript
TOKEN_PRICING['my-model'] = {
  input: 5.0,   // $/1K tokens
  output: 15.0  // $/1K tokens
};
```

## 最佳实践

1. **及时记录**：在每次模型调用后立即记录 Token 使用
2. **错误处理**：MCP 调用失败也要记录，用于分析失败率
3. **合理预算**：根据任务复杂度设置合理预算
4. **定期检查**：定期查看资源报告，优化资源使用
5. **告警响应**：收到预算告警时及时调整策略

## 故障排除

### 成本计算不准确

- 检查模型名称是否正确匹配定价表
- 确认 Token 计数是否包含系统提示词

### 报告未生成

- 检查团队状态目录是否存在
- 确认文件系统权限

### 预算告警未触发

- 检查预算是否正确设置
- 确认告警阈值配置

## 版本历史

- v6.0.0 (2026-02-20): 初始版本，支持 Token/MCP 监控、成本计算、预算管理
