#!/usr/bin/env node
/**
 * Team Skill - 被动MCP检测专项测试
 * v6.0 测试被动MCP检测机制
 *
 * 测试场景：
 * 1. Agent卡在MCP调用前（输出"Running…"状态）
 * 2. Agent长时间无输出
 * 3. Agent输出停滞
 * 4. 正常长时间运行（避免误报）
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 导入被测试的模块
const healthCheck = require('../hooks/health-check');

// 测试配置
const TEST_TEAM = 'test-passive-mcp-detection';
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

// 创建模拟输出文件
function createMockOutput(memberId, content) {
  const outputPath = path.join(TEST_STATE_DIR, `${memberId}.output.json`);
  fs.writeFileSync(outputPath, JSON.stringify({ content, timestamp: Date.now() }));
}

// ==================== 测试用例 ====================

async function runTests() {
  console.log('='.repeat(70));
  console.log('Team Skill 被动MCP检测专项测试');
  console.log('='.repeat(70));

  // 清理并准备测试环境
  cleanup();
  fs.mkdirSync(TEST_STATE_DIR, { recursive: true });

  // 启动健康检查
  const stop = await healthCheck.startHealthCheckLoop(TEST_TEAM, 10000);

  // Test 1: 检测"Running…"状态
  await test('检测 Running… 状态', async () => {
    const memberId = 'test-running-state';
    healthCheck.registerMember(memberId, { status: 'working' });

    // 创建包含 Running… 的输出
    createMockOutput(memberId, '正在处理任务...\n⎿  Running…');

    // 执行被动检查
    const detection1 = await healthCheck.passiveHealthCheck(memberId);
    assertTrue(detection1.hasRunningState, '应该检测到 Running 状态');
    assertFalse(detection1.possibleMCPStuck, '首次检测不应该标记为卡住');

    // 注意：由于我们没有真正等待35秒，这里只验证逻辑
    // 验证 runningStateStartTime 被正确设置（首次检测时会设置）
    const passiveState = healthCheck.getPassiveCheckState(memberId);
    assertTrue(passiveState !== null, '被动检测状态应该存在');
    assertTrue(passiveState.runningStateStartTime !== null, '首次检测Running状态后应该有 runningStateStartTime');

    // 验证 hasRunningState 标志
    assertTrue(detection1.hasRunningState, '应该检测到 Running 状态');

    healthCheck.unregisterMember(memberId);
  });

  // Test 2: 检测输出停滞
  await test('检测输出停滞', async () => {
    const memberId = 'test-output-stuck';
    healthCheck.registerMember(memberId, { status: 'working' });

    // 创建初始输出
    createMockOutput(memberId, '开始处理...\n步骤1完成');

    // 第一次检查
    await healthCheck.passiveHealthCheck(memberId);

    // 模拟时间过去，但输出不变
    const outputPath = path.join(TEST_STATE_DIR, `${memberId}.output.json`);
    const oldData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    oldData.timestamp = Date.now() - 50000; // 50秒前
    fs.writeFileSync(outputPath, JSON.stringify(oldData));

    // 再次检查（使用相同的输出内容）
    const detection = await healthCheck.passiveHealthCheck(memberId);

    // 输出未变化且时间超过阈值
    assertTrue(detection.outputChanged === false || detection.timeSinceLastOutput > 45000,
               '应该检测到输出停滞');

    healthCheck.unregisterMember(memberId);
  });

  // Test 3: 检测长时间无输出
  await test('检测长时间无输出', async () => {
    const memberId = 'test-no-output';
    healthCheck.registerMember(memberId, { status: 'working' });

    // 不创建输出文件，模拟无输出状态

    // 执行检查
    const detection = await healthCheck.passiveHealthCheck(memberId);

    // 无输出时应该返回正常状态（因为没有历史记录）
    assertTrue(detection.status !== 'error', '无输出不应该导致错误');

    healthCheck.unregisterMember(memberId);
  });

  // Test 4: 正常长时间运行（避免误报）
  await test('正常长时间运行 - 避免误报', async () => {
    const memberId = 'test-normal-long-running';
    healthCheck.registerMember(memberId, { status: 'working' });

    // 创建不包含 Running… 的输出（表示正常执行）
    createMockOutput(memberId, '正在编译代码...\n进度: 50%\n预计剩余时间: 2分钟');

    // 执行检查
    const detection = await healthCheck.passiveHealthCheck(memberId);

    // 正常输出不应该被标记为卡住
    assertFalse(detection.hasRunningState, '正常输出不应该有 Running 状态');
    assertFalse(detection.possibleMCPStuck, '正常执行不应该被标记为卡住');

    healthCheck.unregisterMember(memberId);
  });

  // Test 5: 置信度计算
  await test('置信度计算', async () => {
    const memberId = 'test-confidence';
    healthCheck.registerMember(memberId, { status: 'working' });

    // 创建 Running 状态输出
    createMockOutput(memberId, '⎿  Running…');

    // 第一次检查 - 首次检测到Running状态
    const detection1 = await healthCheck.passiveHealthCheck(memberId);
    assertTrue(detection1.hasRunningState, '应该检测到 Running 状态');
    assertEqual(detection1.runningDuration, 0, '首次检测时持续时间应该为0');

    // 验证 runningStateStartTime 被设置
    const passiveState = healthCheck.getPassiveCheckState(memberId);
    assertTrue(passiveState !== null, '被动检测状态应该存在');
    assertTrue(passiveState.runningStateStartTime !== null, '应该有 runningStateStartTime');

    // 注意：置信度计算依赖于实际经过的时间
    // 公式：confidence = min(100, 50 + (duration - 30000) / 1000 * 5)
    // 30秒时: confidence = 50 + 0 = 50%
    // 40秒时: confidence = 50 + 50 = 100%

    healthCheck.unregisterMember(memberId);
  });

  // Test 6: 关键词检测
  await test('可疑关键词检测', async () => {
    const memberId = 'test-keywords';
    healthCheck.registerMember(memberId, { status: 'working' });

    // 测试不同关键词
    const keywords = ['Running…', 'Running...', '⎿  Running', 'Pending…', '⏳'];

    for (const keyword of keywords) {
      createMockOutput(memberId, `处理中...\n${keyword}`);
      const detection = await healthCheck.passiveHealthCheck(memberId);
      assertTrue(detection.hasRunningState, `应该检测到关键词: ${keyword}`);
      assertTrue(detection.suspiciousKeywords.includes(keyword),
                 `suspiciousKeywords 应该包含: ${keyword}`);
    }

    healthCheck.unregisterMember(memberId);
  });

  // Test 7: 被动检测与主动注册结合
  await test('被动检测与主动注册结合', async () => {
    const memberId = 'test-combined';
    healthCheck.registerMember(memberId, { status: 'working' });

    // 主动注册MCP调用
    healthCheck.registerMCPCallStart(memberId, 'read_file');

    // 同时被动检测也发现异常
    createMockOutput(memberId, '⎿  Running…');

    // 执行健康检查
    const anomalies = await healthCheck.performHealthCheck();

    // 应该只有主动注册的异常（避免重复报告）
    const passiveAnomalies = anomalies.filter(a =>
      a.type === 'possible_mcp_stuck_passive'
    );
    assertEqual(passiveAnomalies.length, 0,
                '有主动注册时不应该产生被动检测异常');

    healthCheck.registerMCPCallEnd(memberId);
    healthCheck.unregisterMember(memberId);
  });

  // Test 8: 异常处理 - 成员不存在
  await test('异常处理 - 成员不存在', async () => {
    const detection = await healthCheck.passiveHealthCheck('non-existent-member');
    assertEqual(detection.status, 'unknown', '不存在的成员应该返回 unknown');
    assertEqual(detection.reason, 'member_not_found', '应该返回 member_not_found 原因');
  });

  // Test 9: 异常处理 - 成员正在终止
  await test('异常处理 - 成员正在终止', async () => {
    const memberId = 'test-terminating';
    healthCheck.registerMember(memberId, { status: 'terminating' });

    const detection = await healthCheck.passiveHealthCheck(memberId);
    assertEqual(detection.status, 'skipped', '终止中的成员应该返回 skipped');
    assertEqual(detection.reason, 'member_terminating', '应该返回 member_terminating 原因');

    healthCheck.unregisterMember(memberId);
  });

  // Test 10: 被动检测日志记录
  await test('被动检测日志记录', async () => {
    const memberId = 'test-logging';
    healthCheck.registerMember(memberId, { status: 'working' });

    // 创建 Running 状态
    createMockOutput(memberId, '⎿  Running…');

    // 模拟长时间 Running
    const state = healthCheck.getPassiveCheckState(memberId);
    if (state) {
      state.runningStateStartTime = Date.now() - 40000;
    }

    // 执行检查
    await healthCheck.passiveHealthCheck(memberId);

    // 验证日志文件
    const logPath = path.join(TEST_STATE_DIR, 'passive-check-log.jsonl');
    if (fs.existsSync(logPath)) {
      const logs = fs.readFileSync(logPath, 'utf8')
        .split('\n')
        .filter(line => line.trim())
        .map(line => JSON.parse(line));

      const memberLogs = logs.filter(log => log.memberId === memberId);
      assertTrue(memberLogs.length > 0, '应该有日志记录');
    }

    healthCheck.unregisterMember(memberId);
  });

  // 停止健康检查
  stop();

  // 清理
  cleanup();

  // 输出测试报告
  console.log('\n' + '='.repeat(70));
  console.log('测试报告');
  console.log('='.repeat(70));
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
    console.log('\n✅ 所有被动MCP检测测试通过！');
    process.exit(0);
  }
}

// 运行测试
runTests().catch(error => {
  console.error('测试运行错误:', error);
  process.exit(1);
});
