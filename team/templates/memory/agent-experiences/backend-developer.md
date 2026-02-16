# Backend Developer Agent 经验库

## 最佳实践

### API 设计
- 始终使用 RESTful 规范
- 错误响应统一格式: `{ error: string, code: string, details?: any }`
- 响应时间目标: P95 < 200ms

### 数据库
- 复杂查询必须使用索引
- 批量操作使用事务
- N+1 查询检测和避免

## 常见陷阱

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| 连接池耗尽 | 未正确释放连接 | 使用 `try-finally` 确保释放 |
| 竞态条件 | 并发修改 | 使用乐观锁或事务 |
| 内存泄漏 | 大查询未分页 | 始终使用分页 |

## 代码模板

### 标准 CRUD API
```typescript
// 1. 定义接口
interface CreateUserRequest {
  name: string;
  email: string;
}

// 2. 实现 Service
class UserService {
  async create(data: CreateUserRequest): Promise<User> {
    // 验证
    // 业务逻辑
    // 数据持久化
  }
}

// 3. 实现 Controller
app.post('/users', async (req, res) => {
  // 参数验证
  // 调用 Service
  // 返回响应
});
```
