# Team Skill 测试指南

> 版本: 1.0.0 | 更新时间: 2026-02-20

本文档描述 Team Skill 的测试架构、测试类型和如何添加新测试。

---

## 测试架构

### 测试目录结构

```
tests/
├── README.md                      # 本文档
├── test-cases.md                  # 测试用例文档
├── health-check.test.js           # 健康检查测试
├── health-check-test.js           # 健康检查独立测试
├── saga-executor-test.js          # Saga 执行器测试
├── passive-mcp-detection-test.js  # 被动 MCP 检测测试
└── scenario-test.js               # 场景测试
```

### 测试类型

| 类型 | 文件 | 说明 |
|------|------|------|
| 单元测试 | `*.test.js` | 测试单个模块功能 |
| 集成测试 | `*-test.js` | 测试模块间协作 |
| 场景测试 | `scenario-test.js` | 端到端场景验证 |

---

## 运行测试

### 运行所有测试

```bash
cd ~/.claude/skills/team

# 运行所有测试
npm test

# 或使用 Node 直接运行
node tests/health-check.test.js
node tests/saga-executor-test.js
node tests/passive-mcp-detection-test.js
node tests/scenario-test.js
```

### 运行特定测试

```bash
# 健康检查测试
node tests/health-check.test.js

# Saga 测试
node tests/saga-executor-test.js

# 被动检测测试
node tests/passive-mcp-detection-test.js
```

### 带参数运行

```bash
# 指定团队名称
node tests/health-check.test.js --team my-test-team

# 启用详细日志
DEBUG=true node tests/health-check.test.js
```

---

## 测试覆盖范围

### 1. 健康检查测试 (health-check.test.js)

**测试内容:**
- 成员注册/注销
- 状态更新
- MCP 调用注册
- 消息发送/确认
- 健康报告生成

**关键测试用例:**
```javascript
// 测试成员注册
test('registerMember: should register a new member', async () => {
  HealthCheck.registerMember('test-agent', { status: 'idle' });
  const state = HealthCheck.getState();
  assert.strictEqual(state.memberCount, 1);
});

// 测试 MCP 超时检测
test('checkMCPTimeouts: should detect stuck MCP calls', async () => {
  HealthCheck.registerMCPCallStart('test-agent', 'WebSearch');
  // 模拟超时
  await sleep(65000);
  const anomalies = await HealthCheck.checkMCPTimeouts();
  assert.strictEqual(anomalies.length, 1);
});
```

### 2. Saga 执行器测试 (saga-executor-test.js)

**测试内容:**
- Saga 构建
- 顺序执行
- 补偿机制
- 依赖处理
- 超时处理

**关键测试用例:**
```javascript
// 测试 Saga 构建
const saga = new SagaBuilder()
  .id('test-saga')
  .step('step1', action1, compensate1)
  .step('step2', action2, compensate2)
  .build();

// 测试成功执行
const executor = new SagaExecutor(saga);
const result = await executor.execute();
assert.strictEqual(result.status, 'succeeded');

// 测试失败补偿
const failingSaga = new SagaBuilder()
  .step('step1', successAction, compensate1)
  .step('step2', failAction, compensate2)
  .build();

const result2 = await new SagaExecutor(failingSaga).execute();
assert.strictEqual(result2.status, 'compensated');
```

### 3. 被动 MCP 检测测试 (passive-mcp-detection-test.js)

**测试内容:**
- 输出内容分析
- "Running..." 状态检测
- 置信度计算
- 误报处理

**关键测试用例:**
```javascript
// 测试 Running 状态检测
const output = 'Processing...\n⎿  Running… (5s)';
const detection = await HealthCheck.passiveHealthCheck('test-agent');
assert.strictEqual(detection.hasRunningState, true);

// 测试置信度计算
const confidence = calculateConfidence(45000);  // 45s
assert.ok(confidence >= 50 && confidence <= 100);
```

### 4. 场景测试 (scenario-test.js)

**测试内容:**
- 完整任务流程
- 多 Agent 协作
- 异常恢复
- 资源管理

**测试场景:**
```javascript
// 场景 1: 简单任务
scenario('Simple Task Flow', async () => {
  const team = await createTeam('simple-task');
  await assignTask(team, 'Implement login');
  await waitForCompletion(team, 60000);
  assert.ok(await verifyResult(team));
});

// 场景 2: MCP 卡住恢复
scenario('MCP Stuck Recovery', async () => {
  const team = await createTeam('mcp-test');
  await simulateMCPStuck(team);
  await waitForHealthCheck(team);
  const state = await getTeamState(team);
  assert.ok(state.anomalies.length > 0);
});
```

---

## 添加新测试

### 步骤 1: 创建测试文件

```bash
# 创建新的测试文件
touch tests/my-feature.test.js
```

### 步骤 2: 编写测试代码

```javascript
// tests/my-feature.test.js
const assert = require('assert');
const MyFeature = require('../hooks/my-feature');

// 测试工具函数
function test(name, fn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
    process.exitCode = 1;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    console.error(`  ${error.message}`);
    process.exitCode = 1;
  }
}

// 测试套件
console.log('\n=== MyFeature Tests ===\n');

// 测试用例 1
test('feature: should do something', () => {
  const result = MyFeature.doSomething();
  assert.strictEqual(result, expectedValue);
});

// 异步测试用例
testAsync('feature: should handle async', async () => {
  const result = await MyFeature.doAsync();
  assert.ok(result.success);
});

console.log('\n=== Tests Complete ===\n');
```

### 步骤 3: 添加到测试套件

```bash
# 在 package.json 中添加 (如果存在)
{
  "scripts": {
    "test": "node tests/health-check.test.js && node tests/my-feature.test.js"
  }
}
```

### 步骤 4: 运行测试

```bash
node tests/my-feature.test.js
```

---

## 测试最佳实践

### 1. 测试命名

```javascript
// 好的命名
test('registerMember: should add member to state', () => {});
test('sendMessage: should update status to SENT', () => {});
test('checkMCPTimeouts: should detect stuck calls after threshold', () => {});

// 避免的命名
test('test 1', () => {});
test('it works', () => {});
```

### 2. 测试独立性

```javascript
// 好的做法: 每个测试独立
beforeEach(() => {
  // 重置状态
  HealthCheck.resetState();
});

// 避免: 测试间依赖
test('step 1', () => { /* 修改全局状态 */ });
test('step 2', () => { /* 依赖 step 1 的状态 */ });  // 不好!
```

### 3. 使用模拟

```javascript
// 模拟文件系统
const fs = require('fs');
const originalReadFile = fs.readFileSync;

beforeEach(() => {
  fs.readFileSync = (path) => {
    if (path.includes('test')) {
      return JSON.stringify({ test: true });
    }
    return originalReadFile(path);
  };
});

afterEach(() => {
  fs.readFileSync = originalReadFile;
});
```

### 4. 测试覆盖率

```bash
# 使用 nyc 检查覆盖率
npx nyc node tests/health-check.test.js

# 查看覆盖率报告
npx nyc report --reporter=html
```

---

## 测试数据管理

### 测试团队目录

```bash
# 创建测试团队目录
mkdir -p ~/.claude/tasks/test-team

# 创建测试配置文件
cat > ~/.claude/tasks/test-team/team-config.json << 'EOF'
{
  "name": "test-team",
  "createdAt": "2026-02-20T00:00:00.000Z",
  "members": ["coordinator", "test-agent"]
}
EOF
```

### 清理测试数据

```javascript
// 测试后清理
afterAll(() => {
  const testDir = path.join(process.env.HOME, '.claude', 'tasks', 'test-team');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
});
```

---

## 持续集成

### GitHub Actions 配置

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run tests
        run: npm test

      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

---

## 测试检查清单

添加新功能时的测试检查清单:

- [ ] 单元测试覆盖核心逻辑
- [ ] 集成测试覆盖模块交互
- [ ] 边界条件测试
- [ ] 错误处理测试
- [ ] 性能测试 (如适用)
- [ ] 文档更新

---

## 故障排除

### 测试失败排查

```bash
# 启用详细日志
DEBUG=true node tests/health-check.test.js

# 检查测试数据
ls -la ~/.claude/tasks/test-team/

# 查看测试输出
cat ~/.claude/tasks/test-team/test-output.log
```

### 常见错误

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| EACCES | 权限问题 | `chmod 755` |
| ENOENT | 文件不存在 | 创建测试目录 |
| AssertionError | 测试失败 | 检查预期值 |
| Timeout | 异步超时 | 增加超时时间 |

---

## 相关文档

- [健康检查实现](../hooks/health-check.js) - 被测代码
- [Saga 执行器](../hooks/saga-executor.js) - 被测代码
- [架构设计](../references/architecture.md) - 系统架构
- [故障排查](../troubleshooting/) - 问题排查

---

*本文档由 Team Skill 维护，最后更新: 2026-02-20*
