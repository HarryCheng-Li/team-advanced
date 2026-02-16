# 工作流与 Checklist

## 目录
- [查询仓库流程](#流程1-查询仓库)
- [下载仓库流程](#流程2-下载仓库)
- [Issue/PR 查询流程](#流程3-issuepr-查询)
- [知识库维护](#流程4-知识库维护)
- [错误恢复](#错误恢复)

---

## 流程1: 查询仓库

### Checklist
```
查询仓库进度:
- [ ] 1. 本地搜索
- [ ] 2. 在线搜索（如本地未找到）
- [ ] 3. 展示结果
```

### 步骤

**Step 1: 本地搜索**
```bash
python ~/.claude/skills/github-kb/scripts/manage_kb.py find ~/github --query "<name>"
```

**Step 2: 分支处理**
- 找到 → 直接使用，执行仓库分析
- 未找到 → 执行在线搜索

**Step 3: 在线搜索**
```bash
# 有 gh
gh search repos "<query>" --limit 5

# 无 gh
curl -s "https://api.github.com/search/repositories?q=<query>&sort=stars&per_page=5"
```

### 输出示例

**本地找到**:
```
📦 react
📍 ~/github/react
📝 A declarative JavaScript library for building user interfaces
🌿 main
```

**本地未找到**:
```
🔍 本地未找到 "vue"，在线结果:
1. vuejs/vue - The Progressive JavaScript Framework (⭐200k)
2. vuejs/vue-router - Official router (⭐18k)

是否下载？输入序号或仓库名。
```

---

## 流程2: 下载仓库

### Checklist
```
下载仓库进度:
- [ ] 1. 检查本地是否已存在
- [ ] 2. 执行 git clone
- [ ] 3. 验证克隆成功
- [ ] 4. 生成摘要
- [ ] 5. 添加到知识库
- [ ] 6. 验证记录成功
```

### 步骤

**Step 1: 检查存在**
```bash
[ -d ~/github/<repo> ] && echo "已存在" || echo "不存在"
```

**Step 2: 执行克隆**
```bash
# 标准克隆
git clone <url> ~/github/<name>

# 大型仓库浅克隆
git clone --depth 1 <url> ~/github/<name>
```

**Step 3: 验证克隆**
```bash
[ -d ~/github/<repo>/.git ] && echo "✓ 克隆成功" || echo "✗ 克隆失败"
```

**Step 4: 生成摘要**
```python
# 优先级: README.md > package.json/pyproject.toml > 目录结构
# 长度限制: 100字符以内
```

**Step 5: 添加记录**
```bash
python ~/.claude/skills/github-kb/scripts/manage_kb.py add ~/github \
    --name "<name>" \
    --summary "<summary>" \
    --local-path "~/github/<name>"
```

**Step 6: 验证记录**
```bash
python ~/.claude/skills/github-kb/scripts/manage_kb.py find ~/github --query "<name>" | grep -q '"found": true' && echo "✓ 已记录" || echo "✗ 记录失败"
```

### 摘要生成规则

| 优先级 | 来源 | 处理方式 |
|--------|------|---------|
| 1 | README.md | 提取第一段，限100字符 |
| 2 | package.json/pyproject.toml | 使用 description 字段 |
| 3 | 目录结构 | 根据文件推测用途 |

---

## 流程3: Issue/PR 查询

### Checklist
```
Issue/PR 查询进度:
- [ ] 1. 确定目标仓库
- [ ] 2. 执行查询
- [ ] 3. 格式化输出
```

### 步骤

**Step 1: 确定仓库**
- 用户指定 → 直接使用
- 未指定 → 搜索本地知识库

**Step 2: 执行查询**
```bash
# 使用 gh (推荐)
gh issue list --repo owner/repo --state open --limit 10
gh pr list --repo owner/repo --state open --limit 10

# 使用 curl
curl -s "https://api.github.com/repos/owner/repo/issues?state=open&per_page=10"
```

### 输出格式
```
📋 owner/repo 的 Open Issues:

#28001 - Server Components hydration error
  👤 user1 | 📅 2026-02-10 | 💬 5

#27998 - TypeScript types improvement
  👤 user2 | 📅 2026-02-08 | 💬 12
```

---

## 流程4: 知识库维护

### 初始化
```bash
[ -d ~/github ] || mkdir -p ~/github
python ~/.claude/skills/github-kb/scripts/manage_kb.py init ~/github
```

### 同步检查
```bash
for repo in ~/github/*/; do
    cd "$repo" && git fetch --quiet
    LOCAL=$(git rev-parse HEAD)
    REMOTE=$(git rev-parse '@{u}' 2>/dev/null || echo "$LOCAL")
    [ "$LOCAL" != "$REMOTE" ] && echo "$(basename $repo): 有更新"
done
```

### 清理无效记录
```bash
# 检查 CLAUDE.md 中记录的路径是否仍存在
python ~/.claude/skills/github-kb/scripts/manage_kb.py list ~/github
```

---

## 错误恢复

### 克隆失败
```
✗ 克隆失败: <error>

排查:
1. 网络 → 检查连接
2. 权限 → 确认是否私有仓库
3. URL → 确认地址正确

选项:
1. 重试
2. 使用 SSH: git@github.com:owner/repo.git
3. 跳过
```

### API 限流
```
✗ GitHub API 限流

解决:
1. 配置 gh: gh auth login
2. 等待 1 小时
3. 使用本地数据
```

### 知识库损坏
```bash
# 重新初始化
python ~/.claude/skills/github-kb/scripts/manage_kb.py init ~/github

# 重新扫描已有仓库
for repo in ~/github/*/; do
    name=$(basename $repo)
    [ -f "$repo/README.md" ] && summary=$(head -1 "$repo/README.md") || summary="GitHub repository"
    python ~/.claude/skills/github-kb/scripts/manage_kb.py add ~/github --name "$name" --summary "$summary"
done
```
