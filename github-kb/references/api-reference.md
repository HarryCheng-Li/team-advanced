# GitHub API 参考

无 `gh` 时的回退方案。

## 基础

```bash
BASE="https://api.github.com"
# 认证: -H "Authorization: token YOUR_TOKEN"
```

## 仓库

| 操作 | 端点 |
|------|------|
| 搜索 | `/search/repositories?q=<q>&sort=stars&per_page=10` |
| 查看 | `/repos/<owner>/<repo>` |
| README | `/repos/<owner>/<repo>/readme` |
| 内容 | `/repos/<owner>/<repo>/contents/<path>` |
| 原始文件 | `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/<path>` |

## Issue/PR

| 操作 | 端点 |
|------|------|
| Issues | `/repos/<owner>/<repo>/issues?state=open&per_page=10` |
| PRs | `/repos/<owner>/<repo>/pulls?state=open&per_page=10` |
| 搜索 | `/search/issues?q=<q>+repo:<owner>/<repo>` |

## 示例

```bash
# 搜索仓库
curl -s "https://api.github.com/search/repositories?q=react&sort=stars&per_page=5"

# 查看仓库
curl -s "https://api.github.com/repos/facebook/react" | jq '{name, stars: .stargazers_count}'

# 获取 README
curl -s "https://api.github.com/repos/facebook/react/readme" | jq -r '.content' | base64 -d

# 列出 Issues
curl -s "https://api.github.com/repos/facebook/react/issues?state=open&per_page=5" | jq '.[].title'
```

## 速率限制

```bash
curl -s "https://api.github.com/rate_limit" | jq
# 未认证: 60/小时 | 已认证: 5000/小时
```

## 错误处理

```bash
code=$(curl -s -o /dev/null -w "%{http_code}" "https://api.github.com/repos/owner/repo")
# 404 = 不存在 | 403 = 限流 | 401 = 未授权
```
