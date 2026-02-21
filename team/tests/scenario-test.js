#!/usr/bin/env node
/**
 * Team Skill - 场景测试
 * 模拟实际使用中的各种异常情况
 */

const fs = require('fs');
const path = require('path');

const healthCheck = require('../hooks/health-check');

const TEST_TEAM = 'scenario-test-team';
const TEST_STATE_DIR = path.join(process.env.HOME, '.claude', 'tasks', TEST_TEAM);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function cleanup() {
  try {
    if (fs.existsSync(TEST_STATE_DIR)) {
      fs.rmSync(TEST_STATE_DIR, { recursive: true, force: true });
    }
  } catch (error) {
    console.error('Cleanup error:', error.message);
  }
}

async function scenario(name, fn) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`场景: ${name}`);
  console.log('='.repeat(60));
  try {
    await fn();
    console.log(`✅ 场景完成: ${name}\n`);
  } catch (error) {
    console.error(`❌ 场景失败: ${name}`);
    console.error(`错误: ${error.message}`);
    console.error(error.stack);
  }
}

async function runScenarios() {
  console.log('Team Skill 场景测试');
  console.log('模拟实际使用中的各种情况\n');

  cleanup();

  // 场景 1: MCP 调用超时检测
  await scenario('MCP 调用超时检测', async () => {
    const stop = await healthCheck.startHealthCheckLoop(TEST_TEAM, 2000);

    // 注册成员
    healthCheck.registerMember('executor-mcp', { role: 'backend-developer' });
    healthCheck.updateMemberState('executor-mcp', { status: 'working', progress: 30 });

    // 模拟 MCP 调用开始
    console.log('  模拟 MCP 调用开始...');
    healthCheck.registerMCPCallStart('executor-mcp', 'web_search');

    // 等待超过 MCP 超时阈值 (30s)，但我们用更快的测试
    console.log('  等待健康检查检测...');
    await sleep(3000);

    // 结束 MCP 调用
    healthCheck.registerMCPCallEnd('executor-mcp');
    console.log('  MCP 调用结束');

    // 验证健康报告
    const report = healthCheck.generateHealthReport();
    console.log(`  健康报告: ${report.summary.total} 成员, ${report.summary.healthy} 健康`);

    healthCheck.unregisterMember('executor-mcp');
    stop();
  });

  // 场景 2: 成员空闲超时检测
  await scenario('成员空闲超时检测', async () => {
    const stop = await healthCheck.startHealthCheckLoop(TEST_TEAM, 1000);

    // 注册成员并设置为空闲
    healthCheck.registerMember('executor-idle-test', {});
    healthCheck.updateMemberState('executor-idle-test', { status: 'idle' });

    console.log('  成员设置为空闲状态');

    // 等待几次健康检查
    await sleep(2500);

    // 验证状态
    const state = healthCheck.getState();
    console.log(`  成员数: ${state.memberCount}`);

    // 清理
    healthCheck.unregisterMember('executor-idle-test');
    stop();
  });

  // 场景 3: 进度停滞检测
  await scenario('进度停滞检测', async () => {
    const stop = await healthCheck.startHealthCheckLoop(TEST_TEAM, 1000);

    healthCheck.registerMember('executor-stalled', {});
    healthCheck.updateMemberState('executor-stalled', { status: 'working', progress: 50 });

    console.log('  成员开始工作，进度 50%');

    // 等待
    await sleep(2000);

    // 检查健康报告
    const report = healthCheck.generateHealthReport();
    console.log(`  报告: ${JSON.stringify(report.summary, null, 2)}`);

    healthCheck.unregisterMember('executor-stalled');
    stop();
  });

  // 场景 4: 多成员监控
  await scenario('多成员同时监控', async () => {
    const stop = await healthCheck.startHealthCheckLoop(TEST_TEAM, 1500);

    // 注册多个成员
    const members = ['executor-1', 'executor-2', 'executor-3'];
    for (let i = 0; i < members.length; i++) {
      healthCheck.registerMember(members[i], { role: 'developer' });
      healthCheck.updateMemberState(members[i], {
        status: i === 0 ? 'idle' : 'working',
        progress: i * 20,
      });
      console.log(`  注册成员 ${members[i]}: ${i === 0 ? 'idle' : 'working'}`);
    }

    // 等待几次检查
    await sleep(3500);

    // 获取状态
    const state = healthCheck.getState();
    console.log(`  总成员数: ${state.memberCount}`);
    console.log(`  成员列表: ${state.members.join(', ')}`);

    // 健康报告
    const report = healthCheck.generateHealthReport();
    console.log(`  健康状态: ${report.summary.healthy} 健康, ${report.summary.warning} 警告, ${report.summary.critical} 严重`);

    // 清理
    members.forEach(m => healthCheck.unregisterMember(m));
    stop();
  });

  // 场景 5: 消息队列验证
  await scenario('Supervisor 消息发送', async () => {
    const stop = await healthCheck.startHealthCheckLoop(TEST_TEAM, 1000);

    healthCheck.registerMember('executor-msg', {});

    // 发送不同类型的消息
    const messages = [
      { type: 'health_check', content: { question: 'Are you OK?' } },
      { type: 'anomaly_report', content: { severity: 'warning', issue: 'slow progress' } },
      { type: 'assist_offer', content: { help: 'Need help?' } },
    ];

    for (const msg of messages) {
      msg.sender = 'supervisor';
      msg.receiver = 'executor-msg';
      const result = healthCheck.sendMessage(msg);
      console.log(`  发送 ${msg.type}: ${result ? '成功' : '失败'}`);
    }

    // 验证消息队列
    const queuePath = path.join(TEST_STATE_DIR, 'message-queue.json');
    if (fs.existsSync(queuePath)) {
      const queue = JSON.parse(fs.readFileSync(queuePath, 'utf8'));
      console.log(`  消息队列长度: ${queue.length}`);
      queue.forEach((m, i) => {
        console.log(`    [${i}] ${m.type} -> ${m.receiver}`);
      });
    }

    healthCheck.unregisterMember('executor-msg');
    stop();
  });

  // 场景 6: 质量检查触发（50% 进度）
  await scenario('50% 进度质量检查触发', async () => {
    const stop = await healthCheck.startHealthCheckLoop(TEST_TEAM, 1000);

    healthCheck.registerMember('executor-quality', {});

    // 逐步增加进度
    for (let progress of [10, 25, 40, 50, 60, 75]) {
      healthCheck.updateMemberState('executor-quality', { progress });
      console.log(`  进度更新: ${progress}%`);

      if (progress === 50) {
        // 在 50% 时应该触发质量检查
        console.log('  -> 应该触发质量检查');
      }

      await sleep(500);
    }

    healthCheck.unregisterMember('executor-quality');
    stop();
  });

  // 场景 7: 错误计数检测
  await scenario('错误计数和协助建议', async () => {
    const stop = await healthCheck.startHealthCheckLoop(TEST_TEAM, 1000);

    healthCheck.registerMember('executor-errors', {});

    // 模拟多次错误
    for (let i = 1; i <= 4; i++) {
      healthCheck.updateMemberState('executor-errors', {
        errorCount: i,
        status: 'working',
      });
      console.log(`  错误计数: ${i}`);
      await sleep(800);
    }

    console.log('  -> 应该触发 ASSIST 建议（错误数 >= 3）');

    healthCheck.unregisterMember('executor-errors');
    stop();
  });

  // 场景 8: 健康报告持续更新
  await scenario('健康报告持续更新', async () => {
    const stop = await healthCheck.startHealthCheckLoop(TEST_TEAM, 1000);

    healthCheck.registerMember('executor-report', { role: 'test' });

    // 多次更新，模拟长时间运行
    for (let i = 0; i < 3; i++) {
      healthCheck.updateMemberState('executor-report', {
        status: 'working',
        progress: (i + 1) * 25,
      });

      await sleep(1200);

      const report = healthCheck.generateHealthReport();
      console.log(`  检查 #${report.checkCount}: 进度 ${(i + 1) * 25}%`);
    }

    // 验证报告文件
    const reportPath = path.join(TEST_STATE_DIR, 'health-report.json');
    if (fs.existsSync(reportPath)) {
      const savedReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
      console.log(`  报告文件已保存: ${savedReport.timestamp}`);
    }

    healthCheck.unregisterMember('executor-report');
    stop();
  });

  // 场景 9: 成员状态转换
  await scenario('成员状态转换追踪', async () => {
    const stop = await healthCheck.startHealthCheckLoop(TEST_TEAM, 1000);

    healthCheck.registerMember('executor-transitions', {});

    const transitions = [
      { status: 'working', progress: 0 },
      { status: 'working', progress: 25 },
      { status: 'idle' },  // 空闲
      { status: 'working', progress: 50 },  // 恢复工作
      { status: 'idle' },  // 再次空闲
    ];

    for (const update of transitions) {
      healthCheck.updateMemberState('executor-transitions', update);
      console.log(`  状态 -> ${update.status}, 进度: ${update.progress || 'N/A'}`);
      await sleep(800);
    }

    // 验证状态文件
    const statePath = path.join(TEST_STATE_DIR, 'executor-transitions.state.json');
    if (fs.existsSync(statePath)) {
      const finalState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      console.log(`  最终状态: ${finalState.status}, idleSince: ${finalState.idleSince ? '有' : '无'}`);
    }

    healthCheck.unregisterMember('executor-transitions');
    stop();
  });

  // 场景 10: 快速注册和注销
  await scenario('快速注册和注销压力测试', async () => {
    const stop = await healthCheck.startHealthCheckLoop(TEST_TEAM, 500);

    const members = [];

    // 快速注册 5 个成员
    for (let i = 0; i < 5; i++) {
      const memberId = `executor-fast-${i}`;
      healthCheck.registerMember(memberId, { index: i });
      members.push(memberId);
    }

    const state1 = healthCheck.getState();
    console.log(`  快速注册后: ${state1.memberCount} 成员`);

    await sleep(1000);

    // 快速注销
    members.forEach(m => healthCheck.unregisterMember(m));

    const state2 = healthCheck.getState();
    console.log(`  快速注销后: ${state2.memberCount} 成员`);

    stop();
  });

  cleanup();

  console.log('\n' + '='.repeat(60));
  console.log('所有场景测试完成！');
  console.log('='.repeat(60));
}

runScenarios().catch(error => {
  console.error('场景测试错误:', error);
  process.exit(1);
});
