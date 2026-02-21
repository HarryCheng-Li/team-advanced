# Git 工作流规则

## Commit 消息格式

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 格式
```
<type>(<scope>): <subject>

[optional body]

[optional footer(s)]
```

### Type 类型
| Type | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | feat(auth): add OAuth2 login |
| `fix` | Bug 修复 | fix(api): resolve null pointer error |
| `docs` | 文档更新 | docs: update API documentation |
| `style` | 代码格式（不影响逻辑） | style: fix indentation |
| `refactor` | 重构（非新功能、非修复） | refactor(user): extract validation logic |
| `perf` | 性能优化 | perf(query): optimize database query |
| `test` | 测试相关 | test(auth): add unit tests for login |
| `chore` | 构建/工具相关 | chore: update dependencies |
| `ci` | CI/CD 相关 | ci: add GitHub Actions workflow |
| `revert` | 回滚提交 | revert: revert feat(auth): add OAuth2 |

### Subject 要求
- 使用**祈使句**（imperative mood）
- 首字母小写
- 不以句号结尾
- 长度不超过 **50 字符**

### 示例
```bash
# Good
feat(payment): add Alipay payment method
fix(user): resolve email validation issue
docs(api): update endpoint documentation

# Bad
Added new feature              # 没有使用 type
Fixed bug                      # 太笼统
feat(auth): added OAuth.       # 以句号结尾
```

### 多行 Commit
```bash
feat(order): implement order cancellation

- Add cancel button to order detail page
- Send cancellation email to user
- Update order status in database

Closes #123
```

## 分支命名约定

### 主分支
- `main` / `master` - 生产环境代码
- `develop` / `dev` - 开发分支

### 功能分支
```
<type>/<ticket-id>-<short-description>

# 示例
feature/PROJ-123-add-user-auth
bugfix/PROJ-456-fix-login-error
hotfix/PROJ-789-patch-security-issue
release/v1.2.0
```

### 分支类型
| Type | 用途 | 基于 | 合并到 |
|------|------|------|--------|
| `feature` | 新功能 | develop | develop |
| `bugfix` | Bug 修复 | develop | develop |
| `hotfix` | 紧急修复 | main | main + develop |
| `release` | 发布准备 | develop | main |
| `support` | 旧版本支持 | main | main |

### 命名规则
- 全部**小写**
- 使用**连字符**分隔单词
- 描述**简短明确**
- 包含**工单编号**（如有）

## PR (Pull Request) 规范

### 标题格式
```
[<type>] <description>

# 示例
[Feature] Add user authentication
[Bugfix] Fix payment calculation error
[Refactor] Simplify order service
```

### 描述模板
```markdown
## 变更概述
<!-- 简要描述本次变更的内容 -->

## 变更类型
- [ ] 新功能 (feature)
- [ ] Bug 修复 (bugfix)
- [ ] 重构 (refactor)
- [ ] 文档更新 (docs)
- [ ] 其他: ___

## 相关 Issue
Closes #___

## 变更内容
- <!-- 具体变更点 1 -->
- <!-- 具体变更点 2 -->

## 测试计划
- [ ] 单元测试已通过
- [ ] 集成测试已通过
- [ ] 手动测试完成

## 截图（如有 UI 变更）
<!-- Before/After 截图 -->

## 检查清单
- [ ] 代码符合项目规范
- [ ] 已添加必要注释
- [ ] 已更新相关文档
- [ ] 无新增警告
```

### PR 规则
- **一个 PR 只做一件事**
- 变更文件数尽量控制在 **10 个以内**
- 代码行数控制在 **400 行以内**（不含测试）
- 标题和描述**使用中文或英文保持一致**

## Code Review 要求

### 审查者职责
- 在 **24 小时内**响应 PR
- 重点关注：
  - 逻辑正确性
  - 代码可读性
  - 性能影响
  - 安全风险
  - 测试覆盖

### 审查标准

#### 必须拒绝 (Request Changes)
- 存在安全漏洞
- 功能不符合需求
- 严重性能问题
- 缺少必要测试

#### 建议修改 (Comment)
- 代码可读性差
- 命名不规范
- 可以优化的逻辑

#### 批准 (Approve)
- 符合所有规范
- 小问题可在后续 PR 修复

### 审查流程
1. 作者创建 PR，自检后请求审查
2. 至少 **1 名**审查者批准（关键模块需 2 名）
3. CI 检查全部通过
4. 作者合并 PR（非强制要求）

### 合并策略
| 场景 | 策略 | 说明 |
|------|------|------|
| 功能分支 | Squash and Merge | 保持主分支历史整洁 |
| 热修复 | Merge Commit | 保留完整历史 |
| 发布分支 | Merge Commit | 标记发布节点 |

## Git 操作规范

### 禁止操作
- **禁止**直接提交到 `main` 分支
- **禁止**强制推送到共享分支
- **禁止**提交敏感信息（密码、密钥等）
- **禁止**提交大型二进制文件

### 提交前检查
```bash
# 拉取最新代码
git pull --rebase

# 检查变更
git diff
git status

# 运行测试
npm test

# 检查代码风格
npm run lint
```

### 撤销操作
```bash
# 撤销未推送的提交（保留修改）
git reset --soft HEAD~1

# 撤销已推送的提交（创建新提交）
git revert <commit-hash>
```
