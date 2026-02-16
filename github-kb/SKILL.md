---
name: github-kb
version: 1.2.0
description: "Local GitHub repository knowledge base manager. Triggers: /github-kb command, or user mentions repo/github/仓库 for finding, cloning, or querying external repositories."
maturity: stable
keywords: [github, repository, knowledge-base, clone, search]
category: development
author: harry
created: 2025-01-01
updated: 2026-02-16
dependencies:
  skills: []
  mcp_servers: [mcp__zread__search_doc, mcp__zread__read_file]
  tools: [Read, Bash, Glob, Grep]
---

# GitHub Knowledge Base

本地 GitHub 仓库知识库，管理克隆的仓库并提供查询分析能力。

## 触发边界

**触发**: `/github-kb` 命令、下载/查找/分析外部仓库、查询 Issue/PR
**不触发**: 当前项目的 git 操作

## 核心流程

```
查询: 本地搜索 → [找到] 分析 | [未找到] 在线(gh|curl) → 询问下载
下载: clone → 摘要 → 记录 → 验证
工具: 有 gh → gh search | 无 gh → curl API
```

## 命令

```
/github-kb init [path]       # 初始化知识库
/github-kb add <repo>        # 添加仓库记录
/github-kb list              # 列出所有仓库
/github-kb find <query>      # 搜索仓库
/github-kb clone <url>       # 克隆并添加
/github-kb help              # 帮助
```

## 知识库配置

**位置**: `~/github` (可在 `~/github/CLAUDE.md` 修改)

**首次使用**: 检查目录是否存在，不存在则询问创建位置。

## 脚本调用

```bash
python ~/.claude/skills/github-kb/scripts/manage_kb.py <cmd> ~/github [options]
```

| 命令 | 说明 |
|------|------|
| `find --query "xxx"` | 搜索本地仓库 |
| `add --name "x" --summary "y"` | 添加记录 |
| `list` | 列出所有 |

## 自由度规范

| 类型 | 场景 | 要求 |
|------|------|------|
| **高自由** | 仓库分析、摘要生成 | 根据上下文灵活处理 |
| **低自由** | 知识库更新、路径格式 | 必须严格调用脚本 |

## 验证检查点

```bash
# 克隆后验证
[ -d ~/github/<repo>/.git ] && echo "✓" || echo "✗"

# 记录后验证
python manage_kb.py find ~/github --query "<repo>" | grep -q '"found": true'
```

## 输出规范

```
📦 <name>
📍 <path>
📝 <summary>
```

搜索结果:
```
🔍 "<query>": <n> 个匹配
1. <name> - <summary>
```

## 错误处理

| 场景 | 处理 |
|------|------|
| 目录不存在 | 询问: 创建默认 / 指定路径 / 跳过 |
| 仓库已存在 | 询问: 使用现有 / 重新克隆 / git pull |
| 克隆失败 | 检查网络/权限，建议使用 SSH |

## 工具选择

| 场景 | 工具 |
|------|------|
| 本地仓库分析 | git + Read |
| 在线文档搜索 | `mcp__zread__search_doc` |
| 远程文件查看 | `mcp__zread__read_file` |
| Issue/PR 查询 | gh / curl API |

---

## 与 Team Skill 集成 ⭐ 2026 新增

### 调用场景

当 Team Skill 的 tech-scout 在 Phase 0（技术尽调）或 Phase 2（深度搜索）时，会调用 github-kb：

1. **find** - 搜索本地知识库，查找参考项目
2. **clone** - 克隆参考项目到本地
3. **analyze** - 分析项目结构和技术栈

### 调用方式

```bash
# Team Skill 调用示例
/github-kb find "user authentication"
/github-kb clone https://github.com/xxx/auth-example
```

### JSON 输出格式（供 Team Skill 解析）

当被 Team Skill 调用时，输出结构化 JSON：

```json
{
  "found": true,
  "repo": "react-auth-example",
  "path": "~/github/react-auth-example",
  "summary": "基于 JWT 的 React 登录示例",
  "tech_stack": ["React", "JWT", "Express", "PostgreSQL"],
  "relevance": "high",
  "key_features": [
    "JWT token 认证",
    "Refresh token 机制",
    "受保护路由"
  ]
}
```

### 尽调报告集成

Team Skill 的尽调报告会优先展示本地知识库发现：

```markdown
## 📦 本地知识库发现（优先展示）
| 仓库名 | 技术栈 | 相关度 | 路径 |
|--------|--------|--------|------|
| react-auth-example | React + JWT | ⭐⭐⭐ | ~/github/react-auth-example |

## 🌐 在线资源发现
| 方案名称 | 类型 | 成熟度 | ... |
```

### 集成工作流

```
Team Skill Phase 0/2
        │
        ↓
┌───────────────────┐
│   tech-scout      │
│   需要技术调研     │
└─────────┬─────────┘
          │
          ↓
┌───────────────────┐     未找到      ┌───────────────────┐
│  github-kb find   │ ──────────────→ │   WebSearch       │
│  搜索本地知识库    │                 │   联网搜索        │
└─────────┬─────────┘                 └───────────────────┘
          │ 找到
          ↓
┌───────────────────┐
│  repo-analyst     │
│  分析本地项目      │
│  提取最佳实践      │
└───────────────────┘
```

## 详细参考

- [工作流与 Checklist](references/workflows.md)
- [gh 命令速查](references/gh-commands.md)
- [GitHub API 参考](references/api-reference.md)
- [知识库模板](templates/CLAUDE.md.tmpl)
