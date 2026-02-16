# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
