# Saga Pattern 事务管理

Saga模式是一种用于分布式系统中管理长事务的设计模式。在Team Skill中，Saga模式用于协调多Agent协作的原子性操作。

## 核心概念

### 什么是Saga

Saga将一个长事务分解为一系列本地事务（称为Steps）。每个本地事务：
1. 执行业务操作
2. 记录执行结果
3. 如果失败，触发补偿操作回滚之前的所有操作

### 补偿（Compensation）

补偿是Saga模式的核心。当某个Step失败时：
1. 停止后续Steps的执行
2. 按逆序执行已成功的Steps的补偿操作
3. 将系统状态回滚到事务开始前的状态

## 使用场景

### 适合使用Saga的场景

| 场景 | 说明 | 示例 |
|------|------|------|
| 多Agent协作 | 需要多个Agent按顺序完成任务 | 创建功能需要架构师→后端→前端→测试 |
| 跨服务操作 | 涉及多个服务的状态变更 | 创建用户需要更新Auth服务+User服务+Notification服务 |
| 资源分配 | 需要分配多个资源 | 创建环境需要分配DB+Cache+Queue |
| 状态转换 | 多步骤状态机 | 订单流程：创建→支付→发货→完成 |

### 不适合使用Saga的场景

- 简单的单步操作
- 不需要回滚能力的操作
- 实时性要求极高的场景（补偿需要时间）

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    Saga Orchestrator                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Step 1    │──▶│   Step 2    │──▶│   Step 3    │         │
│  │  (Action)   │  │  (Action)   │  │  (Action)   │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│         ▼                ▼                ▼                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Compensate  │◀──│ Compensate  │◀──│ Compensate  │         │
│  │   Step 1    │  │   Step 2    │  │   Step 3    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  State Manager  │
                    │  - pending      │
                    │  - running      │
                    │  - succeeded    │
                    │  - failed       │
                    │  - compensating │
                    │  - compensated  │
                    └─────────────────┘
```

## API设计

### Saga定义结构

```javascript
const saga = {
  id: 'create-user-feature',      // Saga唯一标识
  name: 'Create User Feature',     // Saga名称
  steps: [                        // Step列表
    {
      id: 'design-schema',        // Step ID
      name: 'Design DB Schema',   // Step名称
      action: async (ctx) => {    // 执行函数
        // 执行业务逻辑
        return result;
      },
      compensate: async (ctx, result, error) => {
        // 执行补偿逻辑
      },
      timeout: 30000,             // 超时时间(ms)
      retryCount: 2,              // 重试次数
      retryDelay: 1000,           // 重试延迟(ms)
      dependsOn: []               // 依赖的Step IDs
    }
  ],
  onFailure: async (saga, failedStep, error) => {
    // 失败回调
  },
  onSuccess: async (saga, results) => {
    // 成功回调
  },
  continueOnCompensationFailure: false,  // 补偿失败是否继续
  compensationTimeout: 60000,     // 补偿超时
  metadata: {}                    // 元数据
};
```

### 状态定义

#### Saga状态

| 状态 | 说明 |
|------|------|
| `pending` | 等待执行 |
| `running` | 执行中 |
| `succeeded` | 全部成功 |
| `failed` | 执行失败 |
| `compensating` | 补偿中 |
| `compensated` | 补偿完成 |

#### Step状态

| 状态 | 说明 |
|------|------|
| `pending` | 等待执行 |
| `running` | 执行中 |
| `succeeded` | 执行成功 |
| `failed` | 执行失败 |
| `compensating` | 补偿中 |
| `compensated` | 补偿完成 |
| `compensation_failed` | 补偿失败 |

## 使用示例

### 基本用法

```javascript
const { SagaExecutor, SagaBuilder } = require('./saga-executor');

// 方式1: 使用SagaBuilder
const saga = new SagaBuilder()
  .id('deploy-feature')
  .name('Deploy New Feature')
  .step(
    'create-branch',
    async (ctx) => {
      // 创建Git分支
      const branch = await git.createBranch(ctx.featureName);
      return { branchName: branch.name };
    },
    async (ctx, result) => {
      // 补偿：删除分支
      await git.deleteBranch(result.branchName);
    }
  )
  .step(
    'update-database',
    async (ctx) => {
      // 执行数据库迁移
      await db.migrate(ctx.migrationFile);
      return { migrated: true };
    },
    async (ctx, result) => {
      // 补偿：回滚迁移
      await db.rollback(ctx.migrationFile);
    }
  )
  .step(
    'deploy-service',
    async (ctx) => {
      // 部署服务
      await deployer.deploy(ctx.serviceName);
      return { deployed: true };
    },
    async (ctx, result) => {
      // 补偿：停止服务
      await deployer.undeploy(ctx.serviceName);
    }
  )
  .onFailure((saga, failedStep, error) => {
    console.error(`Saga failed at step ${failedStep}:`, error);
  })
  .build();

// 执行Saga
const executor = new SagaExecutor(saga, {
  initialContext: {
    featureName: 'user-auth',
    migrationFile: '001_add_users.sql',
    serviceName: 'auth-service'
  }
});

const result = await executor.execute();
console.log('Saga result:', result.status);
```

### 在Phase 5中使用Saga

```javascript
// Phase 5: 团队执行中的Saga集成

const { SagaBuilder, SagaOrchestrator } = require('../hooks/saga-executor');

// 定义团队创建Saga
const teamCreationSaga = new SagaBuilder()
  .id('create-dev-team')
  .name('Create Development Team')
  .step(
    'create-product-owner',
    async (ctx) => {
      // 创建Product Owner Agent
      const po = await Task({
        description: '生成产品负责人',
        prompt: `你是 product-owner (Mary)...`,
        subagent_type: 'general-purpose',
        name: 'product-owner',
        team_name: ctx.teamName
      });
      return { agentId: po.id, role: 'product-owner' };
    },
    async (ctx, result) => {
      // 补偿：停止Agent
      await TaskStop({ taskId: result.agentId });
    }
  )
  .step(
    'create-backend-dev',
    async (ctx) => {
      const dev = await Task({
        description: '生成后端开发者',
        prompt: `你是 backend-developer (Amelia)...`,
        subagent_type: 'general-purpose',
        name: 'backend-developer',
        team_name: ctx.teamName
      });
      return { agentId: dev.id, role: 'backend-developer' };
    },
    async (ctx, result) => {
      await TaskStop({ taskId: result.agentId });
    }
  )
  .step(
    'create-frontend-dev',
    async (ctx) => {
      const dev = await Task({
        description: '生成前端开发者',
        prompt: `你是 frontend-developer (Alex)...`,
        subagent_type: 'general-purpose',
        name: 'frontend-developer',
        team_name: ctx.teamName
      });
      return { agentId: dev.id, role: 'frontend-developer' };
    },
    async (ctx, result) => {
      await TaskStop({ taskId: result.agentId });
    }
  )
  .step(
    'assign-tasks',
    async (ctx) => {
      // 分配任务给各个Agent
      await TaskCreate({
        subject: '设计数据库Schema',
        description: '根据需求设计用户表结构',
        owner: 'backend-developer'
      });
      await TaskCreate({
        subject: '设计API接口',
        description: '定义RESTful API',
        owner: 'backend-developer'
      });
      return { tasksAssigned: true };
    },
    async (ctx, result) => {
      // 补偿：取消任务分配
      await TaskUpdate({ taskId: '...', status: 'cancelled' });
    }
  )
  .onFailure((saga, failedStep, error) => {
    // 通知Coordinator团队创建失败
    SendMessage({
      type: 'team_creation_failed',
      receiver: 'coordinator',
      content: { failedStep, error: error.message }
    });
  })
  .build();

// 在Phase 5中执行
async function executePhase5(userInput, teamName) {
  const orchestrator = new SagaOrchestrator();
  orchestrator.register(teamCreationSaga);

  // 监听事件
  orchestrator.on('saga-started', (id, record) => {
    console.log(`[Phase 5] Saga ${id} started`);
  });

  orchestrator.on('step-succeeded', (sagaId, stepId) => {
    console.log(`[Phase 5] Step ${stepId} completed`);
  });

  orchestrator.on('saga-compensating', (id, record) => {
    console.log(`[Phase 5] Saga ${id} compensating...`);
  });

  // 执行
  const result = await orchestrator.execute('create-dev-team', {
    teamName,
    userInput
  });

  if (result.status === 'succeeded') {
    console.log('[Phase 5] Team created successfully');
    return { success: true, teamName };
  } else {
    console.error('[Phase 5] Team creation failed:', result.failedStepId);
    return { success: false, error: result.error };
  }
}
```

### 带依赖关系的Steps

```javascript
const saga = new SagaBuilder()
  .id('complex-feature')
  .step('design-architecture', action1, compensate1)
  .step('design-database', action2, compensate2, {
    dependsOn: ['design-architecture']  // 依赖架构设计完成
  })
  .step('implement-backend', action3, compensate3, {
    dependsOn: ['design-database']  // 依赖数据库设计完成
  })
  .step('implement-frontend', action4, compensate4, {
    dependsOn: ['design-architecture']  // 只需要架构设计
  })
  .step('run-tests', action5, compensate5, {
    dependsOn: ['implement-backend', 'implement-frontend']  // 依赖前后端都完成
  })
  .build();
```

### 带重试的Step

```javascript
const saga = new SagaBuilder()
  .id('api-integration')
  .step(
    'call-external-api',
    async (ctx) => {
      const response = await fetch(ctx.apiUrl);
      if (!response.ok) throw new Error('API call failed');
      return response.json();
    },
    async (ctx, result) => {
      // 补偿：撤销API调用
      await fetch(`${ctx.apiUrl}/undo`, { method: 'POST' });
    },
    {
      timeout: 10000,      // 10秒超时
      retryCount: 3,       // 重试3次
      retryDelay: 2000     // 每次间隔2秒
    }
  )
  .build();
```

## 事件监听

SagaExecutor会触发以下事件：

```javascript
const executor = new SagaExecutor(saga);

// Saga级别事件
executor.on('started', (record) => {
  console.log('Saga started');
});

executor.on('succeeded', (record) => {
  console.log('Saga succeeded');
});

executor.on('failed', (record) => {
  console.log('Saga failed');
});

executor.on('compensating', (record) => {
  console.log('Saga compensating...');
});

executor.on('compensated', (record, results) => {
  console.log('Saga compensated');
});

// Step级别事件
executor.on('step-started', (stepId, record) => {
  console.log(`Step ${stepId} started`);
});

executor.on('step-succeeded', (stepId, result, record) => {
  console.log(`Step ${stepId} succeeded`);
});

executor.on('step-failed', (stepId, error, record) => {
  console.log(`Step ${stepId} failed:`, error);
});

executor.on('step-retry', (stepId, attempt, maxAttempts, error) => {
  console.log(`Step ${stepId} retry ${attempt}/${maxAttempts}`);
});

executor.on('step-compensated', (stepId, result, record) => {
  console.log(`Step ${stepId} compensated`);
});

executor.on('compensation-failed', (stepId, error, record) => {
  console.log(`Step ${stepId} compensation failed:`, error);
});
```

## 最佳实践

### 1. 补偿操作设计原则

- **幂等性**：补偿操作应该可以安全地执行多次
- **最终一致性**：补偿操作可能无法立即完成，需要有重试机制
- **记录日志**：补偿操作应该详细记录执行过程

```javascript
// 好的补偿示例
async function compensateCreateUser(ctx, result, error) {
  const userId = result.userId;

  // 记录补偿开始
  console.log(`[Compensate] Starting user deletion: ${userId}`);

  try {
    // 检查用户是否存在（幂等性）
    const user = await db.users.findById(userId);
    if (!user) {
      console.log(`[Compensate] User ${userId} already deleted`);
      return;
    }

    // 执行删除
    await db.users.delete(userId);

    // 记录补偿成功
    console.log(`[Compensate] User ${userId} deleted successfully`);
  } catch (err) {
    // 记录补偿失败，需要人工介入
    console.error(`[Compensate] Failed to delete user ${userId}:`, err);
    throw err;  // 抛出错误让上层处理
  }
}
```

### 2. 上下文传递

```javascript
const saga = new SagaBuilder()
  .id('order-processing')
  .step(
    'create-order',
    async (ctx) => {
      const order = await db.orders.create(ctx.orderData);
      // 结果会自动存入上下文
      return { orderId: order.id, amount: order.amount };
    },
    compensateCreateOrder
  )
  .step(
    'process-payment',
    async (ctx) => {
      // 访问之前step的结果
      const orderId = ctx.createOrderResult.orderId;
      const amount = ctx.createOrderResult.amount;

      const payment = await paymentService.charge({
        orderId,
        amount,
        userId: ctx.userId
      });

      return { paymentId: payment.id };
    },
    compensateProcessPayment
  )
  .step(
    'send-confirmation',
    async (ctx) => {
      // 访问多个之前step的结果
      const orderId = ctx.createOrderResult.orderId;
      const paymentId = ctx.processPaymentResult.paymentId;

      await emailService.send({
        to: ctx.userEmail,
        template: 'order-confirmation',
        data: { orderId, paymentId }
      });

      return { sent: true };
    },
    compensateSendConfirmation
  )
  .build();
```

### 3. 错误处理

```javascript
const saga = new SagaBuilder()
  .id('critical-operation')
  .step('step1', action1, compensate1)
  .step('step2', action2, compensate2)
  .onFailure(async (record, failedStepId, error) => {
    // 根据错误类型采取不同措施
    if (error.code === 'NETWORK_ERROR') {
      // 网络错误，可以重试
      await scheduleRetry(record.sagaId);
    } else if (error.code === 'VALIDATION_ERROR') {
      // 验证错误，通知用户
      await notifyUser('输入数据无效，请检查');
    } else {
      // 未知错误，需要人工介入
      await alertOpsTeam(record, error);
    }
  })
  .build();
```

### 4. 超时配置

```javascript
const executor = new SagaExecutor(saga, {
  config: {
    stepTimeout: 60000,           // Step执行超时：60秒
    compensationTimeout: 120000,  // 补偿超时：120秒
    retryCount: 2,                // 默认重试2次
    retryDelay: 5000,             // 重试间隔5秒
    continueOnCompensationFailure: false,  // 补偿失败时停止
    persistState: true            // 持久化状态
  }
});
```

## 监控和调试

### 查看Saga状态

```javascript
const { listSagaStates, loadSagaState } = require('./saga-executor');

// 列出所有Saga
const states = listSagaStates();
console.log(states);
// [
//   { sagaId: 'deploy-feature-001', status: 'succeeded', timestamp: 1700000000000 },
//   { sagaId: 'deploy-feature-002', status: 'compensated', timestamp: 1700000100000 }
// ]

// 加载特定Saga的详细状态
const state = loadSagaState('deploy-feature-002');
console.log(JSON.stringify(state, null, 2));
```

### 健康检查集成

```javascript
// 在health-check.js中集成Saga监控
const { listSagaStates, SAGA_STATUS } = require('./saga-executor');

function checkSagaHealth() {
  const states = listSagaStates();
  const activeSagas = states.filter(s =>
    s.status === SAGA_STATUS.RUNNING ||
    s.status === SAGA_STATUS.COMPENSATING
  );

  if (activeSagas.length > 0) {
    console.log(`[Health Check] ${activeSagas.length} active sagas`);
  }

  // 检查长时间运行的Saga
  const now = Date.now();
  const stuckSagas = activeSagas.filter(s => {
    const duration = now - s.timestamp;
    return duration > 10 * 60 * 1000;  // 超过10分钟
  });

  if (stuckSagas.length > 0) {
    console.error('[Health Check] Stuck sagas detected:', stuckSagas);
  }
}
```

## 性能考虑

1. **Step粒度**：Step应该足够小以便快速补偿，但也不能太细导致管理复杂
2. **超时设置**：根据实际操作设置合理的超时时间
3. **并发执行**：当前实现是顺序执行，未来可支持并行执行无依赖的Steps
4. **状态持久化**：生产环境建议启用状态持久化以便故障恢复

## 限制和注意事项

1. **补偿不是回滚**：补偿是业务操作，不是数据库事务回滚
2. **补偿可能失败**：需要处理补偿失败的情况
3. **可见性问题**：补偿期间系统处于不一致状态
4. **不适合高并发**：Saga适合低频、重要的业务操作

## 相关参考

- [Phase 5 执行阶段](../phases/phase-05-execution.md)
- [Health Check 系统](./hooks/health-check.js)
- [可靠性框架](./reliability-framework.md)
- [回滚恢复](./rollback-recovery.md)
