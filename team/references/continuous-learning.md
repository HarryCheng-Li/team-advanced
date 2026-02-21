# 持续学习机制 (Continuous Learning)

## 概述

本文档定义了 Team Agent 系统的持续学习机制，使团队能够从任务执行中积累经验、避免重复错误，并持续改进工作质量。

---

## v1: 基础版（Stop Hook）

### 触发时机
- Team 任务完成时
- 任何 Agent 遇到错误并解决后
- 用户对 Agent 输出进行修正后

### 提取内容
| 类型 | 说明 | 示例 |
|------|------|------|
| 错误解决方案 | 记录遇到的错误及其解决方法 | `npm install` 权限错误的解决方案 |
| 用户修正 | 记录用户对 Agent 输出的修正 | 用户偏好使用 pnpm 而非 npm |
| 最佳实践 | 任务执行中发现的优秀实践 | 项目特定的代码风格约定 |

### 存储格式
```markdown
## 学习记录

### 错误: [错误标题]
- **日期**: 2026-02-18
- **上下文**: 触发错误的具体场景
- **解决方案**: 详细的解决步骤
- **相关文件**: 涉及的文件路径

### 用户偏好: [偏好标题]
- **日期**: 2026-02-18
- **内容**: 用户的偏好或修正内容
- **适用范围**: 项目全局 / 特定文件类型
```

### 存储位置
- `/home/harry/.claude/projects/-home-harry-cc-p/memory/learning.md`

---

## v2: 进阶版（Instincts 系统）

### 1. Instinct 格式

```yaml
id: instinct-20260218-001
type: debugging | coding-style | testing | git | workflow
trigger: "触发条件描述"
solution: "解决方案或建议"
confidence: 0.7
created: "2026-02-18"
lastUsed: "2026-02-18"
useCount: 3
context:
  project: "项目标识"
  files: ["相关文件路径"]
```

### 2. 置信度规则

| 置信度范围 | 含义 | 行为建议 |
|-----------|------|---------|
| 0.3 - 0.4 | 首次发现，无验证 | 作为建议提示用户，需确认 |
| 0.5 - 0.6 | 验证过 1-2 次 | 可以应用，但需说明依据 |
| 0.7 - 0.8 | 验证过 3+ 次 | 直接应用，记录日志 |
| 0.9 | 从未失败 | 直接应用，无需提示 |

### 3. 置信度更新

**增加置信度**
- 解决方案成功应用: `+0.1`
- 多次独立验证成功: `+0.2`
- 用户明确确认: `+0.3`

**降低置信度**
- 解决方案失败: `-0.2`
- 与用户修正矛盾: `-0.3`
- 长期未使用(30天): `* 0.9`
- 新版本环境失效: `-0.4`

### 4. 使用方式

**Phase 0 查询阶段**
```
1. 解析当前任务上下文
2. 查询匹配的 instincts (按 type 和 trigger)
3. 过滤高置信度 (>=0.7) 的 instincts
4. 在任务开始前提示用户命中情况
```

**命中提示格式**
```
[Instinct 命中] type: {type}, confidence: {confidence}
触发条件: {trigger}
建议: {solution}
应用? [Y/n]
```

### 5. Instinct 分类

| 类型 | 触发示例 | 解决方案示例 |
|------|---------|-------------|
| `debugging` | npm install 权限错误 | 使用 `sudo` 或修复 npm 配置 |
| `coding-style` | 创建新组件文件 | 使用项目特定的 import 顺序 |
| `testing` | 编写测试 | 使用 vitest 而非 jest |
| `git` | 提交代码 | 禁用 `--no-verify` 标志 |
| `workflow` | 处理 merge conflict | 先阅读冲突内容，不要直接 discard |

### 6. 存储结构

```
/home/harry/.claude/
├── instincts/
│   ├── debugging.yaml
│   ├── coding-style.yaml
│   ├── testing.yaml
│   ├── git.yaml
│   └── workflow.yaml
└── instincts-index.yaml  # 全局索引
```

### 7. 索引格式

```yaml
version: "2.0"
instincts:
  - id: instinct-20260218-001
    type: debugging
    file: debugging.yaml
    confidence: 0.7
    keywords: ["npm", "permission", "install"]
stats:
  totalInstincts: 42
  highConfidence: 28
  lastUpdated: "2026-02-18"
```

---

## 实施路线图

### 阶段 1: v1 基础版
- [ ] 实现 Stop Hook 机制
- [ ] 创建基础学习记录格式
- [ ] 实现 memory 目录自动写入

### 阶段 2: v2 进阶版
- [ ] 设计 Instinct YAML schema
- [ ] 实现 Phase 0 查询逻辑
- [ ] 实现置信度追踪系统

### 阶段 3: 优化版
- [ ] 实现 Instinct 自动衰减
- [ ] 跨项目 Instinct 共享
- [ ] Instinct 冲突解决机制

---

## 注意事项

1. **隐私保护**: Instinct 不应记录敏感信息（密码、token 等）
2. **项目隔离**: 不同项目的 Instinct 应该隔离，除非明确标记为通用
3. **用户控制**: 用户应能查看、编辑、删除任何 Instinct
4. **版本兼容**: 环境变更时需要重新验证 Instinct 有效性
