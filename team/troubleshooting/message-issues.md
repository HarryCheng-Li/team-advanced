# 消息确认问题排查指南

> 版本: 1.0.0 | 更新时间: 2026-02-20

本文档帮助诊断和解决 Team Skill 消息系统中的常见问题，包括消息确认失败、MCP 检测问题等。

---

## 消息系统概述

Team Skill 的消息系统基于以下组件：

- **消息队列** (`message-queue.json`) - 待发送消息存储
- **消息存储** (`message-store.json`) - 所有消息状态记录
- **状态追踪** - PENDING → SENT → DELIVERED → ACKNOWLEDGED
- **超时重试** - 60 秒超时，最多 3 次重试

### 消息状态流转

```
PENDING → SENT → DELIVERED → ACKNOWLEDGED
   ↓         ↓          ↓
FAILED    EXPIRED   (超时)
```

---

## 常见问题诊断

### 问题 1: 消息发送失败

#### 症状
```
[Health Check] 发送消息失败: Error: EACCES: permission denied
```

#### 可能原因
1. 文件权限问题
2. 磁盘空间不足
3. 消息队列文件损坏

#### 解决方案

**步骤 1: 检查文件权限**
```bash
ls -la ~/.claude/tasks/<team-name>/
# 确保有读写权限
chmod 755 ~/.claude/tasks/<team-name>/
```

**步骤 2: 检查磁盘空间**
```bash
df -h ~/.claude/
# 确保有足够空间
```

**步骤 3: 修复消息队列**
```bash
# 备份并重建队列
mv ~/.claude/tasks/<team-name>/message-queue.json \
   ~/.claude/tasks/<team-name>/message-queue.json.bak

echo "[]" > ~/.claude/tasks/<team-name>/message-queue.json
```

---

### 问题 2: 消息未送达

#### 症状
```
[Health Check] 消息状态: SENT (已发送但未送达)
[Health Check] 消息超时: msg_xxx
```

#### 可能原因
1. 接收方 Agent 未运行
2. 消息队列处理阻塞
3. 接收方处理缓慢

#### 解决方案

**步骤 1: 检查接收方状态**
```bash
# 查看 Agent 状态文件
cat ~/.claude/tasks/<team-name>/<agent-id>.state.json

# 应该看到:
# {
#   "status": "working",
#   "lastUpdate": 1700000000000
# }
```

**步骤 2: 检查消息队列**
```bash
# 查看待处理消息
cat ~/.claude/tasks/<team-name>/message-queue.json | jq '.[] | select(.receiver == "<agent-id>")'
```

**步骤 3: 手动确认消息**
```javascript
const HealthCheck = require('~/.claude/skills/team/hooks/health-check.js');

// 手动确认消息已送达
HealthCheck.acknowledgeMessage('msg_xxx', 'delivered', {
  agentId: 'backend-developer'
});
```

---

### 问题 3: 消息确认超时

#### 症状
```
[Health Check] 消息超时，自动重试: msg_xxx
[Health Check] 消息已过期: msg_xxx (超过最大重试次数)
```

#### 可能原因
1. 接收方未正确处理消息
2. 确认消息丢失
3. 接收方处理时间过长

#### 解决方案

**步骤 1: 查看消息详情**
```javascript
const HealthCheck = require('~/.claude/skills/team/hooks/health-check.js');

const status = HealthCheck.checkMessageStatus('msg_xxx');
console.log(JSON.stringify(status, null, 2));
```

**步骤 2: 重试失败消息**
```javascript
// 重试特定消息
const result = await HealthCheck.retryFailedMessages(['msg_xxx']);
console.log('重试结果:', result);
```

**步骤 3: 调整超时配置**
```javascript
// 增加超时时间
HealthCheck.CONFIG.messageTimeout = 120 * 1000;  // 120 秒
HealthCheck.CONFIG.maxMessageRetries = 5;         // 5 次重试
```

---

### 问题 4: MCP 检测问题

#### 症状
```
[Passive Check] backend-developer: 可能MCP卡住 (置信度: 70%)
[Health Check] 警告: 成员 backend-developer MCP 调用 WebSearch 已进行 45s
```

但 Agent 实际上正在正常工作。

#### 可能原因
1. MCP 调用确实耗时较长
2. 检测阈值设置不当
3. Agent 输出格式导致误判

#### 解决方案

**步骤 1: 验证 MCP 调用状态**
```javascript
const HealthCheck = require('~/.claude/skills/team/hooks/health-check.js');

// 查看当前 MCP 调用
const state = HealthCheck.getState();
console.log('MCP 调用:', state.mcpCallsInProgress);
```

**步骤 2: 调整检测阈值**
```javascript
// 针对长耗时 MCP 调用调整阈值
HealthCheck.CONFIG.mcpCallTimeout = 60000;      // 60 秒警告
HealthCheck.CONFIG.mcpStuckThreshold = 120000;  // 120 秒才判定卡住
```

**步骤 3: 主动注册 MCP 调用**
```javascript
// 在 Agent 代码中主动注册 MCP 调用
const HealthCheck = require('~/.claude/skills/team/hooks/health-check.js');

// 开始 MCP 调用前
HealthCheck.registerMCPCallStart('backend-developer', 'WebSearch');

try {
  // 执行 MCP 调用
  const result = await WebSearch({ query: '...' });
} finally {
  // MCP 调用结束后
  HealthCheck.registerMCPCallEnd('backend-developer');
}
```

---

### 问题 5: 被动检测误报

#### 症状
被动检测频繁报告 MCP 卡住，但 Agent 实际正常。

#### 可能原因
1. Agent 输出包含 "Running..." 等关键词
2. 输出长时间未变化（正常情况）
3. 检测阈值过于敏感

#### 解决方案

**步骤 1: 查看被动检测状态**
```javascript
const HealthCheck = require('~/.claude/skills/team/hooks/health-check.js');

const state = HealthCheck.getPassiveCheckState('backend-developer');
console.log(JSON.stringify(state, null, 2));
```

**步骤 2: 调整被动检测配置**
```javascript
// 增加阈值
HealthCheck.PASSIVE_CONFIG.runningStateThreshold = 60000;  // 60 秒
HealthCheck.PASSIVE_CONFIG.outputStuckThreshold = 90000;   // 90 秒
HealthCheck.PASSIVE_CONFIG.noOutputThreshold = 120000;     // 120 秒
```

**步骤 3: 清除误报状态**
```javascript
// 清除特定成员的被动检测状态
HealthCheck.clearPassiveCheckState('backend-developer');
```

---

## 调试工具

### 消息追踪脚本

```javascript
// debug-messages.js
const fs = require('fs');
const path = require('path');

const teamName = process.argv[2] || 'default';
const teamDir = path.join(process.env.HOME, '.claude', 'tasks', teamName);

// 读取消息存储
const messageStorePath = path.join(teamDir, 'message-store.json');
if (fs.existsSync(messageStorePath)) {
  const store = JSON.parse(fs.readFileSync(messageStorePath, 'utf8'));

  console.log('\n=== 消息统计 ===');
  const statusCount = {};
  store.messages.forEach(msg => {
    statusCount[msg.status] = (statusCount[msg.status] || 0) + 1;
  });
  console.log(statusCount);

  console.log('\n=== 失败消息 ===');
  store.messages
    .filter(m => m.status === 'failed' || m.status === 'expired')
    .forEach(m => {
      console.log(`- ${m.id}: ${m.type} -> ${m.receiver} (${m.status})`);
    });

  console.log('\n=== 待确认消息 ===');
  store.messages
    .filter(m => m.status === 'pending' || m.status === 'sent')
    .forEach(m => {
      const age = Date.now() - new Date(m.timestamp).getTime();
      console.log(`- ${m.id}: ${m.type} -> ${m.receiver} (${Math.round(age/1000)}s)`);
    });
}
```

使用：
```bash
node debug-messages.js <team-name>
```

### MCP 检测调试

```javascript
// debug-mcp.js
const HealthCheck = require('~/.claude/skills/team/hooks/health-check.js');

const teamName = process.argv[2] || 'default';

// 模拟 MCP 调用
async function testMCPDetection() {
  console.log('测试 MCP 检测...\n');

  // 注册 MCP 调用
  HealthCheck.registerMCPCallStart('test-agent', 'WebSearch');
  console.log('MCP 调用已注册');

  // 查看状态
  let state = HealthCheck.getState();
  console.log('当前 MCP 调用:', state.mcpCallsInProgress);

  // 等待 5 秒
  await new Promise(r => setTimeout(r, 5000));

  // 结束 MCP 调用
  HealthCheck.registerMCPCallEnd('test-agent');
  console.log('\nMCP 调用已结束');

  state = HealthCheck.getState();
  console.log('当前 MCP 调用:', state.mcpCallsInProgress);
}

testMCPDetection();
```

---

## 配置优化建议

### 高延迟环境

```javascript
// 适用于网络较慢的环境
HealthCheck.CONFIG.messageTimeout = 120 * 1000;
HealthCheck.CONFIG.mcpCallTimeout = 60 * 1000;
HealthCheck.CONFIG.mcpStuckThreshold = 180 * 1000;
```

### 快速响应环境

```javascript
// 适用于本地开发或快速环境
HealthCheck.CONFIG.messageTimeout = 30 * 1000;
HealthCheck.CONFIG.mcpCallTimeout = 15 * 1000;
HealthCheck.CONFIG.mcpStuckThreshold = 30 * 1000;
```

### 大规模团队

```javascript
// 适用于 10+ 成员的团队
HealthCheck.CONFIG.healthCheckInterval = 60 * 1000;  // 降低检查频率
HealthCheck.CONFIG.maxMessageRetries = 5;            // 增加重试次数
```

---

## 常见问题速查表

| 问题 | 快速诊断 | 解决方案 |
|------|----------|----------|
| 消息发送失败 | 检查文件权限 | `chmod 755` |
| 消息未送达 | 检查接收方状态 | 确认 Agent 运行中 |
| 消息超时 | 查看消息详情 | 重试或增加超时 |
| MCP 误报 | 查看被动检测状态 | 调整阈值或清除状态 |
| 队列阻塞 | 查看队列长度 | 清理或重建队列 |

---

## 相关文档

- [健康检查问题](health-check-issues.md) - 健康检查故障排查
- [健康检查实现](../hooks/health-check.js) - 核心代码
- [Supervisor 指南](../personas/supervisor.md) - 监督者角色
- [通信协议](../references/communication-protocol.md) - 消息协议规范

---

*本文档由 Team Skill 维护，最后更新: 2026-02-20*
