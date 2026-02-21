# Anti-Patterns 反模式预防

> 版本: 1.0.0 | 更新时间: 2026-02-20
> 来源: Superpowers + Planning with Files + Team Skill

---

## 概述

反模式是 Multi-Agent 系统中常见的错误模式。识别并预防这些模式可以大幅提高系统可靠性。

```
┌─────────────────────────────────────────────────────┐
│           Anti-Patterns 核心理念                     │
├─────────────────────────────────────────────────────┤
│  识别 → 预防 → 修正                                 │
│                                                     │
│  知道什么是错的，比知道什么是对的更重要              │
└─────────────────────────────────────────────────────┘
```

---

## 1. 沟通反模式

### AP-001: 鸡同鸭讲

```yaml
ID: AP-001
类别: 沟通
问题: 不同角色对同一术语有不同理解

示例:
  - "优化性能" - 前端理解为加载速度，后端理解为 QPS
  - "重构" - 有人理解为小改动，有人理解为重写
  - "安全" - 有人想到加密，有人想到权限

后果: 无效沟通，产出不符合预期

预防措施:
  - 使用通信协议标准格式
  - 关键术语明确定义在 findings.md
  - 定期同步理解
  - 使用 ADR 记录术语定义

检测方式: 消息中出现歧义词汇时提示确认
检测者: coordinator
```

### AP-002: 信息隐瞒

```yaml
ID: AP-002
类别: 沟通
问题: 发现问题但不敢或不愿报告

示例:
  - Executor 发现需求不合理但不说
  - 发现潜在风险但认为"可能不重要"
  - 知道更好的方案但不提出来

后果: 问题积累到无法修复

预防措施:
  - 鼓励 raise_issue 消息
  - 建立无责备文化
  - supervisor 主动询问
  - 奖励发现问题的人

检测方式: 长时间无 raise_issue 消息
检测者: supervisor
```

### AP-003: 过度广播

```yaml
ID: AP-003
类别: 沟通
问题: 所有消息都发送给所有人

示例:
  - 每个进度更新都 broadcast
  - 技术讨论发给所有角色
  - 一个人的问题变成所有人的通知

后果: 信息过载，重要消息被淹没

预防措施:
  - 按 relevance 定向发送
  - broadcast 仅用于关键事件
  - 使用 status_update 替代频繁 broadcast
  - 消息分类：urgent/normal/info

检测方式: broadcast 频率超过阈值
检测者: supervisor
```

---

## 2. 执行反模式

### AP-004: 重复失败动作

```yaml
ID: AP-004
类别: 执行
问题: 相同错误重复尝试相同方法

示例:
  - npm install 失败后再次 npm install
  - 同样的代码改动试了 3 次
  - 同一个 API 调用失败后不改参数再试

后果: 浪费时间，不解决问题

预防措施:
  - 严格执行 3-Strike 协议
  - 每次失败记录到 findings.md
  - supervisor 监控重复模式
  - 强制更换方法

检测方式: 相同操作连续 3 次
检测者: supervisor
关联: IL-002 无根因不修复
```

### AP-005: 偏离需求

```yaml
ID: AP-005
类别: 执行
问题: 自行修改用户需求

示例:
  - 用户要登录按钮，AI 加了注册功能
  - 用户要简化 UI，AI 重写了整个前端
  - "我觉得用户可能需要这个功能"

后果: 产出不符合用户预期

预防措施:
  - 严格执行需求锁定机制
  - product-owner 持续监督
  - 定期向用户确认
  - 任何修改触发警报

检测方式: 需求偏离检测
检测者: product-owner
关联: IL-004 无确认不偏离
```

### AP-006: 跳过验证

```yaml
ID: AP-006
类别: 执行
问题: 声称完成但未实际验证

示例:
  - "功能已完成" 但没有测试
  - "Bug 已修复" 但没有验证
  - "代码已写好" 但没有构建

后果: 隐藏 bug，后期修复成本高

预防措施:
  - 严格执行 7 阶段验证
  - 强制输出验证报告
  - 无证据不放行

检测方式: 任务完成但无验证报告
检测者: qa-verifier
关联: IL-003 无证据不完成
```

---

## 3. 角色反模式

### AP-007: 角色越界

```yaml
ID: AP-007
类别: 角色
问题: 角色执行超出权限的操作

示例:
  - Executor 直接修改需求
  - product-owner 直接写代码
  - supervisor 执行具体任务

后果: 决策混乱，责任不清

预防措施:
  - 严格执行角色权限矩阵
  - supervisor 监控越界行为
  - 越界操作触发警告
  - 定期审查角色行为

检测方式: 越权操作日志检测
检测者: supervisor
```

### AP-008: 单点依赖

```yaml
ID: AP-008
类别: 角色
问题: 关键角色无备份

示例:
  - 只有 1 个 backend-developer
  - 整个团队依赖一个人的知识
  - 关键决策只由一人做出

后果: 该成员卡住 = 整个任务卡住

预防措施:
  - 重要角色冗余配置
  - 完整模式使用 6+ 角色
  - 技能交叉培训
  - 知识共享到 findings.md

检测方式: 单一角色承担多个关键任务
检测者: coordinator
```

### AP-009: 孤岛工作

```yaml
ID: AP-009
类别: 角色
问题: 成员不共享信息和进度

示例:
  - 两个 Executor 做了重复工作
  - 一个人的发现其他人不知道
  - 团队成员不知道彼此在做什么

后果: 效率低下，冲突风险

预防措施:
  - 定期 progress_report
  - 共享 findings.md
  - coordinator 主动协调
  - 使用通信协议同步

检测方式: 成员间长时间无消息
检测者: coordinator
```

---

## 反模式检测表

| 反模式 | ID | 检测方式 | 检测者 | 严重程度 | 关联铁律 |
|--------|-----|----------|--------|----------|----------|
| 鸡同鸭讲 | AP-001 | 歧义词汇检测 | coordinator | Medium | - |
| 信息隐瞒 | AP-002 | 长时间无 raise_issue | supervisor | High | - |
| 过度广播 | AP-003 | broadcast 频率 | supervisor | Low | - |
| 重复失败动作 | AP-004 | 相同操作 3 次 | supervisor | Critical | IL-002 |
| 偏离需求 | AP-005 | 需求偏离检测 | product-owner | Critical | IL-004 |
| 跳过验证 | AP-006 | 无验证报告 | qa-verifier | Critical | IL-003 |
| 角色越界 | AP-007 | 越权操作日志 | supervisor | High | - |
| 单点依赖 | AP-008 | 单一角色多任务 | coordinator | Medium | - |
| 孤岛工作 | AP-009 | 成员间无消息 | coordinator | Medium | - |

---

## 检测流程

```
角色执行操作
    │
    ▼
┌─────────────────┐
│ 操作日志记录    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 反模式模式匹配  │
└────────┬────────┘
         │
    ┌────┼────┐
    ▼    ▼    ▼
  无匹配 匹配  匹配
        Low   High/Critical
    │    │         │
    ▼    ▼         ▼
  继续  提示    发送警告
        建议    阻塞流程
```

---

## 警告消息格式

```yaml
# 检测到反模式时发送的消息
type: alert
priority: warning | critical
content:
  anti_pattern_id: AP-004
  detected_at: "2026-02-20T10:30:00Z"
  executor: executor-1
  description: "检测到重复失败动作: npm install 已连续失败 3 次"
  recommendation: "建议: 检查网络连接，尝试使用 --registry 参数，或使用 yarn"
  iron_law_violated: "IL-002"
  action_required: "更换修复方法或上报 supervisor"
```

---

## 与其他系统关系

| 系统 | 关系 |
|------|------|
| Iron Laws | 反模式可能导致铁律违反 |
| 3-Strike | AP-004 的处理机制 |
| 需求锁定 | AP-005 的预防机制 |
| 7阶段验证 | AP-006 的预防机制 |
| 角色权限矩阵 | AP-007 的预防机制 |

---

## 参考资源

- [references/iron-laws.md](iron-laws.md) - 铁律定义
- [references/communication-protocol.md](communication-protocol.md) - 通信协议
- [references/role-permission-matrix.md](role-permission-matrix.md) - 角色权限
