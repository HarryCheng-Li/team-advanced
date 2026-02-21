# Team Skill 铁律 (The Iron Laws)

> 版本: 1.0.0 | 更新时间: 2026-02-20
> 来源: Superpowers + Team Skill 扩展

---

## 概述

铁律是不可违反的核心规则，任何情况下都必须遵守。违反铁律 = 系统性失败风险。

```
┌─────────────────────────────────────────────────────┐
│              Iron Laws 核心理念                      │
├─────────────────────────────────────────────────────┤
│  建议可以被忽略                                      │
│  铁律必须被遵守                                      │
│                                                     │
│  违反铁律 = 系统拒绝执行                             │
└─────────────────────────────────────────────────────┘
```

---

## IL-001: 无测试不写码

```yaml
规则: NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
英文: No production code without a failing test first

适用:
  - 所有生产代码
  - 新功能实现
  - Bug 修复后的回归测试

例外:
  - 纯配置文件 (config.json, .env)
  - 文档文件 (README.md, docs/)
  - 注释和类型定义

检查点: Phase 5.5 Test Suite 阶段
违反处理: 代码审查拒绝合并
置信度要求: 100%

实施:
  1. 先写测试 (RED)
  2. 写最少代码使测试通过 (GREEN)
  3. 重构代码 (REFACTOR)
```

---

## IL-002: 无根因不修复

```yaml
规则: NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
英文: No fixes without root cause investigation first

适用:
  - 所有 Bug 修复
  - 性能问题解决
  - 错误处理改进

禁止:
  - "试试看"式随机修复
  - 不理解问题就改代码
  - 只治症状不治根因

方法: Systematic Debugging 4 阶段
  Phase 1: 根因调查 (读错误、复现、收集证据)
  Phase 2: 模式分析 (找工作示例、对比差异)
  Phase 3: 假设测试 (形成假设、最小测试)
  Phase 4: 实现 (创建测试、修复、验证)

检查点: fix-implementer 任务开始前
违反处理: supervisor 发送警告
置信度要求: 80%

实施:
  1. 记录错误到 findings.md
  2. 使用 systematic-debugging.md 流程
  3. 确认根因后再修复
```

---

## IL-003: 无证据不完成

```yaml
规则: NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
英文: No completion claims without fresh verification evidence

适用:
  - 所有任务完成声明
  - 功能交付
  - Bug 修复完成

证据类型:
  - 测试通过截图/日志
  - 构建成功输出
  - 功能演示结果
  - 用户确认消息

要求:
  - 证据必须是在提交前新生成的
  - 证据必须可追溯
  - 证据必须与任务相关

检查点: Phase 6 用户验收
违反处理: 返回 Phase 5.5 重新验证
置信度要求: 90%

实施:
  1. 执行完整验证流程
  2. 收集所有验证结果
  3. 生成验证报告
  4. 附在任务完成声明后
```

---

## IL-004: 无确认不偏离

```yaml
规则: NO DEVIATION WITHOUT EXPLICIT USER APPROVAL
英文: No deviation without explicit user approval

适用:
  - 需求修改
  - 架构变更
  - 技术选型变化
  - 功能增减

禁止:
  - AI 自行修改需求
  - 未通知用户的技术方案变更
  - "我觉得用户可能需要"的功能添加

流程:
  1. 识别偏离 (需求锁定机制)
  2. 通过 product-owner 向用户确认
  3. 获得明确批准
  4. 更新需求文档

检查点: 需求锁定机制监控
违反处理: 触发需求偏离警报
置信度要求: 100%

实施:
  1. 使用需求锁定机制 (Capture → Confirm → Guard)
  2. 任何修改触发警报
  3. 必须获得用户明确确认
```

---

## IL-005: 无记录不决策

```yaml
规则: NO DECISIONS WITHOUT DOCUMENTATION
英文: No decisions without documentation

适用:
  - 架构决策
  - 技术选型
  - 重要设计选择
  - 放弃某方案的决策

记录位置:
  - decisions.md (ADR 格式)
  - findings.md (技术发现)
  - task_plan.md (决策日志)

记录内容:
  - 决策内容
  - 决策理由
  - 替代方案
  - 后果评估

检查点: Phase 4 架构决策后
违反处理: 提示补充记录，阻塞后续流程
置信度要求: 70%

实施:
  1. 做出决策
  2. 记录到 decisions.md
  3. 更新 task_plan.md
  4. 继续执行
```

---

## 铁律检查表

| 铁律 | ID | 检查时机 | 检查方式 | 严重程度 |
|------|-----|----------|----------|----------|
| 无测试不写码 | IL-001 | 代码提交前 | 测试覆盖率报告 | Critical |
| 无根因不修复 | IL-002 | 修复任务开始前 | 根因分析文档 | High |
| 无证据不完成 | IL-003 | 任务完成时 | 验证截图/日志 | Critical |
| 无确认不偏离 | IL-004 | 需求变更时 | 用户确认消息 | Critical |
| 无记录不决策 | IL-005 | 决策完成后 | findings.md 记录 | Medium |

---

## 铁律与其他系统关系

```
┌─────────────────────────────────────────────────────┐
│                   系统层次关系                        │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Layer 1: Iron Laws (铁律层)                        │
│           ↓ 绝对不可违反                            │
│                                                     │
│  Layer 2: 3-Strike Protocol (协议层)                │
│           ↓ 必须按照流程执行                        │
│                                                     │
│  Layer 3: Anti-Patterns (模式层)                    │
│           ↓ 检测常见错误                            │
│                                                     │
│  Layer 4: Best Practices (最佳实践层)               │
│           建议遵循                                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 违反铁律的处理流程

```
检测到铁律违反
    │
    ▼
┌─────────────────┐
│ 判断严重程度    │
└────────┬────────┘
         │
   ┌─────┼─────┐
   ▼     ▼     ▼
Critical High  Medium
   │     │     │
   ▼     ▼     ▼
┌───┐ ┌───┐ ┌───┐
│阻塞│ │警告│ │提示│
│流程│ │记录│ │建议│
└───┘ └───┘ └───┘
   │     │     │
   ▼     ▼     ▼
上报    继续   继续
用户    执行   执行
```

---

## 参考资源

- [Superpowers GitHub](https://github.com/obra/superpowers) - 原始 Iron Laws 概念
- [references/anti-patterns.md](anti-patterns.md) - 反模式预防
- [references/systematic-debugging.md](systematic-debugging.md) - 系统化调试
