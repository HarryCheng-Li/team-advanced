# 性能优化指南

> 版本: 1.0.0 | 更新时间: 2026-02-20

本文档提供 Team Skill 性能优化建议，包括大规模团队配置、资源管理和最佳实践。

---

## 性能指标

### 关键指标

| 指标 | 良好 | 警告 | 严重 |
|------|------|------|------|
| 团队创建时间 | < 30s | 30-60s | > 60s |
| 消息延迟 | < 5s | 5-15s | > 15s |
| 健康检查耗时 | < 2s | 2-5s | > 5s |
| 内存使用 | < 500MB | 500MB-1GB | > 1GB |
| Token 消耗/小时 | < 50K | 50K-100K | > 100K |

---

## 大规模团队配置

### 团队规模建议

| 规模 | 成员数 | 适用场景 | 特殊配置 |
|------|--------|----------|----------|
| 小型 | 3-5 | 简单任务 | 默认配置 |
| 中型 | 6-10 | 标准开发 | 调整检查频率 |
| 大型 | 11-20 | 复杂项目 | 启用批量处理 |
| 超大型 | 20+ | 企业级 | 需要架构优化 |

### 大型团队优化配置

```javascript
// large-team-config.js
const HealthCheck = require('~/.claude/skills/team/hooks/health-check.js');

// 降低检查频率，减少开销
HealthCheck.CONFIG.healthCheckInterval = 60 * 1000;  // 60 秒

// 增加批处理大小
HealthCheck.CONFIG.batchSize = 10;

// 调整阈值避免频繁告警
HealthCheck.CONFIG.idleWarningThreshold = 5 * 60 * 1000;   // 5 分钟
HealthCheck.CONFIG.progressStaleThreshold = 5 * 60 * 1000; // 5 分钟

// 被动检测优化
HealthCheck.PASSIVE_CONFIG.runningStateThreshold = 60 * 1000;  // 60 秒
HealthCheck.PASSIVE_CONFIG.outputStuckThreshold = 90 * 1000;   // 90 秒
```

### 分层监控架构

对于 20+ 成员的团队，建议采用分层监控：

```
┌─────────────────────────────────────────┐
│         全局 Supervisor                  │
│    (监控所有子团队，每 60 秒)             │
└─────────────┬───────────────────────────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
┌───────┐ ┌───────┐ ┌───────┐
│子团队1 │ │子团队2 │ │子团队3 │
│(5-8人)│ │(5-8人)│ │(5-8人)│
│30s检查│ │30s检查│ │30s检查│
└───────┘ └───────┘ └───────┘
```

---

## Token 优化

### Token 消耗分析

```bash
# 查看 Token 使用报告
cat ~/.claude/tasks/<team-name>/resource-report.json | jq '.tokenStats'
```

### 优化策略

#### 1. 模型选择优化

```yaml
# 根据任务复杂度选择模型
简单任务 (代码审查、搜索):
  model: haiku
  成本节省: ~80%

中等任务 (功能开发、调试):
  model: sonnet
  性价比: 最佳

复杂任务 (架构设计、安全审查):
  model: opus
  质量优先: 必要
```

#### 2. Prompt 优化

```javascript
// 优化前 - 冗长
const prompt = `
  你是一个后端开发工程师。请帮我实现一个用户注册功能。
  需要包含邮箱验证、密码强度检查、数据库操作等。
  请使用 Node.js + Express + MongoDB 技术栈。
  ... (500+ tokens)
`;

// 优化后 - 精简
const prompt = `
  实现用户注册 API (Node.js/Express/MongoDB):
  - 邮箱格式验证
  - 密码强度: 8位+大小写+数字
  - 返回: {success, message, user}
`;
```

#### 3. 上下文压缩

```javascript
// 定期压缩对话历史
function compressHistory(messages) {
  // 保留关键信息，删除冗余
  const compressed = messages.map(m => ({
    role: m.role,
    content: m.content.length > 1000
      ? m.content.substring(0, 1000) + '...'
      : m.content
  }));
  return compressed;
}
```

---

## MCP 调用优化

### MCP 调用统计

```bash
# 查看 MCP 使用报告
cat ~/.claude/tasks/<team-name>/resource-report.json | jq '.mcpStats'
```

### 优化策略

#### 1. 批量操作

```javascript
// 优化前 - 多次调用
for (const file of files) {
  await Read({ file_path: file });  // N 次调用
}

// 优化后 - 批量读取
const contents = await Promise.all(
  files.map(f => Read({ file_path: f }))  // 并行调用
);
```

#### 2. 缓存结果

```javascript
// MCP 结果缓存
const mcpCache = new Map();

async function cachedRead(filePath) {
  if (mcpCache.has(filePath)) {
    return mcpCache.get(filePath);
  }

  const content = await Read({ file_path: filePath });
  mcpCache.set(filePath, content);
  return content;
}
```

#### 3. 减少不必要的调用

```javascript
// 优化前
const files = await Glob({ pattern: '**/*' });  // 获取所有文件
for (const file of files) {
  await Read({ file_path: file });  // 读取所有文件
}

// 优化后
const files = await Glob({ pattern: '**/*.js' });  // 只获取 JS 文件
const relevantFiles = files.filter(f =>
  !f.includes('node_modules') &&
  !f.includes('dist')
);
```

---

## 内存优化

### 内存使用监控

```javascript
// memory-monitor.js
setInterval(() => {
  const usage = process.memoryUsage();
  console.log({
    timestamp: new Date().toISOString(),
    rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
    heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
    heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`
  });
}, 60000);
```

### 优化策略

#### 1. 清理历史数据

```bash
# 定期清理旧的任务数据
find ~/.claude/tasks/ -type f -name "*.json" -mtime +7 -delete

# 保留最近的报告
ls -t ~/.claude/tasks/*/health-report.json | tail -n +10 | xargs rm
```

#### 2. 限制消息存储

```javascript
// 限制消息历史数量
const MAX_MESSAGES = 1000;

function cleanupOldMessages() {
  if (state.messageStore.size > MAX_MESSAGES) {
    const sorted = Array.from(state.messageStore.entries())
      .sort((a, b) => b[1].timestampMs - a[1].timestampMs);

    const toDelete = sorted.slice(MAX_MESSAGES);
    toDelete.forEach(([id]) => state.messageStore.delete(id));
  }
}
```

#### 3. 流式处理大文件

```javascript
// 使用流式读取大文件
const fs = require('fs');
const readline = require('readline');

async function processLargeFile(filePath) {
  const stream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: stream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    // 逐行处理，不占用大量内存
    processLine(line);
  }
}
```

---

## 并发优化

### 并发控制

```javascript
// 限制并发数
const pLimit = require('p-limit');
const limit = pLimit(5);  // 最多 5 个并发

async function processAgents(agents) {
  const results = await Promise.all(
    agents.map(agent =>
      limit(() => processAgent(agent))
    )
  );
  return results;
}
```

### 队列管理

```javascript
// 任务队列
class TaskQueue {
  constructor(concurrency = 3) {
    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  async add(task) {
    if (this.running < this.concurrency) {
      this.running++;
      try {
        return await task();
      } finally {
        this.running--;
        this.processQueue();
      }
    } else {
      return new Promise((resolve, reject) => {
        this.queue.push({ task, resolve, reject });
      });
    }
  }

  processQueue() {
    if (this.queue.length > 0 && this.running < this.concurrency) {
      const { task, resolve, reject } = this.queue.shift();
      this.add(task).then(resolve).catch(reject);
    }
  }
}
```

---

## 存储优化

### 文件组织

```
~/.claude/tasks/<team-name>/
├── current/                    # 当前活跃数据
│   ├── health-report.json     # 最新健康报告
│   ├── resource-report.json   # 最新资源报告
│   └── message-store.json     # 消息存储
├── archive/                   # 归档数据
│   ├── 2026-02-19/
│   ├── 2026-02-18/
│   └── ...
└── logs/                     # 日志文件
    ├── health-check.log
    └── passive-check.log
```

### 自动归档脚本

```bash
#!/bin/bash
# archive-old-data.sh

TEAM_DIR="$HOME/.claude/tasks/$1"
ARCHIVE_DIR="$TEAM_DIR/archive/$(date +%Y-%m-%d)"

mkdir -p "$ARCHIVE_DIR"

# 移动旧报告
find "$TEAM_DIR" -name "*.json" -mtime +1 -exec mv {} "$ARCHIVE_DIR" \;

# 压缩归档
tar -czf "$ARCHIVE_DIR.tar.gz" "$ARCHIVE_DIR"
rm -rf "$ARCHIVE_DIR"

# 删除超过 30 天的归档
find "$TEAM_DIR/archive" -name "*.tar.gz" -mtime +30 -delete
```

---

## 网络优化

### 连接池

```javascript
// 使用连接池复用连接
const http = require('http');
const agent = new http.Agent({
  keepAlive: true,
  maxSockets: 10,
  maxFreeSockets: 5,
  timeout: 60000,
  freeSocketTimeout: 30000
});

// 使用 agent 发送请求
http.request({
  hostname: 'api.example.com',
  agent: agent
}, callback);
```

### 请求合并

```javascript
// 合并多个请求
class RequestBatcher {
  constructor(batchSize = 10, delay = 100) {
    this.batchSize = batchSize;
    this.delay = delay;
    this.batch = [];
    this.timeout = null;
  }

  async add(request) {
    return new Promise((resolve, reject) => {
      this.batch.push({ request, resolve, reject });

      if (this.batch.length >= this.batchSize) {
        this.flush();
      } else if (!this.timeout) {
        this.timeout = setTimeout(() => this.flush(), this.delay);
      }
    });
  }

  async flush() {
    if (this.batch.length === 0) return;

    clearTimeout(this.timeout);
    this.timeout = null;

    const currentBatch = this.batch.splice(0, this.batchSize);

    try {
      // 批量处理请求
      const results = await Promise.all(
        currentBatch.map(item => this.process(item.request))
      );

      currentBatch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      currentBatch.forEach(item => {
        item.reject(error);
      });
    }
  }
}
```

---

## 监控和告警

### 性能监控仪表板

```javascript
// performance-dashboard.js
const fs = require('fs');
const path = require('path');

function generateDashboard(teamName) {
  const teamDir = path.join(process.env.HOME, '.claude', 'tasks', teamName);

  // 读取资源报告
  const resourceReport = JSON.parse(
    fs.readFileSync(path.join(teamDir, 'resource-report.json'), 'utf8')
  );

  // 读取健康报告
  const healthReport = JSON.parse(
    fs.readFileSync(path.join(teamDir, 'health-report.json'), 'utf8')
  );

  console.log('\n=== 性能仪表板 ===\n');

  console.log('资源使用:');
  console.log(`  Token: ${resourceReport.summary.totalTokens.toLocaleString()}`);
  console.log(`  成本: $${resourceReport.summary.totalCost.toFixed(2)}`);
  console.log(`  MCP 调用: ${resourceReport.summary.totalMCPCalls}`);
  console.log(`  预算使用: ${resourceReport.summary.budgetUsage}`);

  console.log('\n团队健康:');
  console.log(`  成员数: ${healthReport.summary.total}`);
  console.log(`  健康: ${healthReport.summary.healthy}`);
  console.log(`  警告: ${healthReport.summary.warning}`);
  console.log(`  严重: ${healthReport.summary.critical}`);

  console.log('\nAgent 状态:');
  healthReport.members.forEach(m => {
    const icon = m.healthStatus === 'healthy' ? '✓' :
                 m.healthStatus === 'warning' ? '⚠' : '✗';
    console.log(`  ${icon} ${m.id}: ${m.progress}% (${m.healthStatus})`);
  });
}

const teamName = process.argv[2] || 'default';
generateDashboard(teamName);
```

### 自动告警

```javascript
// alerts.js
const fs = require('fs');

function checkAlerts(teamName) {
  const report = JSON.parse(
    fs.readFileSync(`~/.claude/tasks/${teamName}/resource-report.json`, 'utf8')
  );

  const alerts = [];

  // Token 使用告警
  if (report.summary.budgetUsage > 80) {
    alerts.push({
      level: 'warning',
      message: `预算使用超过 80%: ${report.summary.budgetUsage}`
    });
  }

  if (report.summary.budgetUsage > 95) {
    alerts.push({
      level: 'critical',
      message: `预算使用超过 95%: ${report.summary.budgetUsage}`
    });
  }

  // MCP 成功率告警
  const mcpRate = parseFloat(report.summary.mcpSuccessRate);
  if (mcpRate < 90) {
    alerts.push({
      level: 'warning',
      message: `MCP 成功率低于 90%: ${mcpRate}%`
    });
  }

  return alerts;
}

// 每分钟检查一次
setInterval(() => {
  const alerts = checkAlerts('my-team');
  alerts.forEach(alert => {
    console[alert.level === 'critical' ? 'error' : 'warn'](
      `[${alert.level.toUpperCase()}] ${alert.message}`
    );
  });
}, 60000);
```

---

## 最佳实践总结

### 1. 团队规模

- 小型任务 (3-5 人): 使用默认配置
- 中型任务 (6-10 人): 降低检查频率到 60 秒
- 大型任务 (11+ 人): 采用分层监控架构

### 2. Token 管理

- 简单任务使用 Haiku 模型
- 定期压缩对话历史
- 使用缓存避免重复调用

### 3. MCP 优化

- 批量处理请求
- 缓存频繁访问的数据
- 限制并发数

### 4. 存储管理

- 定期归档旧数据
- 限制消息历史数量
- 使用流式处理大文件

### 5. 监控告警

- 设置预算告警阈值
- 监控 MCP 成功率
- 定期检查内存使用

---

## 相关文档

- [健康检查实现](../hooks/health-check.js) - 健康检查代码
- [资源监控](../references/resource-monitoring.md) - 资源监控指南
- [健康检查问题](health-check-issues.md) - 故障排查
- [消息确认问题](message-issues.md) - 消息系统故障排查

---

*本文档由 Team Skill 维护，最后更新: 2026-02-20*
