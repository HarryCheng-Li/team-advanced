# Team Advanced

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub release](https://img.shields.io/github/v/release/HarryCheng-Li/team-advanced?include_prereleases)](https://github.com/HarryCheng-Li/team-advanced/releases)
[![GitHub stars](https://img.shields.io/github/stars/HarryCheng-Li/team-advanced?style=social)](https://github.com/HarryCheng-Li/team-advanced/stargazers)

> Agent Team 自动化编排技能集 - Claude Code Skills Collection

## 概述

本项目包含一套用于 Claude Code 的 Skills，专注于多 Agent 自动化编排和需求发现。

## 包含的 Skills

### 🚀 Team Skill v2.0.0

Agent Team 自动化编排核心技能，支持：
- **7 个 Phase 工作流**: 技术尽调 → 需求澄清 → 深度搜索 → 架构决策 → 团队执行 → 用户验收 → 交付
- **3 种模式**: 快速模式 (~30分钟) / 标准模式 (2-4小时) / 完整模式 (1-3天)
- **17 个预定义角色**: 用户服务层 + 技术尽调层 + 技术执行层
- **4 种拓扑模式**: 星型 / 网状 / 流水线 / 竞技场

### 🎯 Interview Skills v2.0.0

深度需求发现技能，支持：
- **用户类型检测**: 自动识别技术用户 / 非技术用户
- **盲点模块**: 非技术用户 11 个必问问题
- **智能终止判断**: 自动判断何时可以结束访谈
- **问题优先级分类**: P0 必问 / P1 应问 / P2 可问
- **快速模式**: 最多 3 轮简化访谈

### 📦 GitHub KB v1.2.0

本地 GitHub 仓库知识库管理，支持：
- 本地仓库搜索和管理
- 与 Team Skill 深度集成
- 优先展示本地参考项目

## 目录结构

```
teamgit/
├── team/                          # Team Skill
│   ├── SKILL.md                   # 主文件
│   ├── METADATA.json              # 元数据
│   ├── references/                # 参考文档
│   │   ├── roles.md               # 角色定义
│   │   ├── architecture-selector.md
│   │   ├── collaboration-rules.md
│   │   ├── execution-workflow.md
│   │   ├── memory-system.md
│   │   ├── topology-patterns.md
│   │   ├── reflection-framework.md
│   │   └── reliability-framework.md
│   ├── templates/memory/          # 记忆模板
│   └── tests/                     # 测试用例
│
├── interview-skills/              # Interview Skills
│   ├── SKILL.md
│   ├── METADATA.json
│   └── tests/
│
├── github-kb/                     # GitHub KB
│   ├── SKILL.md
│   ├── METADATA.json
│   ├── references/
│   ├── scripts/
│   └── templates/
│
└── registry/                      # Skill Registry
    ├── index.json                 # 索引
    └── dependencies.json          # 依赖关系
```

## 依赖关系

```
Team Skill v2.0.0
    ├── interview-skills v2.0.0
    └── github-kb v1.2.0
```

## 快速使用

### 功能开发
```
/team 我想做一个用户登录功能
```

### 问题排查
```
/team 网站打开很慢，帮我看看
```

### 快速模式
```
/team --quick 帮我加一个按钮
```

### 完整模式
```
/team --full 我想做一个在线商城
```

## 核心设计原则

1. **用户优先** - 确保产出符合用户真实需求
2. **技术尽调先行** - 联网搜索现有方案，避免重复造轮
3. **需求澄清** - 动手前确保理解正确
4. **模式适配** - 根据任务复杂度自动选择模式
5. **用户验收** - 完成后从用户角度验收
6. **通俗沟通** - 用用户能理解的语言沟通

## 安装

将 Skills 复制到 Claude Code 配置目录：

```bash
# 克隆仓库
git clone https://github.com/HarryCheng-Li/team-advanced.git

# 复制 Skills 到 Claude 配置目录
cp -r team-advanced/team ~/.claude/skills/
cp -r team-advanced/interview-skills ~/.claude/skills/
cp -r team-advanced/github-kb ~/.claude/skills/
```

## 版本历史

详见 [CHANGELOG.md](./CHANGELOG.md)

## 贡献

欢迎提交 Issue 和 Pull Request！

## 作者

Harry Cheng

## 许可证

[MIT License](./LICENSE)
