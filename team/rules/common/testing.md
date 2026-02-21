# 测试要求

## 测试覆盖率

### 基本要求
- **总体覆盖率 >= 80%**
- **核心模块覆盖率 >= 90%**
- **新增代码覆盖率 >= 80%**

### 覆盖率指标
| 指标 | 说明 | 最低要求 |
|------|------|----------|
| Line Coverage | 语句覆盖 | 80% |
| Branch Coverage | 分支覆盖 | 75% |
| Function Coverage | 函数覆盖 | 85% |

### 排除项
以下代码不计入覆盖率：
- 类型定义文件（`.d.ts`）
- 配置文件
- 第三方库封装
- UI 组件（视觉测试另计）

## 单元测试规范

### 测试文件组织
```
src/
├── utils/
│   ├── calculator.ts
│   └── __tests__/
│       └── calculator.test.ts
```

### 测试命名约定
```typescript
// 文件命名: <filename>.test.ts 或 <filename>.spec.ts

// 测试描述使用中文或英文保持一致
describe('Calculator', () => {
  describe('add', () => {
    it('should return sum of two numbers', () => {
      // ...
    });

    it('应该返回两个数字的和', () => {
      // ...
    });
  });
});
```

### 测试结构 (AAA 模式)
```typescript
it('should calculate total price with discount', () => {
  // Arrange (准备)
  const items = [
    { price: 100, quantity: 2 },
    { price: 50, quantity: 1 },
  ];
  const discount = 0.1;

  // Act (执行)
  const result = calculateTotal(items, discount);

  // Assert (断言)
  expect(result).toBe(230);
});
```

### 边界测试要求
每个函数必须测试：
- 正常输入
- 边界值（0, -1, MAX, MIN）
- 空值（null, undefined, ''）
- 非法输入

```typescript
describe('divide', () => {
  it('should return correct result for normal input', () => {
    expect(divide(10, 2)).toBe(5);
  });

  it('should throw error when dividing by zero', () => {
    expect(() => divide(10, 0)).toThrow('Division by zero');
  });

  it('should handle negative numbers', () => {
    expect(divide(-10, 2)).toBe(-5);
  });

  it('should return 0 when numerator is 0', () => {
    expect(divide(0, 5)).toBe(0);
  });
});
```

### Mock 使用规范
```typescript
// 函数 Mock
jest.mock('../api');
const mockFetch = jest.fn();
jest.spyOn(api, 'fetch').mockImplementation(mockFetch);

// 时间 Mock
jest.useFakeTimers();
jest.advanceTimersByTime(1000);

// 恢复
afterEach(() => {
  jest.clearAllMocks();
  jest.useRealTimers();
});
```

## 集成测试规范

### 测试范围
- API 端点测试
- 数据库交互测试
- 外部服务集成测试
- 组件集成测试

### 测试环境
```typescript
// 使用独立的测试数据库
const testConfig = {
  database: 'test_db',
  host: 'localhost',
  port: 5432,
};

// 测试前后清理
beforeAll(async () => {
  await setupTestDatabase();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
});
```

### API 测试示例
```typescript
describe('POST /api/users', () => {
  it('should create a new user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'Test User', email: 'test@example.com' })
      .expect(201);

    expect(response.body).toMatchObject({
      id: expect.any(String),
      name: 'Test User',
      email: 'test@example.com',
    });
  });

  it('should return 400 for invalid email', async () => {
    await request(app)
      .post('/api/users')
      .send({ name: 'Test', email: 'invalid-email' })
      .expect(400);
  });
});
```

### 外部服务 Mock
```typescript
// 使用 nock mock HTTP 请求
import nock from 'nock';

beforeEach(() => {
  nock('https://api.external.com')
    .get('/users/1')
    .reply(200, { id: 1, name: 'Mock User' });
});

afterEach(() => {
  nock.cleanAll();
});
```

## 测试命名约定

### 描述格式
```typescript
// 使用 should/should not 或 给定条件/期望结果
it('should return user profile when user exists', () => {});
it('should not create duplicate users', () => {});
it('given valid credentials, returns auth token', () => {});

// 或使用中文
it('当用户存在时，应返回用户资料', () => {});
it('不应创建重复用户', () => {});
```

### 测试分组
```typescript
describe('UserService', () => {
  describe('createUser', () => {
    describe('when input is valid', () => {
      it('should create user successfully', () => {});
    });

    describe('when email is invalid', () => {
      it('should throw ValidationError', () => {});
    });
  });
});
```

## 测试执行

### 运行命令
```bash
# 运行所有测试
npm test

# 运行特定文件
npm test -- calculator.test.ts

# 监听模式
npm test -- --watch

# 生成覆盖率报告
npm test -- --coverage

# 更新快照
npm test -- -u
```

### CI/CD 集成
```yaml
# .github/workflows/test.yml
- name: Run tests
  run: npm test -- --coverage --ci

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./coverage/lcov.info
```

## 测试最佳实践

### 原则
1. **FAST**: 测试要快速执行
2. **ISOLATED**: 测试之间相互独立
3. **REPEATABLE**: 重复执行结果一致
4. **SELF-VALIDATING**: 自动验证通过/失败
5. **TIMELY**: 及时编写测试

### 避免
- 测试私有方法（应该测试公共接口）
- 测试实现细节（应该测试行为）
- 过度 Mock（影响测试价值）
- 依赖执行顺序
- 使用 `setTimeout` 等待异步（使用 `async/await`）

### 快照测试
```typescript
// 适用场景：UI 组件、复杂对象结构
it('should render correctly', () => {
  const { container } = render(<Button>Click me</Button>);
  expect(container).toMatchSnapshot();
});

// 定期审查快照更新
// git diff __snapshots__/
```
