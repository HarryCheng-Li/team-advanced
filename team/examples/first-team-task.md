# 第一个团队任务：从零开始创建团队

> 本教程将手把手教你如何使用 Team Skill 创建一个团队并完成第一个任务。

---

## 目标

完成本教程后，你将：
- 理解 Team Skill 的基本工作流程
- 学会使用 `/team` 命令创建团队
- 了解不同角色的分工协作
- 掌握监控团队进度的方法

---

## 场景设定

假设你是一个产品经理，想要开发一个简单的用户注册功能：
- 用户可以输入邮箱和密码注册
- 系统需要验证邮箱格式
- 注册成功后发送欢迎邮件

---

## 步骤 1: 启动团队任务

### 输入命令

```bash
/team 我想开发一个用户注册功能，包含邮箱验证和密码强度检查
```

### 预期输出

```
[Coordinator] 收到任务，开始分析需求...

=== 任务分析 ===
类型: 新功能开发
复杂度: 中等（Level 2）
预计团队规模: 6-8 人

=== 执行计划 ===
Phase 1: 技术尽调 - 搜索最佳实践
Phase 2: 需求澄清 - 确认具体需求
Phase 3: 深度搜索 - 技术细节调研
Phase 4: 架构决策 - 确定技术方案
Phase 5: 团队执行 - 多 Agent 协作开发
Phase 5.5: 质量验证 - 7 阶段验证
Phase 6: 用户验收 - 确认符合预期
Phase 7: 交付说明 - 生成使用文档

[Coordinator] 正在创建团队...
```

---

## 步骤 2: 团队创建过程

### 系统自动执行

Coordinator 会自动创建以下角色：

```
[Team Created] 团队成员:

用户服务层:
  product-owner (Mary)     - 需求澄清和验收
  user-translator (Paige)  - 技术翻译
  qa-verifier (Quinn)      - 质量验证

技术执行层:
  architect (Winston)      - 架构设计
  tech-lead (John)         - 技术协调
  database-designer (David) - 数据库设计
  backend-developer (Amelia) - 后端开发
  frontend-developer (Alex)  - 前端开发
  test-engineer (Tessa)    - 测试开发

监督层:
  supervisor               - 健康检查
```

### 截图示例

```
┌─────────────────────────────────────────────────────────────┐
│                    团队创建成功                              │
├─────────────────────────────────────────────────────────────┤
│  团队名称: team-registration-feature                        │
│  团队规模: 10 人                                            │
│  任务类型: 功能开发                                          │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Coordinator │──▶│  Supervisor │──▶│  Health     │         │
│  │   (协调)    │  │  (监督)     │  │  Check      │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Executor Team (8人)                     │   │
│  │  PO  UT  QA  Arch  TL  DB  BE  FE  TE               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 步骤 3: 观察 Phase 执行

### Phase 1: 技术尽调

```
[Coordinator] 启动 Phase 1: 技术尽调

[tech-scout] 正在搜索用户注册功能的最佳实践...
[tech-scout] 发现:
  - 推荐方案: JWT + bcrypt + nodemailer
  - 安全要求: 密码最小8位，包含大小写和数字
  - 邮箱验证: 使用正则表达式 + SMTP 验证

[repo-analyst] 分析参考项目...
[repo-analyst] 提取模式:
  - 使用 Express.js + MongoDB 的示例最多
  - 前端推荐使用 React Hook Form

[Coordinator] Phase 1 完成，进入 Phase 2...
```

### Phase 2: 需求澄清

```
[Coordinator] 启动 Phase 2: 需求澄清

[product-owner] Mary: "让我确认一下需求细节..."

[product-owner] 向用户提问:
  1. 您希望使用什么技术栈？（推荐 Node.js + React）
  2. 密码强度要求是什么级别？
  3. 需要邮箱验证链接还是仅格式验证？
  4. 有现有的用户数据库吗？

用户回复: "用 Node.js + React，密码要中等强度，
          只需要格式验证，没有现有数据库"

[product-owner] 需求已确认并锁定 ✓
[Coordinator] Phase 2 完成，进入 Phase 3...
```

### Phase 4: 架构决策

```
[Coordinator] 启动 Phase 4: 架构决策

[architect] Winston: "基于需求分析，我建议以下架构："

┌─────────────────────────────────────────┐
│           架构方案                        │
├─────────────────────────────────────────┤
│  前端: React + React Hook Form          │
│  后端: Express.js + JWT                 │
│  数据库: MongoDB + Mongoose             │
│  验证: Joi + 正则表达式                  │
│  邮件: Nodemailer (SMTP)                │
└─────────────────────────────────────────┘

[architect] 决策理由:
  - 团队熟悉度高
  - 社区支持好
  - 开发效率高

[Coordinator] 架构已确认 ✓
```

### Phase 5: 团队执行

```
[Coordinator] 启动 Phase 5: 团队执行

[supervisor] 健康检查已启动（每 30 秒）

[database-designer] David: "正在设计用户表结构..."
  ├─ 创建: models/User.js
  ├─ 字段: email, passwordHash, createdAt
  └─ 索引: email (unique)

[backend-developer] Amelia: "正在实现 API..."
  ├─ 创建: routes/auth.js
  ├─ 实现: POST /api/register
  ├─ 实现: 邮箱格式验证
  └─ 实现: 密码强度检查

[frontend-developer] Alex: "正在构建 UI..."
  ├─ 创建: components/RegisterForm.jsx
  ├─ 实现: 表单验证
  └─ 实现: 错误提示

[test-engineer] Tessa: "正在编写测试..."
  ├─ 创建: tests/auth.test.js
  ├─ 覆盖: 正常注册流程
  ├─ 覆盖: 边界条件
  └─ 覆盖率: 92%

[supervisor] 进度报告:
  ├─ database-designer: 100% ✓
  ├─ backend-developer: 85% →
  ├─ frontend-developer: 70% →
  └─ test-engineer: 60% →
```

---

## 步骤 4: 监控团队状态

### 查看健康检查报告

```bash
# 查看团队状态
cat ~/.claude/tasks/team-registration-feature/health-report.json
```

输出示例：
```json
{
  "timestamp": "2026-02-20T10:30:00.000Z",
  "checkCount": 15,
  "teamName": "team-registration-feature",
  "summary": {
    "total": 8,
    "healthy": 7,
    "warning": 1,
    "critical": 0,
    "terminating": 0
  },
  "members": [
    {
      "id": "database-designer",
      "status": "completed",
      "healthStatus": "healthy",
      "progress": 100
    },
    {
      "id": "backend-developer",
      "status": "working",
      "healthStatus": "healthy",
      "progress": 85
    }
  ]
}
```

### 查看资源使用

```bash
# 查看资源报告
cat ~/.claude/tasks/team-registration-feature/resource-report.json
```

输出示例：
```json
{
  "summary": {
    "totalTokens": 45000,
    "totalCost": 2.15,
    "totalMCPCalls": 120,
    "mcpSuccessRate": "98.5%",
    "budgetUsage": "21.5%"
  }
}
```

---

## 步骤 5: 验收和交付

### Phase 6: 用户验收

```
[Coordinator] 启动 Phase 6: 用户验收

[qa-verifier] Quinn: "从用户角度进行验收..."

[qa-verifier] 验收清单:
  ✓ 功能符合用户描述的场景
  ✓ 用户能理解如何使用
  ✓ 有用户友好的错误提示
  ✓ 边界情况已处理

[qa-verifier] 验收结论: 通过 ✓

[user-translator] Paige: "生成用户说明文档..."
```

### Phase 7: 交付说明

```
[Coordinator] 启动 Phase 7: 交付说明

[user-translator] 交付文档:

# 用户注册功能 - 使用说明

## 功能概述
您现在可以使用新的用户注册功能了！

## 如何使用
1. 打开注册页面: /register
2. 输入您的邮箱地址
3. 设置密码（至少8位，包含大小写和数字）
4. 点击"注册"按钮

## 注意事项
- 邮箱格式会自动验证
- 密码强度会实时显示
- 注册成功后会显示欢迎消息

## 技术细节
- 后端: Node.js + Express
- 前端: React
- 数据库: MongoDB
```

---

## 完整代码示例

### 后端代码 (Express.js)

```javascript
// models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', async function(next) {
  if (this.isModified('passwordHash')) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
```

```javascript
// routes/auth.js
const express = require('express');
const Joi = require('joi');
const User = require('../models/User');

const router = express.Router();

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.pattern.base': '密码必须包含大小写字母和数字'
    })
});

router.post('/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { email, password } = value;

    // 检查邮箱是否已存在
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '该邮箱已被注册'
      });
    }

    // 创建用户
    const user = new User({
      email,
      passwordHash: password
    });
    await user.save();

    res.status(201).json({
      success: true,
      message: '注册成功',
      user: {
        id: user._id,
        email: user.email
      }
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误，请稍后重试'
    });
  }
});

module.exports = router;
```

### 前端代码 (React)

```jsx
// components/RegisterForm.jsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';

function RegisterForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (result.success) {
        setMessage('注册成功！欢迎加入我们！');
      } else {
        setMessage(result.message || '注册失败');
      }
    } catch (error) {
      setMessage('网络错误，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-form">
      <h2>用户注册</h2>
      {message && <div className="message">{message}</div>}

      <form onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label>邮箱:</label>
          <input
            {...register('email', {
              required: '请输入邮箱',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: '请输入有效的邮箱地址'
              }
            })}
          />
          {errors.email && <span>{errors.email.message}</span>}
        </div>

        <div>
          <label>密码:</label>
          <input
            type="password"
            {...register('password', {
              required: '请输入密码',
              minLength: {
                value: 8,
                message: '密码至少8位'
              }
            })}
          />
          {errors.password && <span>{errors.password.message}</span>}
        </div>

        <button type="submit" disabled={loading}>
          {loading ? '注册中...' : '注册'}
        </button>
      </form>
    </div>
  );
}

export default RegisterForm;
```

---

## 常见问题

### Q1: 团队创建失败怎么办？

检查以下几点：
1. 确认 Team Skill 已正确安装
2. 检查 `~/.claude/skills/team/` 目录是否存在
3. 查看错误日志：`~/.claude/tasks/team-name/error.log`

### Q2: Agent 无响应怎么办？

```bash
# 检查健康状态
node ~/.claude/skills/team/hooks/health-check.js --team team-name

# 查看消息队列
cat ~/.claude/tasks/team-name/message-queue.json
```

### Q3: 如何调整团队规模？

在创建团队前，可以通过 `--level` 参数指定：
```bash
/team --level 1 简单任务（3-5人）
/team --level 3 复杂任务（8-12人）
```

---

## 下一步

完成本教程后，你可以：

1. [学习 Party Mode](../party-mode/party-mode.md) - 多 Agent 讨论模式
2. [了解 Saga 模式](../references/saga-pattern.md) - 事务管理
3. [查看故障排查](../troubleshooting/health-check-issues.md) - 解决常见问题
4. [阅读 Iron Laws](../references/iron-laws.md) - 核心规则

---

*本教程由 Team Skill 自动生成，最后更新: 2026-02-20*
