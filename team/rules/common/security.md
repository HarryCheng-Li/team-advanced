# 安全检查规则

## 敏感信息处理

### 禁止硬编码
```typescript
// Bad: 硬编码敏感信息
const password = 'my-secret-password';
const apiKey = 'sk-1234567890abcdef';
const dbUrl = 'postgres://user:password@localhost/db';

// Good: 使用环境变量
const password = process.env.DB_PASSWORD;
const apiKey = process.env.API_KEY;
const dbUrl = process.env.DATABASE_URL;
```

### 环境变量管理
```bash
# .env.example (提交到版本控制)
DATABASE_URL=postgresql://user:password@localhost:5432/db
API_KEY=your-api-key
JWT_SECRET=your-jwt-secret

# .env (不提交，添加到 .gitignore)
DATABASE_URL=postgresql://admin:real-password@localhost:5432/production
API_KEY=sk-real-key-12345
JWT_SECRET=super-secret-key
```

### 日志脱敏
```typescript
// Bad: 记录敏感信息
console.log('User login:', { email, password });
logger.info('Payment processed', { cardNumber, cvv });

// Good: 脱敏处理
console.log('User login:', { email });
logger.info('Payment processed', {
  cardNumber: maskCardNumber(cardNumber),
  // cvv 完全不记录
});

function maskCardNumber(card: string): string {
  return card.slice(-4).padStart(card.length, '*');
}
```

### 敏感数据响应
```typescript
// Bad: 返回完整用户信息
res.json(user);

// Good: 过滤敏感字段
const { password, salt, ...safeUser } = user;
res.json(safeUser);

// 或使用 DTO
class UserResponseDTO {
  id: string;
  name: string;
  email: string;
  // 不包含 password 等敏感字段
}
```

## 输入验证

### 原则
- **永远不信任用户输入**
- 验证所有外部数据（表单、API、URL 参数）
- 使用白名单验证，而非黑名单

### 验证规则
```typescript
import { z } from 'zod';

// 使用 schema 验证
const UserSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  age: z.number().int().min(0).max(150),
  phone: z.string().regex(/^\+?[\d\s-]+$/).optional(),
});

// 验证函数
function validateUser(data: unknown) {
  return UserSchema.safeParse(data);
}

// 使用
const result = validateUser(req.body);
if (!result.success) {
  return res.status(400).json({ errors: result.error.errors });
}
```

### 常见验证
```typescript
// 邮箱验证
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 手机号验证（中国）
const phoneRegex = /^1[3-9]\d{9}$/;

// URL 验证
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// SQL 注入检测（基础）
function hasSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b)/i,
    /(--|\/\*|\*\/)/,
    /(\bOR\b|\bAND\b).*?=/i,
  ];
  return sqlPatterns.some(pattern => pattern.test(input));
}
```

### 文件上传验证
```typescript
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function validateFile(file: Express.Multer.File): boolean {
  // 检查文件类型
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return false;
  }

  // 检查文件大小
  if (file.size > MAX_FILE_SIZE) {
    return false;
  }

  // 检查文件扩展名（双重验证）
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedExts = ['.jpg', '.jpeg', '.png', '.pdf'];
  if (!allowedExts.includes(ext)) {
    return false;
  }

  return true;
}
```

## SQL 注入防护

### 使用参数化查询
```typescript
// Bad: 字符串拼接
const query = `SELECT * FROM users WHERE id = ${userId}`;

// Good: 参数化查询
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);

// Good: 使用 ORM
await User.findOne({ where: { id: userId } });
```

### 使用 ORM/Query Builder
```typescript
// Prisma
const user = await prisma.user.findFirst({
  where: { email: userEmail },
});

// TypeORM
const user = await userRepository.findOne({
  where: { email: Equal(userEmail) },
});

// Knex
const user = await knex('users')
  .where('email', userEmail)
  .first();
```

### 存储过程
```typescript
// 调用存储过程
const result = await db.query('CALL GetUserById(?)', [userId]);
```

## XSS 防护

### 输出编码
```typescript
import escapeHtml from 'escape-html';

// HTML 编码
function sanitizeHtml(input: string): string {
  return escapeHtml(input);
}

// 使用
const safeContent = sanitizeHtml(userInput);
```

### CSP (Content Security Policy)
```typescript
// Express 中间件
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://trusted.cdn.com; style-src 'self' 'unsafe-inline'"
  );
  next();
});
```

### 前端防护
```typescript
// React 自动转义
<div>{userInput}</div>

// 危险：避免使用
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// 如果必须使用，先净化
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

### HTTP 头设置
```typescript
// 推荐的安全头
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
```

## CSRF 防护

### Token 验证
```typescript
import csrf from 'csurf';

const csrfProtection = csrf({ cookie: true });

// 应用到路由
app.get('/form', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.post('/submit', csrfProtection, (req, res) => {
  // 自动验证 CSRF token
});
```

### SameSite Cookie
```typescript
// 设置 Cookie
res.cookie('session', sessionToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict', // 或 'lax'
});
```

## 权限检查

### 认证中间件
```typescript
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### 授权中间件
```typescript
function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// 使用
app.delete('/admin/users/:id',
  requireAuth,
  requireRole('admin'),
  deleteUser
);
```

### 资源级别权限
```typescript
async function canAccessResource(userId: string, resourceId: string): Promise<boolean> {
  const resource = await Resource.findById(resourceId);
  return resource.ownerId === userId || userIsAdmin(userId);
}

app.get('/resources/:id', requireAuth, async (req, res) => {
  const hasAccess = await canAccessResource(req.user.id, req.params.id);

  if (!hasAccess) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // 继续处理
});
```

## 安全检查清单

### 代码审查时检查
- [ ] 无硬编码敏感信息
- [ ] 所有输入都经过验证
- [ ] 使用参数化查询
- [ ] 输出经过编码
- [ ] 权限检查到位
- [ ] 错误信息不泄露敏感信息
- [ ] 依赖包无已知漏洞

### 部署前检查
- [ ] 环境变量配置正确
- [ ] HTTPS 已启用
- [ ] 安全头已设置
- [ ] Cookie 设置安全
- [ ] 日志无敏感信息
- [ ] 依赖已更新到安全版本

### 定期审计
- [ ] 运行依赖扫描 (`npm audit`)
- [ ] 检查权限配置
- [ ] 审查访问日志
- [ ] 更新安全策略
