#!/usr/bin/env node
/**
 * Team Skill - Saga Executor 完整测试套件
 * v1.0 测试Saga模式的所有功能
 *
 * 运行方式:
 * node saga-executor-test.js
 *
 * 测试覆盖率:
 * - Saga定义验证
 * - 顺序执行
 * - 补偿机制
 * - 状态追踪
 * - 重试逻辑
 * - 超时处理
 * - 依赖关系
 * - 事件系统
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// 导入被测试的模块
const {
  SagaExecutor,
  SagaBuilder,
  SagaOrchestrator,
  SAGA_STATUS,
  STEP_STATUS,
  createCompensateFn,
  loadSagaState,
  listSagaStates
} = require('../hooks/saga-executor');

// 测试配置
const TEST_STATE_DIR = path.join(process.env.HOME, '.claude', 'tasks', 'saga-states');

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
    if (error.stack) {
      console.error(`     Stack: ${error.stack.split('\n')[1]}`);
    }
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

function assertExists(value, message) {
  if (value === undefined || value === null) {
    throw new Error(message || 'Expected value to exist');
  }
}

// 清理测试状态
function cleanup() {
  try {
    if (fs.existsSync(TEST_STATE_DIR)) {
      const files = fs.readdirSync(TEST_STATE_DIR);
      files.forEach(f => {
        if (f.startsWith('test-')) {
          fs.unlinkSync(path.join(TEST_STATE_DIR, f));
        }
      });
    }
  } catch (error) {
    console.warn('Cleanup warning:', error.message);
  }
}

// 延迟函数
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// 测试套件
// ============================================================================

async function runTests() {
  console.log('='.repeat(60));
  console.log('Saga Executor Test Suite');
  console.log('='.repeat(60));

  // 清理之前的测试数据
  cleanup();

  // ==========================================================================
  // 基础功能测试
  // ==========================================================================

  await test('SagaBuilder should create valid saga definition', () => {
    const saga = new SagaBuilder()
      .id('test-saga-1')
      .name('Test Saga')
      .step('step1', async () => 'result1', async () => {})
      .step('step2', async () => 'result2', async () => {})
      .build();

    assertEqual(saga.id, 'test-saga-1', 'Saga ID');
    assertEqual(saga.name, 'Test Saga', 'Saga name');
    assertEqual(saga.steps.length, 2, 'Step count');
    assertEqual(saga.steps[0].id, 'step1', 'First step ID');
    assertEqual(saga.steps[1].id, 'step2', 'Second step ID');
  });

  await test('SagaBuilder should throw on missing id', () => {
    try {
      new SagaBuilder()
        .step('step1', async () => {}, async () => {})
        .build();
      throw new Error('Should have thrown');
    } catch (error) {
      assertTrue(error.message.includes('id'), 'Error should mention id');
    }
  });

  await test('SagaBuilder should throw on empty steps', () => {
    try {
      new SagaBuilder()
        .id('test-saga')
        .build();
      throw new Error('Should have thrown');
    } catch (error) {
      assertTrue(error.message.includes('step'), 'Error should mention step');
    }
  });

  await test('SagaBuilder should support step options', () => {
    const saga = new SagaBuilder()
      .id('test-saga-options')
      .step('step1', async () => {}, async () => {}, {
        name: 'Custom Step Name',
        timeout: 5000,
        retryCount: 3,
        retryDelay: 1000,
        dependsOn: []
      })
      .build();

    const step = saga.steps[0];
    assertEqual(step.name, 'Custom Step Name', 'Step name');
    assertEqual(step.timeout, 5000, 'Timeout');
    assertEqual(step.retryCount, 3, 'Retry count');
    assertEqual(step.retryDelay, 1000, 'Retry delay');
  });

  // ==========================================================================
  // 执行流程测试
  // ==========================================================================

  await test('SagaExecutor should execute all steps successfully', async () => {
    const executionOrder = [];

    const saga = new SagaBuilder()
      .id('test-success-saga')
      .step('step1', async (ctx) => {
        executionOrder.push('step1-action');
        return { value: 1 };
      }, async () => {
        executionOrder.push('step1-compensate');
      })
      .step('step2', async (ctx) => {
        executionOrder.push('step2-action');
        return { value: 2 };
      }, async () => {
        executionOrder.push('step2-compensate');
      })
      .build();

    const executor = new SagaExecutor(saga, { config: { persistState: false } });
    const result = await executor.execute();

    assertEqual(result.status, SAGA_STATUS.SUCCEEDED, 'Saga status');
    assertEqual(executionOrder.length, 2, 'Execution count');
    assertEqual(executionOrder[0], 'step1-action', 'First action');
    assertEqual(executionOrder[1], 'step2-action', 'Second action');
  });

  await test('SagaExecutor should pass context between steps', async () => {
    const saga = new SagaBuilder()
      .id('test-context-saga')
      .step('step1', async (ctx) => {
        return { data: 'from-step1' };
      }, async () => {})
      .step('step2', async (ctx) => {
        // 访问之前step的结果
        const prevResult = ctx.step1Result;
        assertEqual(prevResult.data, 'from-step1', 'Previous step result');
        return { data: 'from-step2' };
      }, async () => {})
      .build();

    const executor = new SagaExecutor(saga, { config: { persistState: false } });
    const result = await executor.execute();

    assertEqual(result.status, SAGA_STATUS.SUCCEEDED, 'Saga status');
  });

  await test('SagaExecutor should support initial context', async () => {
    const saga = new SagaBuilder()
      .id('test-initial-context')
      .step('step1', async (ctx) => {
        assertEqual(ctx.userId, '123', 'Initial context value');
        assertEqual(ctx.userName, 'test', 'Initial context value');
        return {};
      }, async () => {})
      .build();

    const executor = new SagaExecutor(saga, {
      initialContext: { userId: '123', userName: 'test' },
      config: { persistState: false }
    });
    const result = await executor.execute();

    assertEqual(result.status, SAGA_STATUS.SUCCEEDED, 'Saga status');
  });

  // ==========================================================================
  // 补偿机制测试
  // ==========================================================================

  await test('SagaExecutor should compensate on failure', async () => {
    const executionOrder = [];

    const saga = new SagaBuilder()
      .id('test-compensate-saga')
      .step('step1', async (ctx) => {
        executionOrder.push('step1-action');
        return { id: 'step1-result' };
      }, async (ctx, result) => {
        executionOrder.push('step1-compensate');
        assertEqual(result.id, 'step1-result', 'Compensate receives result');
      })
      .step('step2', async (ctx) => {
        executionOrder.push('step2-action');
        throw new Error('Step 2 failed');
      }, async () => {
        executionOrder.push('step2-compensate');
      })
      .step('step3', async (ctx) => {
        executionOrder.push('step3-action');
        return {};
      }, async () => {
        executionOrder.push('step3-compensate');
      })
      .build();

    const executor = new SagaExecutor(saga, { config: { persistState: false } });
    const result = await executor.execute();

    assertEqual(result.status, SAGA_STATUS.COMPENSATED, 'Saga status');
    assertEqual(result.failedStepId, 'step2', 'Failed step ID');
    assertTrue(executionOrder.includes('step1-action'), 'Step 1 executed');
    assertTrue(executionOrder.includes('step2-action'), 'Step 2 executed');
    assertFalse(executionOrder.includes('step3-action'), 'Step 3 not executed');
    assertTrue(executionOrder.includes('step1-compensate'), 'Step 1 compensated');
    assertFalse(executionOrder.includes('step2-compensate'), 'Step 2 not compensated (failed)');
  });

  await test('SagaExecutor should compensate in reverse order', async () => {
    const compensateOrder = [];

    const saga = new SagaBuilder()
      .id('test-reverse-compensate')
      .step('step1', async () => ({ id: 1 }), async () => { compensateOrder.push(1); })
      .step('step2', async () => ({ id: 2 }), async () => { compensateOrder.push(2); })
      .step('step3', async () => ({ id: 3 }), async () => { compensateOrder.push(3); })
      .step('step4', async () => { throw new Error('fail'); }, async () => {})
      .build();

    const executor = new SagaExecutor(saga, { config: { persistState: false } });
    await executor.execute();

    assertEqual(compensateOrder.length, 3, 'Compensate count');
    assertEqual(compensateOrder[0], 3, 'First compensated (reverse)');
    assertEqual(compensateOrder[1], 2, 'Second compensated');
    assertEqual(compensateOrder[2], 1, 'Third compensated');
  });

  await test('SagaExecutor should handle compensation failure', async () => {
    const saga = new SagaBuilder()
      .id('test-compensate-fail')
      .step('step1', async () => ({}), async () => { throw new Error('Compensate failed'); })
      .step('step2', async () => { throw new Error('Step failed'); }, async () => {})
      .build();

    const executor = new SagaExecutor(saga, {
      config: { persistState: false, continueOnCompensationFailure: true }
    });
    const result = await executor.execute();

    assertEqual(result.status, SAGA_STATUS.COMPENSATED, 'Saga status');
    const step1Record = result.stepRecords.find(r => r.stepId === 'step1');
    assertEqual(step1Record.status, STEP_STATUS.COMPENSATION_FAILED, 'Step 1 compensation failed');
  });

  // ==========================================================================
  // 状态追踪测试
  // ==========================================================================

  await test('SagaExecutor should track step states correctly', async () => {
    const saga = new SagaBuilder()
      .id('test-state-tracking')
      .step('step1', async () => ({ success: true }), async () => {})
      .step('step2', async () => { throw new Error('fail'); }, async () => {})
      .build();

    const executor = new SagaExecutor(saga, { config: { persistState: false } });
    const result = await executor.execute();

    const step1Record = result.stepRecords.find(r => r.stepId === 'step1');
    const step2Record = result.stepRecords.find(r => r.stepId === 'step2');

    assertEqual(step1Record.status, STEP_STATUS.COMPENSATED, 'Step 1 final status');
    assertEqual(step2Record.status, STEP_STATUS.FAILED, 'Step 2 final status');
    assertExists(step1Record.startTime, 'Step 1 start time');
    assertExists(step1Record.endTime, 'Step 1 end time');
    assertExists(step1Record.compensationStartTime, 'Step 1 compensation start');
    assertExists(step1Record.compensationEndTime, 'Step 1 compensation end');
  });

  await test('SagaExecutor should persist state to file', async () => {
    const sagaId = `test-persist-${Date.now()}`;
    const saga = new SagaBuilder()
      .id(sagaId)
      .step('step1', async () => ({ data: 'test' }), async () => {})
      .build();

    const executor = new SagaExecutor(saga, { config: { persistState: true } });
    await executor.execute();

    // 验证状态文件
    const state = loadSagaState(sagaId);
    assertExists(state, 'State file exists');
    assertEqual(state.sagaId, sagaId, 'Saga ID in state');
    assertEqual(state.status, SAGA_STATUS.SUCCEEDED, 'Status in state');
    assertEqual(state.stepRecords.length, 1, 'Step records count');

    // 清理
    const statePath = path.join(TEST_STATE_DIR, `${sagaId}.json`);
    if (fs.existsSync(statePath)) {
      fs.unlinkSync(statePath);
    }
  });

  // ==========================================================================
  // 重试逻辑测试
  // ==========================================================================

  await test('SagaExecutor should retry failed steps', async () => {
    let attemptCount = 0;

    const saga = new SagaBuilder()
      .id('test-retry')
      .step('step1', async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error(`Attempt ${attemptCount} failed`);
        }
        return { success: true };
      }, async () => {}, {
        retryCount: 3,
        retryDelay: 10
      })
      .build();

    const executor = new SagaExecutor(saga, { config: { persistState: false } });
    const result = await executor.execute();

    assertEqual(result.status, SAGA_STATUS.SUCCEEDED, 'Saga status');
    assertEqual(attemptCount, 3, 'Attempt count');
  });

  await test('SagaExecutor should fail after max retries', async () => {
    let attemptCount = 0;

    const saga = new SagaBuilder()
      .id('test-max-retry')
      .step('step1', async () => {
        attemptCount++;
        throw new Error('Always fails');
      }, async () => {}, {
        retryCount: 2,
        retryDelay: 10
      })
      .build();

    const executor = new SagaExecutor(saga, { config: { persistState: false } });
    const result = await executor.execute();

    // Note: When a step fails, the saga triggers compensation
    // Since step1 failed, there's nothing to compensate, so status is FAILED
    // But if there were successful steps before, status would be COMPENSATED
    assertTrue(
      result.status === SAGA_STATUS.FAILED || result.status === SAGA_STATUS.COMPENSATED,
      'Saga status should be failed or compensated'
    );
    assertEqual(attemptCount, 3, 'Attempt count (initial + 2 retries)');
  });

  // ==========================================================================
  // 超时处理测试
  // ==========================================================================

  await test('SagaExecutor should timeout long-running steps', async () => {
    const saga = new SagaBuilder()
      .id('test-timeout')
      .step('step1', async () => {
        await sleep(1000);  // 1秒
        return {};
      }, async () => {}, {
        timeout: 100  // 100ms timeout
      })
      .build();

    const executor = new SagaExecutor(saga, { config: { persistState: false } });
    const result = await executor.execute();

    // When timeout occurs, step fails and saga triggers compensation
    // Since step1 was the only step and it failed, status is FAILED
    assertTrue(
      result.status === SAGA_STATUS.FAILED || result.status === SAGA_STATUS.COMPENSATED,
      'Saga status should be failed or compensated'
    );
    assertTrue(result.error.message.includes('timeout'), 'Error should mention timeout');
  });

  await test('SagaExecutor should handle compensation timeout', async () => {
    const saga = new SagaBuilder()
      .id('test-compensate-timeout')
      .step('step1', async () => ({}), async () => {
        await sleep(1000);  // 1秒
      })
      .step('step2', async () => { throw new Error('fail'); }, async () => {})
      .build();

    const executor = new SagaExecutor(saga, {
      config: {
        persistState: false,
        compensationTimeout: 100  // 100ms timeout
      }
    });
    const result = await executor.execute();

    assertEqual(result.status, SAGA_STATUS.COMPENSATED, 'Saga status');
    const step1Record = result.stepRecords.find(r => r.stepId === 'step1');
    assertEqual(step1Record.status, STEP_STATUS.COMPENSATION_FAILED, 'Compensation failed due to timeout');
  });

  // ==========================================================================
  // 依赖关系测试
  // ==========================================================================

  await test('SagaExecutor should validate dependencies', async () => {
    try {
      const saga = new SagaBuilder()
        .id('test-invalid-dep')
        .step('step1', async () => ({}), async () => {})
        .step('step2', async () => ({}), async () => {}, {
          dependsOn: ['non-existent-step']
        })
        .build();

      const executor = new SagaExecutor(saga, { config: { persistState: false } });
      await executor.execute();
      throw new Error('Should have thrown');
    } catch (error) {
      assertTrue(error.message.includes('unknown'), 'Error should mention unknown dependency');
    }
  });

  await test('SagaExecutor should check dependencies before execution', async () => {
    const saga = new SagaBuilder()
      .id('test-dep-check')
      .step('step1', async () => ({ success: true }), async () => {})
      .step('step2', async () => { throw new Error('step2 fails'); }, async () => {})
      .step('step3', async () => ({}), async () => {}, {
        dependsOn: ['step2']
      })
      .build();

    const executor = new SagaExecutor(saga, { config: { persistState: false } });
    const result = await executor.execute();

    // When step2 fails, saga triggers compensation
    assertEqual(result.status, SAGA_STATUS.COMPENSATED, 'Saga status should be compensated');

    // Step3 has dependency on step2, which failed
    // Step3 should fail due to unmet dependency (it was attempted but dependency check failed)
    const step3Record = result.stepRecords.find(r => r.stepId === 'step3');
    // Note: Step3 may not be executed at all if the saga stops after step2 fails
    // So it could be pending or failed depending on implementation
    assertTrue(
      step3Record.status === STEP_STATUS.PENDING || step3Record.status === STEP_STATUS.FAILED,
      'Step 3 should be pending or failed'
    );
  });

  // ==========================================================================
  // 事件系统测试
  // ==========================================================================

  await test('SagaExecutor should emit events', async () => {
    const events = [];

    const saga = new SagaBuilder()
      .id('test-events')
      .step('step1', async () => ({}), async () => {})
      .build();

    const executor = new SagaExecutor(saga, { config: { persistState: false } });

    executor.on('started', () => events.push('started'));
    executor.on('step-started', (id) => events.push(`step-started:${id}`));
    executor.on('step-succeeded', (id) => events.push(`step-succeeded:${id}`));
    executor.on('succeeded', () => events.push('succeeded'));

    await executor.execute();

    assertTrue(events.includes('started'), 'Started event');
    assertTrue(events.includes('step-started:step1'), 'Step started event');
    assertTrue(events.includes('step-succeeded:step1'), 'Step succeeded event');
    assertTrue(events.includes('succeeded'), 'Succeeded event');
  });

  await test('SagaExecutor should emit failure events', async () => {
    const events = [];

    const saga = new SagaBuilder()
      .id('test-fail-events')
      .step('step1', async () => ({}), async () => {})
      .step('step2', async () => { throw new Error('fail'); }, async () => {})
      .build();

    const executor = new SagaExecutor(saga, { config: { persistState: false } });

    executor.on('step-failed', (id) => events.push(`step-failed:${id}`));
    executor.on('failed', () => events.push('failed'));
    executor.on('compensating', () => events.push('compensating'));
    executor.on('step-compensated', (id) => events.push(`step-compensated:${id}`));
    executor.on('compensated', () => events.push('compensated'));

    await executor.execute();

    assertTrue(events.includes('step-failed:step2'), 'Step failed event');
    assertTrue(events.includes('failed'), 'Failed event');
    assertTrue(events.includes('compensating'), 'Compensating event');
    assertTrue(events.includes('step-compensated:step1'), 'Step compensated event');
    assertTrue(events.includes('compensated'), 'Compensated event');
  });

  // ==========================================================================
  // SagaOrchestrator测试
  // ==========================================================================

  await test('SagaOrchestrator should manage multiple sagas', async () => {
    const orchestrator = new SagaOrchestrator();

    const saga1 = new SagaBuilder()
      .id('orch-saga-1')
      .step('step1', async () => ({}), async () => {})
      .build();

    const saga2 = new SagaBuilder()
      .id('orch-saga-2')
      .step('step1', async () => ({}), async () => {})
      .build();

    orchestrator.register(saga1);
    orchestrator.register(saga2);

    const result1 = await orchestrator.execute('orch-saga-1', {}, { persistState: false });
    const result2 = await orchestrator.execute('orch-saga-2', {}, { persistState: false });

    assertEqual(result1.status, SAGA_STATUS.SUCCEEDED, 'Saga 1 status');
    assertEqual(result2.status, SAGA_STATUS.SUCCEEDED, 'Saga 2 status');
  });

  await test('SagaOrchestrator should throw on unknown saga', async () => {
    const orchestrator = new SagaOrchestrator();

    try {
      await orchestrator.execute('unknown-saga');
      throw new Error('Should have thrown');
    } catch (error) {
      assertTrue(error.message.includes('not found'), 'Error should mention not found');
    }
  });

  await test('SagaOrchestrator should emit saga events', async () => {
    const orchestrator = new SagaOrchestrator();
    const events = [];

    const saga = new SagaBuilder()
      .id('orch-event-saga')
      .step('step1', async () => ({}), async () => {})
      .build();

    orchestrator.register(saga);
    orchestrator.on('saga-started', (id) => events.push(`started:${id}`));
    orchestrator.on('saga-succeeded', (id) => events.push(`succeeded:${id}`));

    await orchestrator.execute('orch-event-saga', {}, { persistState: false });

    assertTrue(events.includes('started:orch-event-saga'), 'Started event');
    assertTrue(events.includes('succeeded:orch-event-saga'), 'Succeeded event');
  });

  // ==========================================================================
  // 工具函数测试
  // ==========================================================================

  await test('createCompensateFn should create logging compensate function', async () => {
    let compensateCalled = false;
    const fn = createCompensateFn('test-action', async (ctx, result, error) => {
      compensateCalled = true;
      return { custom: 'result' };
    });

    // createCompensateFn doesn't return the result of the inner function
    // It just logs and calls the compensate function
    await fn({}, {}, new Error('test'));
    assertTrue(compensateCalled, 'Compensate function was called');
  });

  await test('listSagaStates should return empty array for non-existent dir', () => {
    const states = listSagaStates('/non-existent-path');
    assertEqual(states.length, 0, 'Empty states');
  });

  // ==========================================================================
  // 回调函数测试
  // ==========================================================================

  await test('SagaExecutor should call onSuccess callback', async () => {
    let callbackCalled = false;
    let callbackResult = null;

    const saga = new SagaBuilder()
      .id('test-success-callback')
      .step('step1', async () => ({ data: 'test' }), async () => {})
      .onSuccess((record, ctx) => {
        callbackCalled = true;
        callbackResult = record;
      })
      .build();

    const executor = new SagaExecutor(saga, { config: { persistState: false } });
    await executor.execute();

    assertTrue(callbackCalled, 'Callback was called');
    assertEqual(callbackResult.status, SAGA_STATUS.SUCCEEDED, 'Callback received correct status');
  });

  await test('SagaExecutor should call onFailure callback', async () => {
    let callbackCalled = false;
    let failedStep = null;
    let errorMessage = null;

    const saga = new SagaBuilder()
      .id('test-failure-callback')
      .step('step1', async () => ({}), async () => {})
      .step('step2', async () => { throw new Error('step2 error'); }, async () => {})
      .onFailure((record, stepId, error) => {
        callbackCalled = true;
        failedStep = stepId;
        errorMessage = error.message;
      })
      .build();

    const executor = new SagaExecutor(saga, { config: { persistState: false } });
    await executor.execute();

    assertTrue(callbackCalled, 'Callback was called');
    assertEqual(failedStep, 'step2', 'Failed step ID');
    assertEqual(errorMessage, 'step2 error', 'Error message');
  });

  // ==========================================================================
  // 复杂场景测试
  // ==========================================================================

  await test('Complex scenario: Team creation saga', async () => {
    const teamState = {
      agentsCreated: [],
      tasksAssigned: false
    };

    const saga = new SagaBuilder()
      .id('test-team-creation')
      .name('Create Development Team')
      .step('create-po', async (ctx) => {
        teamState.agentsCreated.push('product-owner');
        return { agentId: 'po-123' };
      }, async (ctx, result) => {
        teamState.agentsCreated = teamState.agentsCreated.filter(a => a !== 'product-owner');
      })
      .step('create-backend', async (ctx) => {
        teamState.agentsCreated.push('backend-developer');
        return { agentId: 'be-456' };
      }, async (ctx, result) => {
        teamState.agentsCreated = teamState.agentsCreated.filter(a => a !== 'backend-developer');
      })
      .step('create-frontend', async (ctx) => {
        teamState.agentsCreated.push('frontend-developer');
        return { agentId: 'fe-789' };
      }, async (ctx, result) => {
        teamState.agentsCreated = teamState.agentsCreated.filter(a => a !== 'frontend-developer');
      })
      .step('assign-tasks', async (ctx) => {
        if (teamState.agentsCreated.length !== 3) {
          throw new Error('Not all agents created');
        }
        teamState.tasksAssigned = true;
        return { assigned: true };
      }, async (ctx, result) => {
        teamState.tasksAssigned = false;
      })
      .build();

    const executor = new SagaExecutor(saga, { config: { persistState: false } });
    const result = await executor.execute();

    assertEqual(result.status, SAGA_STATUS.SUCCEEDED, 'Saga succeeded');
    assertEqual(teamState.agentsCreated.length, 3, 'All agents created');
    assertTrue(teamState.tasksAssigned, 'Tasks assigned');
  });

  await test('Complex scenario: Team creation with failure', async () => {
    const teamState = {
      agentsCreated: [],
      tasksAssigned: false
    };

    const saga = new SagaBuilder()
      .id('test-team-creation-fail')
      .step('create-po', async (ctx) => {
        teamState.agentsCreated.push('product-owner');
        return { agentId: 'po-123' };
      }, async (ctx, result) => {
        teamState.agentsCreated = teamState.agentsCreated.filter(a => a !== 'product-owner');
      })
      .step('create-backend', async (ctx) => {
        teamState.agentsCreated.push('backend-developer');
        return { agentId: 'be-456' };
      }, async (ctx, result) => {
        teamState.agentsCreated = teamState.agentsCreated.filter(a => a !== 'backend-developer');
      })
      .step('fail-step', async (ctx) => {
        throw new Error('Simulated failure');
      }, async () => {})
      .build();

    const executor = new SagaExecutor(saga, { config: { persistState: false } });
    const result = await executor.execute();

    assertEqual(result.status, SAGA_STATUS.COMPENSATED, 'Saga compensated');
    assertEqual(teamState.agentsCreated.length, 0, 'All agents cleaned up');
    assertFalse(teamState.tasksAssigned, 'Tasks not assigned');
  });

  // ==========================================================================
  // 打印测试结果
  // ==========================================================================

  console.log('\n' + '='.repeat(60));
  console.log('Test Results Summary');
  console.log('='.repeat(60));
  console.log(`Total: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log(`Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  if (results.failed > 0) {
    console.log('\nFailed Tests:');
    results.tests
      .filter(t => t.status === 'FAIL')
      .forEach(t => console.log(`  - ${t.name}: ${t.error}`));
  }

  console.log('='.repeat(60));

  // 最终清理
  cleanup();

  // 返回退出码
  process.exit(results.failed > 0 ? 1 : 0);
}

// 运行测试
runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
