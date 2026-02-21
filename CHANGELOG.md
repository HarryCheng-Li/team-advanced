# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [6.0.0] - 2026-02-21

### Added - Team Skill v6.0.0
- **Step-File 架构** - 独立的 Phase 文件 (phase-00 到 phase-08)，支持灵活扩展
- **Agent Persona 系统** - 角色人格化，包含 Mary Chen、John Park、Winston Lee 等 14+ 个角色
- **对抗性审查 (Adversarial Review)** - 强制找问题机制，确保代码质量
- **Party Mode** - 多 Agent 讨论模式，支持技术方案辩论
- **定制化系统** - 通过 `.customize.yaml` 自定义团队配置
- **规模自适应** - 五级系统，从个人任务到企业级项目自动适配
- **KNOWLEDGE-MAP.md** - 完整的知识地图
- **上下文系统 (contexts/)** - dev、research、review 三种上下文
- **钩子系统 (hooks/)** - 包含 health-check、saga-executor、resource-monitor 等
- **故障排除 (troubleshooting/)** - 健康检查、消息问题、性能优化指南

### Added - 参考资料 (20+ 新增)
- `architecture.md` - 架构设计指南
- `communication-protocol.md` - 通信协议
- `continuous-learning.md` - 持续学习
- `enhanced-verification.md` - 增强验证
- `findings-system.md` - 发现系统
- `instinct-evolution.md` - 本能进化
- `iron-laws.md` - 铁律
- `iterative-retrieval.md` - 迭代检索
- `non-technical-user-mode.md` - 非技术用户模式
- `organizational-memory.md` - 组织记忆
- `resource-monitoring.md` - 资源监控
- `role-permission-matrix.md` - 角色权限矩阵
- `rollback-recovery.md` - 回滚恢复
- `saga-pattern.md` - Saga 模式
- `scale-adaptation.md` - 规模适应
- `specification-lock.md` - 规范锁定
- `systematic-debugging.md` - 系统调试
- `user-type-detection.md` - 用户类型检测
- `verification-loop.md` - 验证循环
- `anti-patterns.md` - 反模式
- `adversarial-review.md` - 对抗性审查

### Added - 测试
- `health-check-test.js` - 健康检查测试
- `saga-executor-test.js` - Saga 执行器测试
- `scenario-test.js` - 场景测试
- `passive-mcp-detection-test.js` - MCP 检测测试

### Changed
- Phase 工作流从 7 个扩展到 10 个 (新增 Phase 0、Phase 5.5、Phase 8)
- 更新 `SKILL.md` - 完整重写，包含 v6.0 所有功能
- 更新 `METADATA.json` - 版本升级到 v6.0.0
- 更新 `roles.md` - 新增多个角色定义
- 更新 `reliability-framework.md` - 可靠性框架增强

---

## [2.0.0] - 2026-02-16

### Added
- **Team Skill v2.0.0**
  - 新增 `tech-scout` 技术尽调专家角色
  - Phase 合并简化 (10 → 7)
  - 新增快速/标准/完整三种模式
  - 新增 `repo-analyst` 仓库分析角色
  - 新增本地知识库优先搜索（集成 github-kb）

- **Interview Skills v2.0.0**
  - 新增用户类型检测（技术/非技术用户）
  - 新增非技术用户盲点模块（11 个必问问题）
  - 新增智能终止判断
  - 新增问题优先级分类（P0/P1/P2）
  - 新增快速模式（--quick，最多 3 轮）
  - 支持接收尽调报告作为输入（--input）

- **GitHub KB v1.2.0**
  - 新增与 Team Skill 集成
  - 新增结构化 JSON 输出格式
  - 尽调报告优先展示本地知识库发现

- **Skill Registry**
  - 新增标准化 METADATA.json
  - 新增 registry/index.json 索引
  - 新增 registry/dependencies.json 依赖关系图

- **测试框架**
  - 新增 tests/test-cases.md（Team/Interview/PPTX）

### Changed
- Team Skill Phase 流程优化
- Interview 问题顺序改为顺序提问（非并行）
- PPTX Skill 瘦身优化（233 行 → 114 行）

### Dependencies
- Team Skill → interview-skills v2.0.0
- Team Skill → github-kb v1.2.0

---

## [1.0.0] - 2025-01-01

### Added
- Team Skill 初始版本
- Interview Skills 初始版本
- GitHub KB 初始版本
