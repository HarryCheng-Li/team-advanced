# Team Skill 知识地图

> 版本: 6.0.0 | 更新时间: 2026-02-20
>
> 本文档是 Team Skill 的中央导航系统，帮助你快速找到所需信息。

---

## 如何使用本文档

1. **新用户**: 从 [快速开始](#快速开始) 开始
2. **查找特定功能**: 使用 [Ctrl+F] 搜索关键词
3. **故障排查**: 直接跳转到 [故障排查](#故障排查) 章节
4. **深入了解**: 查看 [深度使用](#深度使用) 各章节

---

## 快速开始（新用户必读）

| 步骤 | 文档 | 说明 |
|------|------|------|
| 1 | [SKILL.md](SKILL.md#快速启动) | 5分钟了解 Team Skill |
| 2 | [核心概念](personas/coordinator.md) | 理解三角色架构 |
| 3 | [第一个团队任务](examples/first-team-task.md) | 手把手实战教程 |

### 常用命令速查

```bash
# 创建团队执行任务
/team 我想做一个用户登录功能

# 快速模式（简单任务）
/team --quick 帮我加一个按钮

# Party Mode（多 Agent 讨论）
/team --party "Monolith 还是 Microservices?"
```

---

## 深度使用

### 角色定制

| 主题 | 文档 | 适用场景 |
|------|------|----------|
| 角色系统 | [references/roles.md](references/roles.md) | 了解所有 15+ 个预定义角色 |
| Persona 定制 | [customization/customize-schema.yaml](customization/customize-schema.yaml) | 自定义 Agent 人格和行为 |
| Coordinator 指南 | [personas/coordinator.md](personas/coordinator.md) | 协调者角色详解 |
| Supervisor 指南 | [personas/supervisor.md](personas/supervisor.md) | 监督者角色详解 |

### 流程扩展

| 主题 | 文档 | 适用场景 |
|------|------|----------|
| Phase 系统 | [phases/](phases/) | 8 阶段执行流程详解 |
| Saga 模式 | [references/saga-pattern.md](references/saga-pattern.md) | 分布式事务管理 |
| Party Mode | [party-mode/party-mode.md](party-mode/party-mode.md) | 多 Agent 讨论模式 |

### 可靠性保障

| 主题 | 文档 | 适用场景 |
|------|------|----------|
| 健康检查 | [hooks/health-check.js](hooks/health-check.js) | 每 30 秒自动监控团队健康 |
| 资源监控 | [references/resource-monitoring.md](references/resource-monitoring.md) | Token/MCP 使用监控和成本估算 |
| Iron Laws | [references/iron-laws.md](references/iron-laws.md) | 不可违反的核心规则 |

---

## 故障排查

### 按问题类型查找

| 问题类型 | 文档 | 常见症状 |
|----------|------|----------|
| 健康检查问题 | [troubleshooting/health-check-issues.md](troubleshooting/health-check-issues.md) | Agent 无响应、状态异常 |
| 消息确认问题 | [troubleshooting/message-issues.md](troubleshooting/message-issues.md) | 消息未送达、确认失败 |
| 性能问题 | [troubleshooting/performance.md](troubleshooting/performance.md) | 运行缓慢、Token 消耗过快 |

### 快速诊断

```bash
# 检查团队健康状态
node ~/.claude/skills/team/hooks/health-check.js --team <team_name>

# 查看资源使用报告
cat ~/.claude/tasks/<team_name>/resource-report.json

# 使用文档导航工具
node ~/.claude/skills/team/scripts/doc-navigator.js --topic "health-check"
```

---

## 贡献开发

### 架构与设计

| 主题 | 文档 | 说明 |
|------|------|------|
| 架构设计 | [references/architecture.md](references/architecture.md) | Team Skill 整体架构图和数据流 |
| 代码规范 | [rules/common/coding-style.md](rules/common/coding-style.md) | 开发规范指南 |
| 测试指南 | [tests/README.md](tests/README.md) | 测试架构和添加新测试方法 |

### 参考文档索引

#### v6.0 新增参考

- [Step-File 架构](phases/) - 独立 Phase 文件
- [Persona 系统](personas/) - 角色人格化
- [对抗性审查](references/adversarial-review.md) - 强制找问题
- [Party Mode](party-mode/party-mode.md) - 多 Agent 讨论
- [定制化系统](customization/customize-schema.yaml) - 自定义 Agent 行为
- [规模自适应](references/scale-adaptation.md) - 五级任务系统

#### v5.0 核心参考

- [Iron Laws 铁律](references/iron-laws.md) - 不可违反的规则
- [Anti-Patterns 反模式](references/anti-patterns.md) - 常见错误预防
- [Findings 系统](references/findings-system.md) - 问题记录和追踪
- [Systematic Debugging](references/systematic-debugging.md) - 系统化调试

#### 可靠性参考

- [需求锁定](references/specification-lock.md) - 防止需求漂移
- [增强验证](references/enhanced-verification.md) - 7 阶段验证
- [角色权限](references/role-permission-matrix.md) - 权限控制
- [通信协议](references/communication-protocol.md) - Agent 间通信
- [回滚恢复](references/rollback-recovery.md) - 失败恢复机制
- [非技术用户](references/non-technical-user-mode.md) - 通俗语言模式

#### 持续学习

- [持续学习](references/continuous-learning.md) - 经验积累
- [Instinct 进化](references/instinct-evolution.md) - 历史经验复用
- [组织记忆](references/organizational-memory.md) - 知识管理

#### Hook 系统

- [Hook 配置](hooks/hooks.json) - Hook 注册表
- [健康检查](hooks/health-check.js) - 每 30 秒自动监控
- [资源监控](hooks/resource-monitor.js) - Token/MCP 监控
- [团队创建](hooks/team-created.js) - 自动启动监控
- [团队删除](hooks/team-deleted.js) - 自动停止监控
- [会话开始](hooks/session-start.js) - 会话初始化
- [会话结束](hooks/session-end.js) - 会话清理

#### Rules 系统

- [代码风格](rules/common/coding-style.md) - 编码规范
- [安全检查](rules/common/security.md) - 安全规则
- [Git 工作流](rules/common/git-workflow.md) - 版本控制
- [测试规范](rules/common/testing.md) - 测试要求
- [TypeScript 模式](rules/typescript/patterns.md) - TS 最佳实践
- [TypeScript 工具](rules/typescript/tools.md) - TS 工具使用

---

## 文档统计

| 类别 | 文档数量 | 最后更新 |
|------|----------|----------|
| 核心文档 | 3 | 2026-02-20 |
| 角色 Persona | 11 | 2026-02-20 |
| Phase 文件 | 10 | 2026-02-20 |
| 参考文档 | 27 | 2026-02-20 |
| Rules | 7 | 2026-02-18 |
| Hooks | 10 | 2026-02-20 |
| 故障排查 | 3 | 2026-02-20 |
| 示例 | 1 | 2026-02-20 |
| **总计** | **72** | - |

---

## 学习路径推荐

### 路径 1: 快速上手（1小时）

1. [SKILL.md](SKILL.md) - 阅读快速启动部分
2. [examples/first-team-task.md](examples/first-team-task.md) - 完成实战教程
3. [personas/coordinator.md](personas/coordinator.md) - 理解协调者角色

### 路径 2: 深度掌握（1天）

1. 完成路径 1
2. [references/roles.md](references/roles.md) - 了解所有角色
3. [phases/](phases/) - 理解 8 阶段流程
4. [party-mode/party-mode.md](party-mode/party-mode.md) - 掌握 Party Mode
5. [references/iron-laws.md](references/iron-laws.md) - 理解核心规则

### 路径 3: 专家进阶（1周）

1. 完成路径 2
2. [references/architecture.md](references/architecture.md) - 理解架构设计
3. [hooks/health-check.js](hooks/health-check.js) - 研究健康检查实现
4. [references/saga-pattern.md](references/saga-pattern.md) - 掌握 Saga 模式
5. [customization/customize-schema.yaml](customization/customize-schema.yaml) - 学习定制化

---

## 获取帮助

### 自助排查

1. 使用文档导航工具: `node scripts/doc-navigator.js --topic "关键词"`
2. 查看故障排查文档: [troubleshooting/](troubleshooting/)
3. 检查日志文件: `~/.claude/tasks/<team-name>/`

### 反馈问题

如果发现文档问题或需要新增内容，请：

1. 记录问题描述
2. 提供相关日志
3. 说明期望行为

---

*本文档由 Team Skill 自动生成，最后更新: 2026-02-20*
