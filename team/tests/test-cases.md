# Team Skill Test Cases

> 测试用例定义 - Agent Team 自动化编排

---

## TC-TEAM-001: 基础触发测试

**类型**: functional
**优先级**: P0
**模式**: standard

### 输入
```
/team 我想做一个用户登录功能
```

### 预期行为
1. 识别为功能开发任务
2. 选择标准模式（预计时间 > 30分钟）
3. 触发 Phase 0 技术尽调
4. 生成尽调报告到 .claude/plans/

### 验证点
- [ ] 正确识别任务类型为"功能开发"
- [ ] 选择标准模式
- [ ] 生成 due-diligence-*.md 文件
- [ ] 报告包含"现有方案概览"章节

---

## TC-TEAM-002: 快速模式测试

**类型**: functional
**优先级**: P0
**模式**: quick

### 输入
```
/team --quick 帮我加一个按钮
```

### 预期行为
1. 识别 --quick 标志
2. 选择快速模式
3. 跳过 Phase 2 深度搜索
4. Interview 最多 3 轮

### 验证点
- [ ] 识别 --quick 标志
- [ ] 简化尽调（仅 Top 3 方案）
- [ ] Interview 不超过 3 轮
- [ ] 4 个 Phase 完成

---

## TC-TEAM-003: 完整模式测试

**类型**: functional
**优先级**: P1
**模式**: full

### 输入
```
/team --full 我想做一个在线商城
```

### 预期行为
1. 识别 --full 标志
2. 选择完整模式
3. 完整 Interview + 文档
4. 6+ 角色 + 冗余验证

### 验证点
- [ ] 识别 --full 标志
- [ ] 完整尽调 + 备选方案
- [ ] 7 个 Phase 全部执行
- [ ] 多层验收

---

## TC-TEAM-004: Bug 调试场景

**类型**: functional
**优先级**: P1
**模式**: standard

### 输入
```
/team 网站打开很慢，帮我看看
```

### 预期行为
1. 识别为 Bug 调试任务（P0 优先级）
2. 选择 bug-hunter + fix-implementer 角色
3. 问题分析流程

### 验证点
- [ ] 识别任务类型为"Bug调试"
- [ ] 优先级设为 P0
- [ ] 选择正确的技术角色

---

## TC-TEAM-005: Interview 集成测试

**类型**: integration
**优先级**: P1

### 输入
```
/team 我想做一个功能
```

### 预期行为
1. Team Skill 调用 interview-skills
2. Interview 使用尽调报告作为 --input
3. Interview 返回澄清后的需求

### 验证点
- [ ] 正确调用 interview-skills
- [ ] 传递 --input 参数
- [ ] 接收 Interview 输出

---

## TC-TEAM-006: Github-kb 集成测试

**类型**: integration
**优先级**: P1

### 输入
```
/team 我想做一个 React 登录组件
```

### 预期行为
1. tech-scout 优先查询 github-kb
2. 如果找到本地参考项目，优先展示
3. 尽调报告区分"本地"和"在线"资源

### 验证点
- [ ] 调用 github-kb find
- [ ] 尽调报告包含"📦 本地知识库发现"
- [ ] 本地资源优先展示

---

## TC-TEAM-007: 元数据验证

**类型**: unit
**优先级**: P0

### 验证点
- [ ] SKILL.md 包含完整的 YAML front matter
- [ ] METADATA.json 存在且格式正确
- [ ] version 使用语义化版本
- [ ] dependencies 正确声明

---

## 测试统计

| 指标 | 值 |
|------|-----|
| 总用例数 | 7 |
| P0 用例 | 3 |
| P1 用例 | 4 |
| 功能测试 | 4 |
| 集成测试 | 2 |
| 单元测试 | 1 |
