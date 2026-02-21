# 对抗性审查 (Adversarial Review)

## 概述

对抗性审查是一种强制发现问题的验证机制。核心理念：**必须找到问题。零发现 = 停止，重新分析。**

## 核心规则

```yaml
铁律:
  - 零发现问题 = 审查失败
  - 必须找到至少 1 个 HIGH 或 2 个 MEDIUM
  - 找不到问题说明分析不够深入
  - 审查者扮演"魔鬼代言人"角色
```

## 审查维度

### 安全审查

```yaml
检查项:
  - 认证授权漏洞
  - 注入攻击风险 (SQL, XSS, Command)
  - 敏感数据暴露
  - 权限提升风险
  - CSRF 风险
  - 密钥硬编码
  - 不安全的依赖
```

### 性能审查

```yaml
检查项:
  - N+1 查询问题
  - 缺少索引
  - 内存泄漏风险
  - 无限循环风险
  - 大数据量处理
  - 缓存策略缺失
```

### 可靠性审查

```yaml
检查项:
  - 错误处理不完整
  - 边界条件未处理
  - 并发问题
  - 资源未释放
  - 超时处理缺失
  - 重试机制缺失
```

### 可维护性审查

```yaml
检查项:
  - 代码复杂度过高
  - 重复代码
  - 硬编码
  - 缺少注释/文档
  - 测试覆盖不足
  - 依赖关系混乱
```

## 严重度分类

| 级别 | 定义 | 示例 | 处理 |
|------|------|------|------|
| **HIGH** | 安全漏洞、数据丢失风险 | SQL注入、认证绕过 | 必须修复，阻塞发布 |
| **MEDIUM** | 功能缺陷、性能问题 | N+1查询、边界未处理 | 建议修复，可延后 |
| **LOW** | 代码质量、最佳实践 | 命名不规范、缺少注释 | 记录，可选修复 |

## 审查报告格式

```markdown
# 对抗性审查报告

## 审查信息
- 审查范围: {scope}
- 审查者: {reviewer}
- 审查时间: {timestamp}
- 审查耗时: {duration}

## 审查统计
- HIGH: {count}
- MEDIUM: {count}
- LOW: {count}
- 总计: {total}

## HIGH 严重度
| ID | 位置 | 问题 | 影响 | 建议 |
|----|------|------|------|------|
| H-001 | login.ts:47 | No rate limiting | 暴力破解风险 | Add rate limiter |
| H-002 | auth.ts:23 | SQL injection | 数据泄露 | Use parameterized query |

## MEDIUM 严重度
| ID | 位置 | 问题 | 影响 | 建议 |
|----|------|------|------|------|
| M-001 | user.ts:100 | N+1 query | 性能下降 | Use batch query |
| M-002 | api.ts:50 | Missing error handling | 崩溃风险 | Add try-catch |

## LOW 严重度
| ID | 位置 | 问题 | 影响 | 建议 |
|----|------|------|------|------|
| L-001 | utils.ts:15 | Magic number | 可读性差 | Define constant |

## 审查结论
- [ ] 通过：所有 HIGH/MEDIUM 已修复
- [ ] 不通过：存在未修复的 HIGH/MEDIUM
- [ ] 有条件通过：仅 LOW 未修复

## 详细说明

### H-001: No rate limiting
**位置**: `src/api/login.ts:47`
**问题**: 登录接口没有限流机制
**影响**: 攻击者可以无限次尝试登录，存在暴力破解风险
**建议**:
```typescript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // 5 attempts
});

app.post('/login', loginLimiter, loginHandler);
```

## 审查者声明
我已按照对抗性审查标准完成了本次审查，确认：
- [ ] 扮演了"魔鬼代言人"角色
- [ ] 尝试了所有可能的攻击角度
- [ ] 上述发现是真实有效的
```

## 审查流程

```yaml
Step 1: 准备
  - 确定审查范围
  - 收集相关文档
  - 了解业务背景

Step 2: 安全审查
  - 从攻击者角度思考
  - 检查认证授权
  - 检查数据保护

Step 3: 功能审查
  - 边界条件测试
  - 异常路径分析
  - 并发场景

Step 4: 代码审查
  - 复杂度分析
  - 模式检查
  - 最佳实践

Step 5: 总结
  - 分类整理发现
  - 评估严重度
  - 提出建议
```

## 审查者心态

```yaml
好的审查者:
  - 假设代码有 bug
  - 尝试破坏系统
  - 思考攻击者会怎么做
  - 质疑所有假设
  - 关注边界和异常

不好的审查者:
  - 假设代码正确
  - 只看正常路径
  - 害怕提出问题
  - 轻易放过疑点
```

## 集成到验证流程

对抗性审查在 Phase 5.5 验证阶段执行，仅在**完整模式**下强制执行。

```yaml
快速模式: 跳过对抗性审查
标准模式: 可选对抗性审查
完整模式: 强制对抗性审查，零发现 = 不通过
```

## 相关参考

- **Phase 5.5 验证**: [phases/phase-05.5-verification.md](../phases/phase-05.5-verification.md)
- **安全检查清单**: [rules/common/security.md](../rules/common/security.md)
- **铁律**: [references/iron-laws.md](iron-laws.md)
