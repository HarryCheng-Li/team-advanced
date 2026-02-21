# Verification Loop

## 概述

在 Phase 4 团队执行完成后，Phase 5 用户验收之前，加入技术验证环节。

```
Phase 1: Requirements → Phase 2: Design → Phase 3: Planning → Phase 4: Execution
                                                                         ↓
                                                              Phase 4.5: VERIFICATION
                                                                         ↓
                                                            Phase 5: User Acceptance
```

---

## 6 阶段验证

### Stage 1: Build Check

验证项目能够成功构建。

```bash
# Node.js/TypeScript
npm run build

# Python
python -m build

# Go
go build ./...

# Rust
cargo build --release
```

**判定标准**
- `exitCode === 0` → ✅ PASS
- `exitCode !== 0` → ❌ FAIL

---

### Stage 2: Type Check

验证类型安全，无类型错误。

```bash
# TypeScript
npx tsc --noEmit

# Python (with pyright)
pyright .

# Go (built-in)
go vet ./...
```

**判定标准**
- `errors === 0` → ✅ PASS
- `errors <= 3` → ⚠️ WARN (需审查)
- `errors > 3` → ❌ FAIL

---

### Stage 3: Lint Check

验证代码风格和潜在问题。

```bash
# Node.js
npm run lint

# Python
ruff check .
# or
flake8 .

# Go
golangci-lint run
```

**判定标准**
- `errors === 0` → ✅ PASS
- `warnings <= 5` → ⚠️ WARN (可接受)
- `else` → ❌ FAIL

---

### Stage 4: Test Suite

验证测试通过率和覆盖率。

```bash
# Node.js
npm test -- --coverage

# Python
pytest --cov=. --cov-report=term-missing

# Go
go test -cover ./...
```

**判定标准**
- `failed === 0 && coverage >= 80%` → ✅ PASS
- `failed <= 1` → ⚠️ WARN (需审查失败原因)
- `else` → ❌ FAIL

---

### Stage 5: Security Scan

验证无敏感信息泄露和调试代码残留。

```bash
# 检测密钥泄露
grep -rn "sk-" --include="*.ts" .
grep -rn "sk-" --include="*.py" .
grep -rn "api_key" --include="*.ts" .
grep -rn "password" --include="*.ts" .

# 检测调试代码
grep -rn "console.log" src/
grep -rn "debugger" --include="*.ts" .
grep -rn "TODO.*fix.*me" --include="*.ts" .

# 检测 .env 文件
ls -la | grep "\.env"
git status --ignored | grep "\.env"
```

**判定标准**
- `secrets === 0 && consoleLogs === 0` → ✅ PASS
- `else` → ❌ FAIL (必须修复，不可放行)

---

### Stage 6: Diff Review

审查所有变更文件的合理性。

```bash
# 变更统计
git diff --stat

# 详细变更
git diff

# 检查要点
# 1. 每个变更文件是否与任务相关
# 2. 是否有意外的文件被修改
# 3. 变更行数是否合理
# 4. 是否包含注释和文档更新
```

**判定标准**
- 所有变更与任务相关 → ✅ PASS
- 存在无关变更 → ⚠️ WARN (需说明原因)
- 变更可疑 → ❌ FAIL

---

## 输出格式

```text
╔══════════════════════════════════════╗
║         VERIFICATION REPORT          ║
╠══════════════════════════════════════╣
║ Build:     ✅ PASS                    ║
║ Types:     ✅ PASS                    ║
║ Lint:      ⚠️ WARN (3 warnings)      ║
║ Tests:     ✅ PASS (85% coverage)     ║
║ Security:  ✅ PASS                    ║
║ Diff:      3 files changed, +127 -45 ║
╠══════════════════════════════════════╣
║ Overall:   ✅ READY FOR PR            ║
╚══════════════════════════════════════╝

Details:
├── Build: Success in 2.3s
├── Types: No errors found
├── Lint:
│   └── src/utils/helper.ts:45:7 - Unused variable 'temp'
├── Tests: 42 passed, 0 failed in 5.1s
├── Security: No secrets or console.log found
└── Diff:
    ├── src/api/user.ts      (+67, -12)
    ├── src/components/User.tsx (+55, -28)
    └── tests/user.test.ts   (+5, -5)
```

---

## 验证模式

### Quick Mode

快速验证，适用于小型改动。

```yaml
stages:
  - Build Check
  - Test Suite
```

### Standard Mode

标准验证，适用于常规功能开发。

```yaml
stages:
  - Build Check
  - Type Check
  - Test Suite
  - Security Scan
```

### Strict Mode

严格验证，适用于关键功能或生产发布。

```yaml
stages:
  - Build Check
  - Type Check
  - Lint Check
  - Test Suite
  - Security Scan
  - Diff Review
```

---

## 集成到 Team

### Phase 4.5: Verification

```
┌─────────────────────────────────────────────────────────────┐
│                    TEAM EXECUTION                            │
├─────────────────────────────────────────────────────────────┤
│  Phase 4: Execution                                         │
│    ├── agent-1: Implementation ✅                           │
│    ├── agent-2: Review ✅                                    │
│    └── agent-3: Test ✅                                      │
├─────────────────────────────────────────────────────────────┤
│  Phase 4.5: VERIFICATION (Automatic)                         │
│    ├── Stage 1: Build Check                                 │
│    ├── Stage 2: Type Check                                  │
│    ├── Stage 3: Lint Check                                  │
│    ├── Stage 4: Test Suite                                  │
│    ├── Stage 5: Security Scan                               │
│    └── Stage 6: Diff Review                                 │
├─────────────────────────────────────────────────────────────┤
│  Result: ✅ PASS → Proceed to Phase 5                       │
│          ❌ FAIL → Return to Phase 4 with feedback           │
└─────────────────────────────────────────────────────────────┘
```

### 自动触发条件

- Phase 4 所有 agent 完成
- 至少有一个文件被修改
- `git status --porcelain` 非空

### 失败处理流程

```
Verification FAIL
    ↓
Team Lead 分析失败原因
    ↓
  ├─→ Build/Type/Lint/Test FAIL → 返回对应 Agent 修复
  ├─→ Security FAIL → 必须修复，不放行
  └─→ Diff Review WARN → 记录原因，可放行
    ↓
重新运行 Verification (仅失败的 Stage)
    ↓
最多重试 3 次
```

---

## 状态图标

- ✅ PASS - 通过
- ⚠️ WARN - 警告，可接受但需注意
- ❌ FAIL - 失败，必须修复
- 🔍 SKIP - 跳过（配置不适用）
- 🔄 RUNNING - 运行中

---

## 配置文件

可在项目根目录添加 `.verification.yml` 自定义验证规则：

```yaml
# .verification.yml
mode: standard

stages:
  build:
    command: npm run build
    timeout: 60000

  types:
    command: npx tsc --noEmit
    timeout: 30000
    maxErrors: 3

  lint:
    command: npm run lint
    timeout: 30000
    maxWarnings: 5

  tests:
    command: npm test -- --coverage
    timeout: 120000
    minCoverage: 80
    maxFailed: 1

  security:
    secrets:
      - pattern: "sk-"
        type: "error"
      - pattern: "api_key"
        type: "warning"
    consoleLogs: error

  diff:
    maxFilesChanged: 10
    requireDocumentation: true
```

---

## Agent 职责

### verification-designer

设计验证循环流程和标准。

### verification-executor

执行验证检查，生成报告。

### verification-reporter

向 Team Lead 和用户报告验证结果。

---

## 示例

### 成功案例

```text
╔══════════════════════════════════════╗
║         VERIFICATION REPORT          ║
╠══════════════════════════════════════╣
║ Build:     ✅ PASS                    ║
║ Types:     ✅ PASS                    ║
║ Lint:      ✅ PASS                    ║
║ Tests:     ✅ PASS (92% coverage)     ║
║ Security:  ✅ PASS                    ║
║ Diff:      5 files changed, +234 -87 ║
╠══════════════════════════════════════╣
║ Overall:   ✅ READY FOR PR            ║
╚══════════════════════════════════════╝
```

### 警告案例

```text
╔══════════════════════════════════════╗
║         VERIFICATION REPORT          ║
╠══════════════════════════════════════╣
║ Build:     ✅ PASS                    ║
║ Types:     ⚠️ WARN (2 errors)         ║
║ Lint:      ✅ PASS                    ║
║ Tests:     ✅ PASS (78% coverage)     ║
║ Security:  ✅ PASS                    ║
║ Diff:      3 files changed, +56 -12   ║
╠══════════════════════════════════════╣
║ Overall:   ⚠️ READY WITH CAUTION      ║
╚══════════════════════════════════════╝

Details:
└── Types:
    └── src/types/user.ts:12:5 - Type 'string' is not assignable to type 'number'
    └── src/types/user.ts:15:5 - Property 'id' is missing
```

### 失败案例

```text
╔══════════════════════════════════════╗
║         VERIFICATION REPORT          ║
╠══════════════════════════════════════╣
║ Build:     ✅ PASS                    ║
║ Types:     ❌ FAIL (8 errors)         ║
║ Lint:      ✅ PASS                    ║
║ Tests:     ❌ FAIL (3 failed)         ║
║ Security:  ✅ PASS                    ║
║ Diff:      7 files changed, +189 -94 ║
╠══════════════════════════════════════╣
║ Overall:   ❌ NOT READY               ║
╚══════════════════════════════════════╝

Action: Return to Phase 4 for fixes
```
