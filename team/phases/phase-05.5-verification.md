# Phase 5.5: 7阶段增强验证

## 目标

在用户验收前，进行技术质量门禁检查。

## STATE VARIABLES

| 变量名 | 描述 | 来源 |
|--------|------|------|
| `{execution_results}` | 执行结果 | Phase 5 |
| `{verification_report}` | 验证报告 | 本 Phase |
| `{overall_confidence}` | 总体置信度 | 本 Phase |
| `{adversarial_review}` | 对抗性审查结果 | 本 Phase |

## 触发条件

- Phase 5 团队执行完成后
- Phase 6 用户验收前

## 执行者

自动触发

## 验证阶段

| Stage | 检查内容 | 判定标准 | 权重 |
|-------|----------|----------|------|
| Build Check | 项目能否成功构建 | exitCode === 0 | 0.10 |
| Type Check | 类型安全检查 | errors === 0 | 0.10 |
| Lint Check | 代码风格检查 | warnings <= 5 | 0.05 |
| Test Suite | 测试通过率和覆盖率 | failed === 0 && coverage >= 80% | 0.25 |
| Security Scan | 敏感信息泄露和调试代码 | secrets === 0 | 0.15 |
| Functional Verification | 对照需求指纹验证功能 | 核心功能100%实现 | 0.25 |
| User Acceptance Preview | 生成用户可理解的验收清单 | 完成度 >= 80% | 0.10 |

## 验证模式

| 模式 | 执行阶段 | 严格程度 |
|------|----------|----------|
| 快速 | [Build, Tests] | 宽松 |
| 标准 | [Build, Types, Tests, Security] | 标准 |
| 严格 | [全部 7 阶段 + 对抗性审查] | 严格 |

## 执行步骤

### Step 1: Build Check

```bash
npm run build  # 或项目对应命令
# 检查 exitCode === 0
```

### Step 2: Type Check

```bash
npm run type-check  # TypeScript 项目
# 检查 errors === 0
```

### Step 3: Lint Check

```bash
npm run lint
# 检查 warnings <= 5
```

### Step 4: Test Suite

```bash
npm test -- --coverage
# 检查:
# - failed === 0
# - coverage >= 80%
```

### Step 5: Security Scan

```yaml
检查项:
  - hardcoded_secrets: 密钥、token 硬编码
  - sql_injection: SQL 注入风险
  - xss_risks: XSS 风险
  - debug_code: 调试代码残留
  - sensitive_logs: 敏感信息日志
```

### Step 6: Functional Verification

对照需求指纹验证核心功能：

```markdown
## 功能验证清单

| 需求项 | 实现状态 | 验证方式 |
|--------|----------|----------|
| 用户登录 | ✅ 实现 | 手动测试 + 单元测试 |
| 密码加密 | ✅ 实现 | 代码审查 |
| ... | ... | ... |
```

### Step 7: User Acceptance Preview

生成用户可理解的验收清单：

```markdown
## 用户验收预览

### 完成的功能
- [x] 用户可以输入账号密码登录
- [x] 登录错误时显示友好提示
- [x] 登录后正确跳转

### 待确认项
- [ ] 登录后是否记住密码？
- [ ] 是否需要第三方登录？
```

### Step 8: 对抗性审查 (完整模式)

**核心规则：必须找到问题。零发现 = 停止，重新分析。**

```markdown
## 对抗性审查报告

### HIGH 严重度
| ID | 位置 | 问题 | 建议 |
|----|------|------|------|
| H-001 | login.ts:47 | No rate limiting | Add rate limiter |

### MEDIUM 严重度
| ID | 位置 | 问题 | 建议 |
|----|------|------|------|
| M-001 | auth.ts:23 | Weak password policy | Add complexity rules |

### LOW 严重度
| ID | 位置 | 问题 | 建议 |
|----|------|------|------|

### 审查结论
- [ ] 通过：所有 HIGH/MEDIUM 已修复
- [ ] 不通过：存在未修复的 HIGH/MEDIUM
```

## 置信度计算

```javascript
function calculateOverallConfidence(stages) {
  const weights = {
    build: 0.10,
    type: 0.10,
    lint: 0.05,
    test: 0.25,
    security: 0.15,
    functional: 0.25,
    preview: 0.10
  };

  // 关键阶段一票否决
  if (stages.functional < 0.5) return Math.min(confidence, 0.4);
  if (stages.security < 1.0) return Math.min(confidence, 0.3);

  return weighted_average(stages, weights);
}
```

## 输出格式

```text
╔══════════════════════════════════════╗
║       ENHANCED VERIFICATION v5.0     ║
╠══════════════════════════════════════╣
║ Build:      ✅ PASS                   ║
║ Types:      ✅ PASS                   ║
║ Lint:       ⚠️ WARN (3 warnings)     ║
║ Tests:      ✅ PASS (85% coverage)    ║
║ Security:   ✅ PASS                   ║
║ Functional: ✅ PASS (90% 完成度)      ║
║ Preview:    ✅ READY FOR USER         ║
╠══════════════════════════════════════╣
║ Confidence: 0.92                      ║
║ Status:     ✅ READY FOR ACCEPTANCE   ║
╚══════════════════════════════════════╝
```

## NEXT STEP

完成本 Phase 后，加载: `phases/phase-06-acceptance.md`

## 相关参考

- **增强验证**: [references/enhanced-verification.md](../references/enhanced-verification.md)
- **对抗性审查**: [references/adversarial-review.md](../references/adversarial-review.md)
- **需求指纹**: [references/specification-lock.md](../references/specification-lock.md)
