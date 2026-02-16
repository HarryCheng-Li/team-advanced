# gh 命令速查

## 检测
```bash
command -v gh &> /dev/null && echo "available" || echo "not found"
```

## 仓库

| 操作 | 命令 |
|------|------|
| 搜索 | `gh search repos "<query>" --limit 10` |
| 查看 | `gh repo view owner/repo` |
| 克隆 | `gh repo clone owner/repo` |

## Issue

| 操作 | 命令 |
|------|------|
| 列表 | `gh issue list --repo owner/repo --state open` |
| 查看 | `gh issue view <n> --repo owner/repo` |
| 搜索 | `gh search issues "<query>" --repo owner/repo` |

## PR

| 操作 | 命令 |
|------|------|
| 列表 | `gh pr list --repo owner/repo --state open` |
| 查看 | `gh pr view <n> --repo owner/repo` |
| 检出 | `gh pr checkout <n>` |

## 过滤器

```bash
--state open|closed|all
--label "bug"
--author username
--limit 20
--json number,title,state  # JSON 输出
```

## 搜索语法

```bash
gh search repos "vue" --language typescript --sort stars --order desc
gh search code "function" --repo owner/repo
```

## 认证

```bash
gh auth login      # 登录
gh auth status     # 状态
gh auth refresh    # 刷新
```
