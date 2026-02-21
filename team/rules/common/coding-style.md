# 通用代码风格规则

## 命名约定

### 变量命名
- 使用有意义的、描述性的名称
- **camelCase** 用于变量和函数
- **PascalCase** 用于类和类型
- **UPPER_SNAKE_CASE** 用于常量
- 避免单字母变量名（循环变量除外）
- 避免缩写，除非是广泛认知的（如 `id`, `url`, `http`）

```typescript
// Good
const userProfile = getUserProfile();
const MAX_RETRY_COUNT = 3;

// Bad
const d = getData();
const max = 3;
```

### 函数命名
- 使用动词或动词短语
- 明确表达函数的意图
- 布尔返回值以 `is`, `has`, `can`, `should` 开头

```typescript
// Good
function calculateTotalPrice(items: Item[]): number { }
function isValidEmail(email: string): boolean { }
function hasPermission(user: User, action: string): boolean { }

// Bad
function price(items: Item[]): number { }
function email(email: string): boolean { }
```

### 类命名
- 使用名词或名词短语
- 避免泛化名称如 `Manager`, `Helper`, `Util`

```typescript
// Good
class UserProfile { }
class PaymentProcessor { }

// Bad
class Manager { }
class Helper { }
```

## 注释规范

### 原则
- 代码应该自文档化，注释解释"为什么"而非"是什么"
- 保持注释与代码同步更新
- 删除无用的注释代码

### 必须添加注释的场景
- 复杂的业务逻辑
- 非直观的算法实现
- 临时解决方案（TODO/FIXME）
- 公共 API 和接口

```typescript
/**
 * 计算订单折扣价格
 * 规则：满100减10，满200减25，满500减80
 * @param originalPrice 原始价格
 * @returns 折扣后的价格
 */
function calculateDiscount(originalPrice: number): number { }

// TODO: 临时解决方案，等待支付服务升级后移除
// FIXME: 在高并发场景下可能存在问题
```

## 函数长度限制

### 规则
- 单个函数不超过 **50 行**
- 函数体不超过 **3 层**嵌套
- 参数不超过 **4 个**（超过时使用对象参数）

```typescript
// Good: 使用对象参数
interface CreateUserOptions {
  name: string;
  email: string;
  role: string;
  department?: string;
}
function createUser(options: CreateUserOptions): User { }

// Bad: 参数过多
function createUser(name: string, email: string, role: string, department: string): User { }
```

## 单一职责原则 (SRP)

### 规则
- 每个类/模块只负责一件事
- 每个函数只做一件事
- 修改的原因只有一个

```typescript
// Good: 职责分离
class UserValidator {
  validate(user: User): ValidationResult { }
}

class UserRepository {
  save(user: User): void { }
}

// Bad: 职责混乱
class UserService {
  validate(user: User): boolean { }
  save(user: User): void { }
  sendEmail(user: User): void { }
}
```

## DRY 原则 (Don't Repeat Yourself)

### 规则
- 相同逻辑出现 **2 次以上** 时提取为函数
- 使用常量管理重复的配置值
- 利用继承、组合、混入复用代码

```typescript
// Good: 提取公共逻辑
function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency }).format(amount);
}

// Bad: 重复代码
const price1 = `¥${amount1.toFixed(2)}`;
const price2 = `$${amount2.toFixed(2)}`;
const price3 = `€${amount3.toFixed(2)}`;
```

## 代码组织

### 文件结构
1. 导入语句（按类型分组）
2. 常量定义
3. 类型/接口定义
4. 主要类/函数
5. 辅助函数
6. 导出

### 导入顺序
```typescript
// 1. 标准库
import { readFile } from 'fs';

// 2. 第三方库
import express from 'express';

// 3. 内部模块（别名路径）
import { UserService } from '@/services';

// 4. 相对路径
import { helper } from './helper';

// 5. 类型导入
import type { User } from '@/types';
```
