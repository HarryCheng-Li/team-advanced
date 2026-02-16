#!/usr/bin/env python3
"""GitHub Knowledge Base Manager

管理本地 GitHub 仓库知识库的脚本。

Usage:
    python manage_kb.py init <kb_path>              # 初始化知识库
    python manage_kb.py add <kb_path> <repo_info>   # 添加仓库记录
    python manage_kb.py list <kb_path>              # 列出所有仓库
    python manage_kb.py find <kb_path> <query>      # 搜索仓库
    python manage_kb.py get-path <kb_path> <repo>   # 获取仓库本地路径
"""

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

CLAUDE_MD_TEMPLATE = """# GitHub Knowledge Base

> 本地 GitHub 仓库知识库
> 位置: {kb_path}

## 配置

- **知识库根目录**: `{kb_path}`
- **创建时间**: {created_at}

## 仓库列表

| 仓库名 | 一句话摘要 | 本地路径 |
|--------|-----------|----------|
{repos}

## 使用说明

- 每个仓库一行记录，格式: `| 仓库名 | 一句话摘要 | 本地路径 |`
- 新增仓库时在此文件末尾添加
- 如仓库被删除，请手动删除对应行
"""

REPO_ENTRY_TEMPLATE = "| {name} | {summary} | {local_path} |"

def init_kb(kb_path: str):
    """初始化知识库目录和 CLAUDE.md"""
    kb_dir = Path(kb_path).expanduser().resolve()

    if not kb_dir.exists():
        print(f"Creating directory: {kb_dir}")
        kb_dir.mkdir(parents=True, exist_ok=True)

    claude_md = kb_dir / "CLAUDE.md"

    if claude_md.exists():
        print(f"CLAUDE.md already exists at: {claude_md}")
        return str(claude_md)

    from datetime import datetime
    content = CLAUDE_MD_TEMPLATE.format(
        kb_path=str(kb_dir),
        created_at=datetime.now().isoformat(),
        repos=""
    )

    claude_md.write_text(content, encoding="utf-8")
    print(f"Created CLAUDE.md at: {claude_md}")
    return str(claude_md)


def parse_claude_md(kb_path: str) -> tuple[list[dict], str, str]:
    """解析 CLAUDE.md 文件，返回 (仓库列表, 头部内容, 尾部内容)"""
    kb_dir = Path(kb_path).expanduser().resolve()
    claude_md = kb_dir / "CLAUDE.md"

    if not claude_md.exists():
        return [], "", ""

    content = claude_md.read_text(encoding="utf-8")
    lines = content.split("\n")

    repos = []
    header_lines = []
    footer_lines = []
    in_repo_section = False
    repo_section_started = False

    for line in lines:
        # 检测仓库列表开始
        if line.startswith("## 仓库列表"):
            in_repo_section = True
            repo_section_started = True
            header_lines.append(line)
            continue

        # 检测表格头部
        if in_repo_section and line.startswith("|") and "---" in line.replace(" ", ""):
            header_lines.append(line)
            continue

        # 检测表格内容行
        if in_repo_section and line.startswith("|") and "仓库名" not in line and "---" not in line:
            parts = [p.strip() for p in line.split("|")[1:-1]]
            if len(parts) >= 2 and parts[0] and not parts[0].startswith("_"):
                repos.append({
                    "name": parts[0],
                    "summary": parts[1] if len(parts) > 1 else "",
                    "local_path": parts[2] if len(parts) > 2 else ""
                })
            # 跳过表格内容行（包括占位符）
            continue

        # 如果已经在仓库部分但遇到非表格行，说明进入尾部
        if in_repo_section and not line.startswith("|") and line.strip():
            in_repo_section = False
            footer_lines.append(line)
        elif in_repo_section:
            header_lines.append(line)
        else:
            if not repo_section_started:
                header_lines.append(line)
            else:
                footer_lines.append(line)

    return repos, "\n".join(header_lines), "\n".join(footer_lines)


def add_repo(kb_path: str, name: str, summary: str, local_path: str = ""):
    """添加仓库记录到 CLAUDE.md"""
    kb_dir = Path(kb_path).expanduser().resolve()
    claude_md = kb_dir / "CLAUDE.md"

    if not claude_md.exists():
        init_kb(kb_path)

    repos, header, footer = parse_claude_md(kb_path)

    # 检查是否已存在
    for repo in repos:
        if repo["name"] == name:
            print(f"Repository {name} already exists, updating...")
            repo["summary"] = summary
            if local_path:
                repo["local_path"] = local_path
            break
    else:
        repos.append({
            "name": name,
            "summary": summary,
            "local_path": local_path or str(kb_dir / name)
        })

    # 重新生成内容
    repo_lines = ["## 仓库列表", "", "| 仓库名 | 一句话摘要 | 本地路径 |", "|--------|-----------|----------|"]
    for repo in repos:
        repo_lines.append(REPO_ENTRY_TEMPLATE.format(**repo))

    # 重新生成完整内容
    lines = header.split("\n")
    new_lines = []
    skip_until_end = False

    for line in lines:
        # 跳过旧的仓库列表部分
        if line.startswith("## 仓库列表"):
            continue
        # 跳过表格分隔线
        if line.strip() == "|--------|-----------|----------|":
            continue
        # 跳过表格行和占位符（包括 _暂无仓库记录_）
        if line.startswith("|") and ("仓库名" in line or "---" in line.replace(" ", "") or line.startswith("| _") or "暂无仓库记录" in line):
            continue
        new_lines.append(line)

    # 找到合适的位置插入新的仓库列表（在"使用说明"之前）
    final_lines = []
    inserted = False
    for line in new_lines:
        if not inserted and line.startswith("## 使用说明"):
            final_lines.extend(repo_lines)
            final_lines.append("")
            inserted = True
        final_lines.append(line)

    if not inserted:
        final_lines.extend(repo_lines)

    new_content = "\n".join(final_lines) + "\n" + footer
    claude_md.write_text(new_content, encoding="utf-8")
    print(f"Added/Updated repository: {name}")


def list_repos(kb_path: str):
    """列出所有仓库"""
    repos, _, _ = parse_claude_md(kb_path)
    if not repos:
        print("No repositories found.")
        return

    print(f"Found {len(repos)} repositories:")
    for repo in repos:
        print(f"  - {repo['name']}: {repo['summary']}")


def find_repo(kb_path: str, query: str):
    """搜索仓库"""
    repos, _, _ = parse_claude_md(kb_path)
    query_lower = query.lower()

    matches = []
    for repo in repos:
        if (query_lower in repo["name"].lower() or
            query_lower in repo["summary"].lower()):
            matches.append(repo)

    if not matches:
        print(json.dumps({"found": False, "matches": []}))
        return

    result = {
        "found": True,
        "matches": matches,
        "exact_match": None
    }

    for match in matches:
        if match["name"].lower() == query_lower:
            result["exact_match"] = match
            break

    print(json.dumps(result, indent=2))


def get_repo_path(kb_path: str, repo_name: str):
    """获取仓库本地路径"""
    repos, _, _ = parse_claude_md(kb_path)

    for repo in repos:
        if repo["name"].lower() == repo_name.lower():
            print(repo.get("local_path", ""))
            return

    print("")


def main():
    parser = argparse.ArgumentParser(description="GitHub Knowledge Base Manager")
    parser.add_argument("command", choices=["init", "add", "list", "find", "get-path"])
    parser.add_argument("kb_path", help="Path to knowledge base directory")
    parser.add_argument("--name", help="Repository name (for add command)")
    parser.add_argument("--summary", help="Repository summary (for add command)")
    parser.add_argument("--local-path", help="Local path (for add command)")
    parser.add_argument("--query", help="Search query (for find command)")

    args = parser.parse_args()

    if args.command == "init":
        init_kb(args.kb_path)
    elif args.command == "add":
        if not args.name or not args.summary:
            print("Error: --name and --summary are required for add command")
            sys.exit(1)
        add_repo(args.kb_path, args.name, args.summary, args.local_path or "")
    elif args.command == "list":
        list_repos(args.kb_path)
    elif args.command == "find":
        if not args.query:
            print("Error: --query is required for find command")
            sys.exit(1)
        find_repo(args.kb_path, args.query)
    elif args.command == "get-path":
        if not args.name:
            print("Error: --name is required for get-path command")
            sys.exit(1)
        get_repo_path(args.kb_path, args.name)


if __name__ == "__main__":
    main()
