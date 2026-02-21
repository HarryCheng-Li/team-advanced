# 健康检查问题排查指南

> 版本: 1.0.0 | 更新时间: 2026-02-20

本文档帮助诊断和解决 Team Skill 健康检查系统的常见问题。

---

## 健康检查概述

健康检查系统 (`hooks/health-check.js`) 每 30 秒自动监控团队成员状态，检测以下异常：

- **进度停滞** - Agent 超过 2 分钟未更新进度
- **空闲过久** - Agent 处于空闲状态超过 2 分钟
- **错误过多** - Agent 错误次数超过 3 次
- **MCP 卡住** - MCP 调用超过 60 秒未返回
- **消息超时** - 消息发送后 60 秒未收到确认

---

## 常见问题诊断

### 问题 1: Agent 状态显示 "unknown"

#### 症状
```json
{
  "members": [
    {
      "id": "backend-developer",
      "status": "unknown",
      "healthStatus": "warning"
    }
  ]
}
```

#### 可能原因
1. Agent 尚未注册到健康检查系统
2. 状态文件损坏或丢失
3. 团队名称不匹配

#### 解决方案

**步骤 1: 检查状态文件**
```bash
ls -la ~/.claude/tasks/<team-name>/
# 应该看到: backend-developer.state.json
```

**步骤 2: 手动注册 Agent**
```javascript
const HealthCheck = require('~/.claude/skills/team/hooks/health-check.js');

HealthCheck.registerMember('backend-developer', {
  status: 'working',
  progress: 0
});
```

**步骤 3: 检查团队名称**
```bash
# 确认团队名称正确
cat ~/.claude/tasks/<team-name>/team-config.json
```

---

### 问题 2: MCP 调用卡住

#### 症状
```
[Health Check] CRITICAL: 成员 backend-developer MCP 调用卡住!
  工具: WebSearch, 持续时间: 120s
```

#### 可能原因
1. MCP 服务器响应缓慢
2. 网络连接问题
3. MCP 服务器无响应

#### 解决方案

**步骤 1: 查看 MCP 调用状态**
```bash
cat ~/.claude/tasks/<team-name>/health-report.json | grep mcpCall
```

**步骤 2: 手动终止卡住的任务**
```javascript
const HealthCheck = require('~/.claude/skills/team/hooks/health-check.js');

// 强制终止成员
await HealthCheck.forceTerminate('backend-developer', 'mcp_stuck');
```

**步骤 3: 调整 MCP 超时配置**
```javascript
// 在创建团队前修改配置
const HealthCheck = require('~/.claude/skills/team/hooks/health-check.js');

HealthCheck.CONFIG.mcpCallTimeout = 60000;      // 增加到 60 秒
HealthCheck.CONFIG.mcpStuckThreshold = 120000;  // 增加到 120 秒
```

---

### 问题 3: 健康检查未启动

#### 症状
- 没有看到 `[Health Check]` 日志输出
- 状态文件未更新
- 团队运行但没有监控

#### 可能原因
1. Hook 未正确触发
2. 团队创建时未启动健康检查
3. 进程异常退出

#### 解决方案

**步骤 1: 检查 Hook 配置**
```bash
cat ~/.claude/skills/team/hooks/hooks.json | grep -A5 team-created
```

**步骤 2: 手动启动健康检查**
```bash
node ~/.claude/skills/team/hooks/health-check.js --team <team-name> --interval 30
```

**步骤 3: 验证健康检查运行**
```bash
# 查看进程
ps aux | grep health-check

# 查看日志
tail -f ~/.claude/tasks/<team-name>/health-check.log
```

---

### 问题 4: 消息确认超时

#### 症状
```
[Health Check] 消息超时: msg_123456789
[Health Check] 消息已过期: msg_123456789
```

#### 可能原因
1. 接收方 Agent 未运行
2. 消息队列阻塞
3. 网络问题

#### 解决方案

**步骤 1: 检查消息状态**
```javascript
const HealthCheck = require('~/.claude/skills/team/hooks/health-check.js');

const status = HealthCheck.checkMessageStatus('msg_123456789');
console.log(status);
```

**步骤 2: 重试失败消息**
```javascript
// 重试特定消息
await HealthCheck.retryFailedMessages(['msg_123456789']);

// 重试所有失败消息
await HealthCheck.retryFailedMessages();
```

**步骤 3: 检查消息队列**
```bash
cat ~/.claude/tasks/<team-name>/message-queue.json
```

---

### 问题 5: 被动检测误报

#### 症状
```
[Passive Check] ⚠️ backend-developer: 可能MCP卡住 (置信度: 65%)
  └─ Running状态持续: 45s
```

但 Agent 实际上正在正常工作。

#### 可能原因
1. 检测阈值设置过于敏感
2. Agent 输出格式不符合预期
3. 正常的长耗时操作

#### 解决方案

**步骤 1: 调整被动检测阈值**
```javascript
const HealthCheck = require('~/.claude/skills/team/hooks/health-check.js');

// 增加阈值
HealthCheck.PASSIVE_CONFIG.runningStateThreshold = 60000;  // 60 秒
HealthCheck.PASSIVE_CONFIG.outputStuckThreshold = 90000;   // 90 秒
```

**步骤 2: 清除误报状态**
```javascript
// 清除特定成员的被动检测状态
HealthCheck.clearPassiveCheckState('backend-developer');
```

**步骤 3: 查看被动检测日志**
```bash
cat ~/.claude/tasks/<team-name>/passive-check-log.jsonl | tail -20
```

---

## 调试指南

### 启用详细日志

```javascript
// 在启动健康检查前设置调试模式
process.env.DEBUG_HEALTH_CHECK = 'true';

const HealthCheck = require('~/.claude/skills/team/hooks/health-check.js');
```

### 查看完整状态

```javascript
const HealthCheck = require('~/.claude/skills/team/hooks/health-check.js');

// 获取完整状态
const state = HealthCheck.getState();
console.log(JSON.stringify(state, null, 2));
```

输出示例：
```json
{
  "teamName": "my-team",
  "isRunning": true,
  "checkCount": 45,
  "memberCount": 5,
  "members": ["coordinator", "backend-developer", "frontend-developer"],
  "mcpCallsInProgress": [
    {
      "memberId": "backend-developer",
      "tool": "WebSearch",
      "duration": 35000
    }
  ],
  "pendingMessages": 2,
  "totalMessages": 25
}
```

### 手动执行健康检查

```javascript
const HealthCheck = require('~/.claude/skills/team/hooks/health-check.js');

// 手动执行一次检查
const anomalies = await HealthCheck.performHealthCheck();
console.log('检测到的异常:', anomalies);
```

---

## 配置参考

### 默认配置

```javascript
const CONFIG = {
  healthCheckInterval: 30 * 1000,        // 30 秒
  idleWarningThreshold: 2 * 60 * 1000,   // 2 分钟
  idleTimeoutThreshold: 5 * 60 * 1000,   // 5 分钟
  progressStaleThreshold: 2 * 60 * 1000, // 2 分钟
  mcpCallTimeout: 30 * 1000,             // 30 秒
  mcpStuckThreshold: 60 * 1000,          // 60 秒
  messageTimeout: 60 * 1000,             // 60 秒
  maxMessageRetries: 3,                  // 3 次
};
```

### 被动检测配置

```javascript
const PASSIVE_CONFIG = {
  runningStateThreshold: 30 * 1000,     // 30 秒
  outputStuckThreshold: 45 * 1000,      // 45 秒
  noOutputThreshold: 60 * 1000,         // 60 秒
};
```

---

## 最佳实践

### 1. 定期检查健康报告

```bash
# 添加到定时任务
crontab -e

# 每 5 分钟检查一次
*/5 * * * * cat ~/.claude/tasks/*/health-report.json | jq '.summary'
```

### 2. 设置告警阈值

```javascript
// 自定义告警逻辑
const HealthCheck = require('~/.claude/skills/team/hooks/health-check.js');

setInterval(async () => {
  const report = HealthCheck.generateHealthReport();

  if (report.summary.critical > 0) {
    // 发送告警通知
    console.error('CRITICAL: 发现严重异常！');
  }
}, 60000);
```

### 3. 保留历史记录

```bash
# 备份健康报告
mkdir -p ~/.claude/health-history
cp ~/.claude/tasks/*/health-report.json \
   ~/.claude/health-history/$(date +%Y%m%d-%H%M%S).json
```

---

## 相关文档

- [健康检查实现](../hooks/health-check.js) - 核心代码
- [Supervisor 指南](../personas/supervisor.md) - 监督者角色
- [消息确认问题](message-issues.md) - 消息系统故障排查
- [性能优化](performance.md) - 性能调优指南

---

*本文档由 Team Skill 维护，最后更新: 2026-02-20*
