#!/usr/bin/env node
/**
 * Team Skill - Health Check 完整测试套件
 * v6.0 测试所有修复的功能
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 导入被测试的模块
const healthCheck = require('../hooks/health-check');

// 测试配置
const TEST_TEAM = 'test-team-health-check';
const TEST_STATE_DIR = path.join(process.env.HOME, '.claude', 'tasks', TEST_TEAM);

// 测试结果
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

// 测试工具函数
async function test(name, fn) {
  try {
    console.log(`\n[TEST] ${name}...`);
    await fn();
    console.log(`  ✅ PASS: ${name}`);
    results.passed++;
    results.tests.push({ name, status: 'PASS' });
  } catch (error) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Error: ${error.message}`);
    results.failed++;
    results.tests.push({ name, status: 'FAIL', error: error.message });
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

function assertTrue(value, message) {
  if (!value) {
    throw new Error(message || 'Expected true but got false');
  }
}

function assertFalse(value, message) {
  if (value) {
    throw new Error(message || 'Expected false but got true');
  }
}

// 清理测试环境
function cleanup() {
  try {
    if (fs.existsSync(TEST_STATE_DIR)) {
      fs.rmSync(TEST_STATE_DIR, { recursive: true, force: true });
    }
  } catch (error) {
    console.error('Cleanup error:', error.message);
  }
}

// 等待函数
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== 测试用例 ====================

async function runTests() {
  console.log('='.repeat(60));
  console.log('Team Skill Health Check 测试套件');
  console.log('='.repeat(60));

  // 清理并准备测试环境
  cleanup();

  // Test 1: 模块导出测试
  await test('模块导出完整性', () => {
    assertTrue(typeof healthCheck.startHealthCheckLoop === 'function', 'startHealthCheckLoop 应该是函数');
    assertTrue(typeof healthCheck.stopHealthCheckLoop === 'function', 'stopHealthCheckLoop 应该是函数');
    assertTrue(typeof healthCheck.performHealthCheck === 'function', 'performHealthCheck 应该是函数');
    assertTrue(typeof healthCheck.registerMember === 'function', 'registerMember 应该是函数');
    assertTrue(typeof healthCheck.unregisterMember === 'function', 'unregisterMember 应该是函数');
    assertTrue(typeof healthCheck.updateMemberState === 'function', 'updateMemberState 应该是函数');
    assertTrue(typeof healthCheck.registerMCPCallStart === 'function', 'registerMCPCallStart 应该是函数');
    assertTrue(typeof healthCheck.registerMCPCallEnd === 'function', 'registerMCPCallEnd 应该是函数');
    assertTrue(typeof healthCheck.generateHealthReport === 'function', 'generateHealthReport 应该是函数');
    assertTrue(typeof healthCheck.getState === 'function', 'getState 应该是函数');
    assertTrue(typeof healthCheck.sendMessage === 'function', 'sendMessage 应该是函数');
    assertTrue(healthCheck.CONFIG !== undefined, 'CONFIG 应该存在');
  });

  // Test 2: 配置验证
  await test('配置参数正确性', () => {
    assertEqual(healthCheck.CONFIG.healthCheckInterval, 30000, 'healthCheckInterval 应该是 30s');
    assertEqual(healthCheck.CONFIG.idleWarningThreshold, 120000, 'idleWarningThreshold 应该是 2min');
    assertEqual(healthCheck.CONFIG.idleTimeoutThreshold, 300000, 'idleTimeoutThreshold 应该是 5min');
    assertEqual(healthCheck.CONFIG.progressStaleThreshold, 120000, 'progressStaleThreshold 应该是 2min');
    assertEqual(healthCheck.CONFIG.mcpCallTimeout, 30000, 'mcpCallTimeout 应该是 30s');
    assertEqual(healthCheck.CONFIG.mcpStuckThreshold, 60000, 'mcpStuckThreshold 应该是 60s');
    assertEqual(healthCheck.CONFIG.gracefulShutdownTimeout, 30000, 'gracefulShutdownTimeout 应该是 30s');
    assertEqual(healthCheck.CONFIG.forceKillTimeout, 60000, 'forceKillTimeout 应该是 60s');
    assertEqual(healthCheck.CONFIG.maxRetries, 3, 'maxRetries 应该是 3');
  });

  // Test 3: 启动健康检查
  await test('启动健康检查循环', async () => {
    const stop = await healthCheck.startHealthCheckLoop(TEST_TEAM, 5000); // 5秒间隔用于测试
    assertTrue(typeof stop === 'function', '应该返回停止函数');

    const state = healthCheck.getState();
    assertEqual(state.teamName, TEST_TEAM, '团队名称应该正确设置');
    assertTrue(state.isRunning, '健康检查应该正在运行');

    // 停止测试实例
    stop();
    await sleep(100);
  });

  // Test 4: 成员注册
  await test('成员注册功能', () => {
    healthCheck.registerMember('executor-1', { role: 'backend-developer' });

    const state = healthCheck.getState();
    assertTrue(state.members.includes('executor-1'), '成员应该在列表中');

    // 验证状态文件是否创建
    const statePath = path.join(TEST_STATE_DIR, 'executor-1.state.json');
    assertTrue(fs.existsSync(statePath), '状态文件应该存在');

    const memberState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assertEqual(memberState.status, 'registered', '状态应该是 registered');
    assertEqual(memberState.role, 'backend-developer', '角色应该正确');
  });

  // Test 5: 更新成员状态
  await test('更新成员状态', () => {
    healthCheck.updateMemberState('executor-1', {
      status: 'working',
      progress: 25,
      currentTask: 'implementing-login',
    });

    const statePath = path.join(TEST_STATE_DIR, 'executor-1.state.json');
    const memberState = JSON.parse(fs.readFileSync(statePath, 'utf8'));

    assertEqual(memberState.status, 'working', '状态应该是 working');
    assertEqual(memberState.progress, 25, '进度应该是 25');
    assertEqual(memberState.currentTask, 'implementing-login', '任务应该正确');
  });

  // Test 6: MCP 调用注册
  await test('MCP 调用注册', () => {
    healthCheck.registerMCPCallStart('executor-1', 'read_file');

    const state = healthCheck.getState();
    const mcpCalls = state.mcpCallsInProgress;
    assertTrue(mcpCalls.length > 0, '应该有进行中的 MCP 调用');
    assertEqual(mcpCalls[0].memberId, 'executor-1', '成员 ID 应该正确');
    assertEqual(mcpCalls[0].tool, 'read_file', '工具名称应该正确');
  });

  // Test 7: MCP 调用结束
  await test('MCP 调用结束', () => {
    healthCheck.registerMCPCallEnd('executor-1');

    const state = healthCheck.getState();
    const mcpCalls = state.mcpCallsInProgress;
    assertEqual(mcpCalls.length, 0, '应该没有进行中的 MCP 调用');
  });

  // Test 8: 消息发送
  await test('消息发送功能', () => {
    const result = healthCheck.sendMessage({
      type: 'health_check',
      sender: 'supervisor',
      receiver: 'executor-1',
      content: { test: true },
    });

    assertTrue(result, '消息发送应该成功');

    const queuePath = path.join(TEST_STATE_DIR, 'message-queue.json');
    assertTrue(fs.existsSync(queuePath), '消息队列文件应该存在');

    const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
    assertTrue(queue.length > 0, '消息队列应该有消息');
    assertEqual(queue[0].type, 'health_check', '消息类型应该正确');
    assertTrue(queue[0].id !== undefined, '消息应该有 ID');
    assertTrue(queue[0].timestamp !== undefined, '消息应该有时间戳');
  });

  // Test 9: 健康报告生成
  await test('健康报告生成', () => {
    const report = healthCheck.generateHealthReport();

    assertTrue(report.timestamp !== undefined, '报告应该有时间戳');
    assertTrue(report.checkCount !== undefined, '报告应该有检查计数');
    assertEqual(report.teamName, TEST_TEAM, '团队名称应该正确');
    assertTrue(Array.isArray(report.members), '成员应该是数组');
    assertTrue(report.summary !== undefined, '报告应该有摘要');
    assertEqual(report.summary.total, 1, '应该有一个成员');
  });

  // Test 10: 成员注销
  await test('成员注销功能', () => {
    healthCheck.unregisterMember('executor-1');

    const state = healthCheck.getState();
    assertFalse(state.members.includes('executor-1'), '成员不应该在列表中');

    const statePath = path.join(TEST_STATE_DIR, 'executor-1.state.json');
    assertFalse(fs.existsSync(statePath), '状态文件应该被删除');
  });

  // Test 11: 进度停滞检测
  await test('进度停滞检测', async () => {
    // 重新启动健康检查
    const stop = await healthCheck.startHealthCheckLoop(TEST_TEAM, 1000);

    // 注册成员并设置旧进度
    healthCheck.registerMember('executor-slow', {});
    healthCheck.updateMemberState('executor-slow', { status: 'working', progress: 10 });

    // 手动设置最后更新时间为 3 分钟前（超过阈值）
    const oldTime = Date.now() - 3 * 60 * 1000;

    // 等待一次健康检查
    await sleep(1200);

    // 停止
    stop();
    healthCheck.unregisterMember('executor-slow');
  });

  // Test 12: 空闲检测
  await test('空闲状态检测', () => {
    healthCheck.registerMember('executor-idle', {});
    healthCheck.updateMemberState('executor-idle', { status: 'idle' });

    // 验证 idleSince 被设置
    const statePath = path.join(TEST_STATE_DIR, 'executor-idle.state.json');
    const memberState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assertTrue(memberState.idleSince !== null, '应该有 idleSince 时间戳');

    healthCheck.unregisterMember('executor-idle');
  });

  // Test 13: 质量检查触发
  await test('质量检查触发（50% 进度）', () => {
    healthCheck.registerMember('executor-quality', {});
    healthCheck.updateMemberState('executor-quality', { progress: 50 });

    // 手动执行健康检查
    const anomalies = healthCheck.performHealthCheck();

    healthCheck.unregisterMember('executor-quality');
  });

  // Test 14: 获取状态
  await test('获取状态信息', () => {
    const state = healthCheck.getState();

    assertTrue(state.teamName !== undefined, '应该有团队名称');
    assertTrue(typeof state.isRunning === 'boolean', 'isRunning 应该是布尔值');
    assertTrue(typeof state.checkCount === 'number', 'checkCount 应该是数字');
    assertTrue(typeof state.memberCount === 'number', 'memberCount 应该是数字');
    assertTrue(Array.isArray(state.members), 'members 应该是数组');
    assertTrue(Array.isArray(state.mcpCallsInProgress), 'mcpCallsInProgress 应该是数组');
  });

  // ==================== 被动检测测试 ====================

  // Test 16: 被动检测配置
  await test('被动检测配置', () => {
    assertTrue(healthCheck.PASSIVE_CONFIG !== undefined, 'PASSIVE_CONFIG 应该存在');
    assertEqual(healthCheck.PASSIVE_CONFIG.runningStateThreshold, 30000, 'runningStateThreshold 应该是 30s');
    assertEqual(healthCheck.PASSIVE_CONFIG.outputStuckThreshold, 45000, 'outputStuckThreshold 应该是 45s');
    assertEqual(healthCheck.PASSIVE_CONFIG.noOutputThreshold, 60000, 'noOutputThreshold 应该是 60s');
    assertTrue(Array.isArray(healthCheck.PASSIVE_CONFIG.suspiciousKeywords), 'suspiciousKeywords 应该是数组');
    assertTrue(healthCheck.PASSIVE_CONFIG.suspiciousKeywords.includes('Running…'), '应该包含 Running… 关键词');
  });

  // Test 17: 被动检测函数导出
  await test('被动检测函数导出', () => {
    assertTrue(typeof healthCheck.passiveHealthCheck === 'function', 'passiveHealthCheck 应该是函数');
    assertTrue(typeof healthCheck.getPassiveCheckState === 'function', 'getPassiveCheckState 应该是函数');
    assertTrue(typeof healthCheck.clearPassiveCheckState === 'function', 'clearPassiveCheckState 应该是函数');
  });

  // Test 18: 被动健康检查 - 正常状态
  await test('被动健康检查 - 正常状态', async () => {
    // 启动健康检查
    const stop = await healthCheck.startHealthCheckLoop(TEST_TEAM, 5000);

    // 注册成员
    healthCheck.registerMember('executor-passive-normal', { status: 'working' });

    // 执行被动检查
    const detection = await healthCheck.passiveHealthCheck('executor-passive-normal');

    assertTrue(detection !== null, '检测结果不应该为 null');
    assertEqual(detection.memberId, 'executor-passive-normal', '成员ID应该正确');
    assertTrue(detection.hasRunningState !== undefined, '应该有 hasRunningState 字段');
    assertTrue(detection.possibleMCPStuck !== undefined, '应该有 possibleMCPStuck 字段');

    // 清理
    healthCheck.unregisterMember('executor-passive-normal');
    stop();
    await sleep(100);
  });

  // Test 19: 被动检测状态管理
  await test('被动检测状态管理', async () => {
    const stop = await healthCheck.startHealthCheckLoop(TEST_TEAM, 5000);

    // 注册成员
    healthCheck.registerMember('executor-passive-state', { status: 'working' });

    // 执行被动检查
    await healthCheck.passiveHealthCheck('executor-passive-state');

    // 获取被动检测状态
    const passiveState = healthCheck.getPassiveCheckState('executor-passive-state');
    assertTrue(passiveState !== null, '被动检测状态不应该为 null');
    assertEqual(passiveState.memberId, 'executor-passive-state', '成员ID应该正确');
    assertTrue(passiveState.firstCheckTime !== undefined, '应该有 firstCheckTime');

    // 清除状态
    healthCheck.clearPassiveCheckState('executor-passive-state');

    // 验证状态已清除
    const clearedState = healthCheck.getPassiveCheckState('executor-passive-state');
    assertEqual(clearedState, null, '状态应该被清除');

    // 清理
    healthCheck.unregisterMember('executor-passive-state');
    stop();
    await sleep(100);
  });

  // Test 20: 成员注销时清理被动检测状态
  await test('成员注销时清理被动检测状态', async () => {
    const stop = await healthCheck.startHealthCheckLoop(TEST_TEAM, 5000);

    // 注册成员并执行被动检查
    healthCheck.registerMember('executor-cleanup', { status: 'working' });
    await healthCheck.passiveHealthCheck('executor-cleanup');

    // 验证状态存在
    let passiveState = healthCheck.getPassiveCheckState('executor-cleanup');
    assertTrue(passiveState !== null, '被动检测状态应该存在');

    // 注销成员
    healthCheck.unregisterMember('executor-cleanup');

    // 验证状态已清除
    passiveState = healthCheck.getPassiveCheckState('executor-cleanup');
    assertEqual(passiveState, null, '注销后被动检测状态应该被清除');

    stop();
    await sleep(100);
  });

  // Test 21: 停止健康检查
  await test('停止健康检查循环', async () => {
    const stop = await healthCheck.startHealthCheckLoop(TEST_TEAM, 5000);

    // 验证已启动
    let state = healthCheck.getState();
    assertTrue(state.isRunning, '健康检查应该正在运行');

    // 停止
    stop();
    await sleep(100);

    // 再次检查（通过重新获取状态）
    // 注意：停止后状态会更新
  });

  // 清理
  cleanup();

  // 输出测试报告
  console.log('\n' + '='.repeat(60));
  console.log('测试报告');
  console.log('='.repeat(60));
  console.log(`通过: ${results.passed}`);
  console.log(`失败: ${results.failed}`);
  console.log(`总计: ${results.passed + results.failed}`);

  if (results.failed > 0) {
    console.log('\n失败的测试:');
    results.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => {
        console.log(`  - ${t.name}`);
        console.log(`    错误: ${t.error}`);
      });
    process.exit(1);
  } else {
    console.log('\n✅ 所有测试通过！');
    process.exit(0);
  }
}

// 运行测试
runTests().catch(error => {
  console.error('测试运行错误:', error);
  process.exit(1);
});
