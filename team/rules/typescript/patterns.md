# TypeScript 模式

## 类型定义规范

### 基本类型
```typescript
// Good: 使用明确类型
let name: string = 'John';
let age: number = 30;
let isActive: boolean = true;

// Bad: 使用 any
let data: any = {};
```

### 对象类型
```typescript
// 使用 interface 定义对象结构
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  createdAt: Date;
}

// 只读属性
interface Config {
  readonly apiUrl: string;
  readonly timeout: number;
}

// 可选属性
interface UpdateUserDto {
  name?: string;
  email?: string;
}
```

### 数组类型
```typescript
// 推荐使用 T[] 语法
const numbers: number[] = [1, 2, 3];
const users: User[] = [];

// 复杂类型可使用 Array<T>
const matrix: Array<Array<number>> = [[1, 2], [3, 4]];

// 只读数组
const readonlyNumbers: readonly number[] = [1, 2, 3];
```

### 函数类型
```typescript
// 函数签名
type Callback = (data: string) => void;
type AsyncHandler = (req: Request) => Promise<Response>;

// 函数参数和返回值
function fetchUser(id: string): Promise<User> {
  return api.get(`/users/${id}`);
}

// 函数重载
function format(input: string): string;
function format(input: number): string;
function format(input: string | number): string {
  return String(input);
}
```

### 类型 vs 接口
```typescript
// Interface: 用于对象形状、可扩展
interface User {
  name: string;
}

// 可以声明合并
interface User {
  email: string;
}

// Type: 用于联合、交叉、映射类型
type Status = 'pending' | 'approved' | 'rejected';
type UserWithStatus = User & { status: Status };
type Partial<T> = { [K in keyof T]?: T[K] };
```

## 泛型使用

### 基本泛型
```typescript
// 泛型函数
function identity<T>(arg: T): T {
  return arg;
}

const str = identity<string>('hello');
const num = identity(42); // 类型推断

// 泛型接口
interface Container<T> {
  value: T;
  getValue(): T;
}

// 泛型类
class Box<T> {
  constructor(private value: T) {}

  getValue(): T {
    return this.value;
  }
}
```

### 泛型约束
```typescript
// 约束泛型必须具有某些属性
interface Lengthwise {
  length: number;
}

function getLength<T extends Lengthwise>(arg: T): number {
  return arg.length;
}

// 约束为对象类型
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: 'John', age: 30 };
getProperty(user, 'name'); // OK
// getProperty(user, 'email'); // Error
```

### 常用泛型模式
```typescript
// API 响应类型
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

// 分页响应
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// 使用
const userResponse: ApiResponse<User> = await fetchUser(1);
const usersResponse: PaginatedResponse<User> = await fetchUsers();
```

### 条件类型
```typescript
// NonNullable
type NonNullable<T> = T extends null | undefined ? never : T;

// ReturnType
type ReturnType<T> = T extends (...args: any) => infer R ? R : never;

// 实用示例
type ApiResponse<T> = T extends { error: any }
  ? { success: false; error: T['error'] }
  : { success: true; data: T };
```

## 接口 vs 类型别名

### 使用 Interface 的场景
```typescript
// 1. 对象形状定义
interface User {
  id: string;
  name: string;
}

// 2. 类实现
interface Printable {
  print(): void;
}

class Document implements Printable {
  print() {
    console.log('Printing...');
  }
}

// 3. 需要声明合并
interface Window {
  customProperty: string;
}

// 4. 库的类型扩展
declare module 'express' {
  interface Request {
    user?: User;
  }
}
```

### 使用 Type 的场景
```typescript
// 1. 联合类型
type Status = 'active' | 'inactive' | 'pending';

// 2. 交叉类型
type UserWithTimestamps = User & {
  createdAt: Date;
  updatedAt: Date;
};

// 3. 映射类型
type Readonly<T> = {
  readonly [K in keyof T]: T[K];
};

// 4. 条件类型
type NonNullable<T> = T extends null | undefined ? never : T;

// 5. 元组
type Coordinate = [x: number, y: number];

// 6. 函数类型
type Handler = (event: Event) => void;
```

### 选择指南
| 场景 | 推荐 |
|------|------|
| 对象形状 | `interface` |
| 类实现 | `interface` |
| 联合类型 | `type` |
| 交叉类型 | `type` |
| 映射类型 | `type` |
| 需要扩展 | `interface` |
| 库类型扩展 | `interface` |

## 枚举使用

### 数字枚举
```typescript
enum Direction {
  Up = 1,
  Down,    // 2
  Left,    // 3
  Right,   // 4
}

function move(direction: Direction): void {
  // ...
}

move(Direction.Up);
```

### 字符串枚举
```typescript
enum UserRole {
  Admin = 'ADMIN',
  User = 'USER',
  Guest = 'GUEST',
}

function checkPermission(role: UserRole): boolean {
  return role === UserRole.Admin;
}
```

### 枚举 vs 联合类型
```typescript
// 枚举方式
enum Status {
  Pending = 'PENDING',
  Approved = 'APPROVED',
  Rejected = 'REJECTED',
}

// 联合类型方式（推荐用于纯字符串场景）
type Status = 'PENDING' | 'APPROVED' | 'REJECTED';

// 选择指南：
// - 需要运行时值映射：使用枚举
// - 纯类型约束：使用联合类型
// - 需要反向查找：使用枚举
// - 简单字符串：使用联合类型
```

### 常量枚举
```typescript
// 内联优化，编译后没有枚举对象
const enum Colors {
  Red = '#FF0000',
  Green = '#00FF00',
  Blue = '#0000FF',
}

const color = Colors.Red; // 编译为: const color = "#FF0000";
```

### 枚举最佳实践
```typescript
// Good: 语义清晰
enum HttpStatus {
  OK = 200,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  InternalServerError = 500,
}

// Good: 使用 const enum 优化性能
const enum Priority {
  Low = 0,
  Medium = 1,
  High = 2,
}

// 避免过度使用
// Bad: 简单场景使用联合类型更好
enum SimpleStatus {
  On = 'ON',
  Off = 'OFF',
}
// Better:
type SimpleStatus = 'ON' | 'OFF';
```

## 高级类型模式

### 工具类型使用
```typescript
// Partial - 所有属性可选
type UpdateUser = Partial<User>;

// Required - 所有属性必需
type CompleteUser = Required<User>;

// Pick - 选择部分属性
type UserPreview = Pick<User, 'id' | 'name'>;

// Omit - 排除部分属性
type UserWithoutPassword = Omit<User, 'password'>;

// Record - 记录类型
type UserMap = Record<string, User>;

// ReturnType - 获取返回类型
type FetchUserReturn = ReturnType<typeof fetchUser>;
```

### 模板字面量类型
```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ApiEndpoint = `/api/${string}`;
type HttpRoute = `${HttpMethod} ${ApiEndpoint}`;

const route: HttpRoute = 'GET /api/users';
```

### 类型守卫
```typescript
// typeof 守卫
function process(value: string | number) {
  if (typeof value === 'string') {
    return value.toUpperCase();
  }
  return value.toFixed(2);
}

// instanceof 守卫
class Dog { bark() {} }
class Cat { meow() {} }

function makeSound(animal: Dog | Cat) {
  if (animal instanceof Dog) {
    animal.bark();
  } else {
    animal.meow();
  }
}

// 自定义类型守卫
interface Fish { swim(): void }
interface Bird { fly(): void }

function isFish(pet: Fish | Bird): pet is Fish {
  return (pet as Fish).swim !== undefined;
}

function move(pet: Fish | Bird) {
  if (isFish(pet)) {
    pet.swim();
  } else {
    pet.fly();
  }
}
```
