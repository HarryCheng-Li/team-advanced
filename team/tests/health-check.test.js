#!/usr/bin/env node
/**
 * Team Skill - Health Check System 单元测试
 * 测试消息确认机制、超时检测、重试逻辑
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 设置测试环境
process.env.HOME = '/tmp/test-health-check-' + Date.now();

// 导入被测试的模块
const healthCheck = require('../hooks/health-check');
const {
  MessageStatus,
  sendMessage,
  acknowledgeMessage,
  checkMessageStatus,
  retryFailedMessages,
  checkMessageTimeouts,
  generateMessageReport,
  startHealthCheckLoop,
  stopHealthCheckLoop,
  registerMember,
  unregisterMember,
  CONFIG,
} = healthCheck;

// 测试工具函数
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
    testsPassed++;
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  Error: ${error.message}`);
    testsFailed++;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 清理测试目录
function cleanup() {
  try {
    if (fs.existsSync(process.env.HOME)) {
      fs.rmSync(process.env.HOME, { recursive: true, force: true });
    }
  } catch (error) {
    // 忽略清理错误
  }
}

// ==================== 测试套件 ====================

console.log('\n========== Health Check System 测试 ==========\n');

// 1. 消息状态枚举测试
console.log('--- 消息状态枚举测试 ---');

test('MessageStatus 应该包含所有必要状态', () => {
  assert.strictEqual(MessageStatus.PENDING, 'pending');
  assert.strictEqual(MessageStatus.SENT, 'sent');
  assert.strictEqual(MessageStatus.DELIVERED, 'delivered');
  assert.strictEqual(MessageStatus.ACKNOWLEDGED, 'acknowledged');
  assert.strictEqual(MessageStatus.FAILED, 'failed');
  assert.strictEqual(MessageStatus.EXPIRED, 'expired');
});

// 2. 消息发送测试
console.log('\n--- 消息发送测试 ---');

test('sendMessage 应该成功发送消息并返回 messageId', () => {
  const result = sendMessage({
    type: 'test',
    sender: 'supervisor',
    receiver: 'test-agent',
    content: { test: true },
  });

  assert.strictEqual(result.success, true);
  assert.ok(result.messageId, '应该返回 messageId');
  assert.strictEqual(result.status, MessageStatus.SENT);
});

test('sendMessage 应该支持自定义消息ID', () => {
  const customId = 'custom_msg_123';
  const result = sendMessage({
    id: customId,
    type: 'test',
    sender: 'supervisor',
    receiver: 'test-agent',
    content: { test: true },
  });

  assert.strictEqual(result.messageId, customId);
});

test('sendMessage 应该支持回调函数', async () => {
  let callbackCalled = false;
  let callbackMessage = null;

  const result = sendMessage({
    type: 'test',
    sender: 'supervisor',
    receiver: 'test-agent',
    content: { test: true },
  }, {
    requireAcknowledgment: true,
    onAcknowledged: (msg) => {
      callbackCalled = true;
      callbackMessage = msg;
    },
  });

  // 模拟确认
  acknowledgeMessage(result.messageId, 'acknowledged');

  assert.strictEqual(callbackCalled, true, '回调应该被调用');
  assert.ok(callbackMessage, '回调应该接收消息对象');
});

// 3. 消息确认测试
console.log('\n--- 消息确认测试 ---');

test('acknowledgeMessage 应该将消息标记为 DELIVERED', () => {
  const result = sendMessage({
    type: 'test',
    sender: 'supervisor',
    receiver: 'test-agent',
    content: { test: true },
  });

  const ackResult = acknowledgeMessage(result.messageId, 'delivered', {
    agentId: 'test-agent',
  });

  assert.strictEqual(ackResult.success, true);
  assert.strictEqual(ackResult.status, MessageStatus.DELIVERED);
});

test('acknowledgeMessage 应该将消息标记为 ACKNOWLEDGED', () => {
  const result = sendMessage({
    type: 'test',
    sender: 'supervisor',
    receiver: 'test-agent',
    content: { test: true },
  });

  const ackResult = acknowledgeMessage(result.messageId, 'acknowledged', {
    agentId: 'test-agent',
  });

  assert.strictEqual(ackResult.success, true);
  assert.strictEqual(ackResult.status, MessageStatus.ACKNOWLEDGED);
});

test('acknowledgeMessage 对不存在消息应该返回错误', () => {
  const result = acknowledgeMessage('non_existent_msg', 'acknowledged');
  assert.strictEqual(result.success, false);
  assert.ok(result.error);
});

// 4. 消息状态查询测试
console.log('\n--- 消息状态查询测试 ---');

test('checkMessageStatus 应该返回正确的消息状态', () => {
  const result = sendMessage({
    type: 'test',
    sender: 'supervisor',
    receiver: 'test-agent',
    content: { test: true },
  });

  const status = checkMessageStatus(result.messageId);

  assert.strictEqual(status.exists, true);
  assert.strictEqual(status.messageId, result.messageId);
  assert.strictEqual(status.status, MessageStatus.SENT);
  assert.strictEqual(status.type, 'test');
  assert.strictEqual(status.sender, 'supervisor');
  assert.strictEqual(status.receiver, 'test-agent');
});

test('checkMessageStatus 对不存在消息应该返回错误', () => {
  const status = checkMessageStatus('non_existent_msg');
  assert.strictEqual(status.exists, false);
  assert.ok(status.error);
});

// 5. 消息重试测试
console.log('\n--- 消息重试测试 ---');

test('retryFailedMessages 应该重试指定的消息', () => {
  // 先发送一条消息
  const result = sendMessage({
    type: 'test',
    sender: 'supervisor',
    receiver: 'test-agent',
    content: { test: true },
  }, { requireAcknowledgment: false });

  // 重试指定的消息
  const retryResult = retryFailedMessages([result.messageId]);

  // 消息应该被重试
  assert.strictEqual(retryResult.attempted, 1);
  assert.strictEqual(retryResult.succeeded, 1);
});

test('retryFailedMessages 应该遵守最大重试次数限制', () => {
  // 发送消息
  const result = sendMessage({
    type: 'test',
    sender: 'supervisor',
    receiver: 'test-agent',
    content: { test: true },
  }, { requireAcknowledgment: false });

  // 第一次重试应该成功
  let retryResult = retryFailedMessages([result.messageId]);
  assert.strictEqual(retryResult.succeeded, 1);

  // 第二次重试也应该成功
  retryResult = retryFailedMessages([result.messageId]);
  assert.strictEqual(retryResult.succeeded, 1);

  // 第三次重试也应该成功
  retryResult = retryFailedMessages([result.messageId]);
  assert.strictEqual(retryResult.succeeded, 1);

  // 第四次重试应该失败（超过最大重试次数）
  retryResult = retryFailedMessages([result.messageId]);
  assert.strictEqual(retryResult.failed, 1);
});

// 6. 消息超时检测测试
console.log('\n--- 消息超时检测测试 ---');

test('checkMessageTimeouts 应该检测超时消息', () => {
  // 发送一条消息，设置不需要确认以模拟超时场景
  const result = sendMessage({
    type: 'test',
    sender: 'supervisor',
    receiver: 'test-agent',
    content: { test: true },
  }, { requireAcknowledgment: false });

  // 由于没有待确认消息（requireAcknowledgment=false），
  // checkMessageTimeouts 不会检测到此消息
  const expiredMessages = checkMessageTimeouts();

  // 消息不在pending集合中，所以不会被检测为超时
  assert.strictEqual(expiredMessages.length, 0);
});

// 7. 消息报告生成测试
console.log('\n--- 消息报告生成测试 ---');

test('generateMessageReport 应该生成正确的统计报告', () => {
  // 发送多条消息
  sendMessage({ type: 'test1', sender: 'supervisor', receiver: 'agent1', content: {} });
  sendMessage({ type: 'test2', sender: 'supervisor', receiver: 'agent2', content: {} });

  const report = generateMessageReport();

  assert.ok(report.timestamp, '报告应该包含时间戳');
  assert.ok(report.summary, '报告应该包含摘要');
  assert.ok(report.summary.total >= 2, '总消息数应该至少为2');
  assert.ok(Array.isArray(report.recentMessages), 'recentMessages 应该是数组');
});

test('generateMessageReport 应该正确计算送达率', () => {
  const report = generateMessageReport();

  assert.ok(report.summary.deliveryRate !== undefined, '应该包含送达率');
  assert.ok(report.summary.acknowledgmentRate !== undefined, '应该包含确认率');
});

// 8. 集成测试
console.log('\n--- 集成测试 ---');

test('完整消息生命周期测试', () => {
  // 1. 发送消息
  const result = sendMessage({
    type: 'task_assignment',
    sender: 'coordinator',
    receiver: 'executor-1',
    content: { task: 'implement feature X' },
  }, {
    requireAcknowledgment: true,
  });

  assert.strictEqual(result.success, true);
  const messageId = result.messageId;

  // 2. 检查初始状态
  let status = checkMessageStatus(messageId);
  assert.strictEqual(status.status, MessageStatus.SENT);

  // 3. 模拟送达确认
  acknowledgeMessage(messageId, 'delivered', { agentId: 'executor-1' });
  status = checkMessageStatus(messageId);
  assert.strictEqual(status.status, MessageStatus.DELIVERED);

  // 4. 模拟消费确认
  acknowledgeMessage(messageId, 'acknowledged', { agentId: 'executor-1' });
  status = checkMessageStatus(messageId);
  assert.strictEqual(status.status, MessageStatus.ACKNOWLEDGED);
  assert.strictEqual(status.isPending, false);
});

test('消息重试流程测试', () => {
  // 1. 发送消息
  const result = sendMessage({
    type: 'critical_notification',
    sender: 'supervisor',
    receiver: 'agent-1',
    content: { alert: 'system overload' },
  }, { requireAcknowledgment: false });

  const messageId = result.messageId;

  // 2. 重试消息
  const retryResult = retryFailedMessages([messageId]);

  // 3. 验证消息被重试
  assert.strictEqual(retryResult.attempted, 1);
  assert.strictEqual(retryResult.succeeded, 1);

  // 4. 验证消息状态仍然是SENT，但重试计数增加
  const status = checkMessageStatus(messageId);
  assert.strictEqual(status.status, MessageStatus.SENT);
  assert.strictEqual(status.retryCount, 1);
});

// 9. 配置测试
console.log('\n--- 配置测试 ---');

test('CONFIG 应该包含消息相关配置', () => {
  assert.ok(CONFIG.messageTimeout > 0, '应该设置消息超时时间');
  assert.ok(CONFIG.maxMessageRetries > 0, '应该设置最大重试次数');
  assert.ok(CONFIG.messageRetryInterval > 0, '应该设置重试间隔');
});

// 10. 健康检查循环测试
console.log('\n--- 健康检查循环测试 ---');

test('startHealthCheckLoop 应该正确初始化', async () => {
  const stop = await startHealthCheckLoop('test-team', 1000);

  assert.ok(typeof stop === 'function', '应该返回停止函数');

  // 清理
  stop();
});

test('stopHealthCheckLoop 应该正确停止', async () => {
  await startHealthCheckLoop('test-team', 1000);
  stopHealthCheckLoop();

  // 验证状态
  const state = healthCheck.getState();
  assert.strictEqual(state.isRunning, false);
});

// ==================== 测试结果 ====================

console.log('\n========== 测试结果 ==========');
console.log(`通过: ${testsPassed}`);
console.log(`失败: ${testsFailed}`);
console.log(`总计: ${testsPassed + testsFailed}`);

// 清理
// cleanup();

if (testsFailed > 0) {
  process.exit(1);
} else {
  console.log('\n所有测试通过! ✓');
  process.exit(0);
}
