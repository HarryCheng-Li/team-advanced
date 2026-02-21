# Party Mode (多 Agent 讨论)

## 概述

Party Mode 让多个 Agent 像团队一样在同一个对话中讨论问题，模拟真实团队的讨论和决策过程。

## 核心理念

```yaml
价值:
  - 多角度思考: 不同角色带来不同视角
  - 假设检验: 通过讨论验证假设
  - 决策透明: 决策过程可见、可追溯
  - 创意碰撞: 不同专业背景激发新想法
```

## 触发方式

### 手动触发

```
/team --party "讨论主题"
```

### 自动触发

系统检测到以下场景时会建议启用 Party Mode：

```yaml
触发场景:
  - 架构选型讨论
  - 技术栈选择
  - 重大重构决策
  - 安全策略制定
  - 性能优化方案
  - Sprint 回顾
```

## 讨论流程

```
┌─────────────────────────────────────────────────────┐
│                  Party Mode 流程                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. Coordinator 开场                                │
│     └─► 说明讨论主题和目标                          │
│                                                     │
│  2. 角色发言 (按顺序或自由发言)                     │
│     ├─► Architect: 技术视角                        │
│     ├─► Product Owner: 用户视角                    │
│     ├─► Backend Dev: 实现视角                      │
│     └─► QA Verifier: 风险视角                      │
│                                                     │
│  3. 自由讨论                                        │
│     └─► 角色之间可以互相回应                       │
│                                                     │
│  4. Coordinator 总结                                │
│     ├─► 整理各方观点                               │
│     ├─► 识别共识和分歧                             │
│     └─► 做出决策或建议                             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 角色配置

### 默认参与角色

```yaml
架构讨论:
  - architect (主持)
  - tech-lead
  - backend-developer
  - security-reviewer

技术选型:
  - tech-scout (主持)
  - architect
  - product-owner
  - backend-developer

用户需求:
  - product-owner (主持)
  - user-translator
  - architect
  - frontend-developer

Sprint 回顾:
  - tech-lead (主持)
  - product-owner
  - all-developers
```

### 自定义角色组合

```yaml
# .claude/customize.yaml
party_mode:
  presets:
    security_review:
      roles:
        - security-reviewer
        - architect
        - backend-developer
      max_turns: 10
```

## 输出格式

### 讨论过程

```markdown
# Party Mode: {主题}

## 参与角色
- Architect (Winston)
- Product Owner (Mary)
- Backend Developer (Amelia)

## 讨论

### Architect (Winston)
建议先从 Monolith 开始。理由：
1. 团队规模小，不需要微服务复杂度
2. 初期迭代快，部署简单
3. 后续可以按需拆分

### Product Owner (Mary)
同意。Time to Market 是当前首要目标。
用户不关心架构，他们关心功能是否快速上线。

### Backend Developer (Amelia)
补充：即使 Monolith 也要设计清晰的模块边界。
建议采用模块化单体架构，为未来拆分做准备。

### Architect (Winston)
好建议。我们可以用以下方式组织：
- 按业务领域划分模块
- 模块间通过接口通信
- 共享数据库但逻辑隔离

### Product Owner (Mary)
这个方案好。既保证了快速交付，又为未来留有余路。

## 结论
采用模块化单体架构：
- 初期快速开发
- 模块边界清晰
- 可按需演进为微服务

## 待办
- [ ] 制定模块划分方案
- [ ] 定义模块接口规范
- [ ] 评估团队技能匹配
```

## 讨论模板

### 架构选型模板

```markdown
## 讨论主题
{选项A} vs {选项B}

## 评估维度
| 维度 | {选项A} | {选项B} |
|------|---------|---------|
| 开发效率 | ... | ... |
| 运维复杂度 | ... | ... |
| 扩展性 | ... | ... |
| 成本 | ... | ... |
| 团队熟悉度 | ... | ... |

## 各角色观点
### Architect
...

### Product Owner
...

### Backend Developer
...

## 决策
选择: {决策}
理由: {理由}
```

### Sprint 回顾模板

```markdown
## Sprint 回顾

## 做得好的
- ...

## 需要改进的
- ...

## 行动项
| 项目 | 负责人 | 截止日期 |
|------|--------|----------|
| ... | ... | ... |
```

## 规则

```yaml
发言规则:
  - 每人每次发言不超过 200 字
  - 必须基于角色视角发言
  - 可以质疑其他角色观点
  - 不可以人身攻击

决策规则:
  - Coordinator 有最终决定权
  - 尽量达成共识
  - 记录分歧点和原因

时间控制:
  - 每个主题最多 15 轮发言
  - 超时后强制总结
```

## 实现方式

Party Mode 通过 Coordinator 依次调用不同角色的 Agent 实现：

```javascript
// 伪代码
async function runPartyMode(topic, roles) {
  // 1. Coordinator 开场
  await sendMessage({
    role: 'coordinator',
    content: `开始讨论: ${topic}`
  });

  // 2. 依次让角色发言
  for (const role of roles) {
    const response = await Task({
      name: role,
      prompt: `在 "${topic}" 讨论中，从你的角色视角发表观点。`
    });

    await broadcast(response);
  }

  // 3. 自由讨论
  // ...

  // 4. Coordinator 总结
  await sendMessage({
    role: 'coordinator',
    content: generateSummary(discussion)
  });
}
```

## 相关参考

- **执行协议**: [party-mode-execution-protocol.md](party-mode-execution-protocol.md) - 详细的执行流程、Phase定义、终止条件和输出格式
- **讨论模板**: [discussion-templates.md](discussion-templates.md)
- **Coordinator Persona**: [personas/coordinator.md](../personas/coordinator.md)
- **角色定义**: [references/roles.md](../references/roles.md)

## 使用示例

### 示例1: 架构选型讨论

**场景**: 新项目应该选择 Monolith 还是 Microservices 架构？

```bash
/team --party "选择 Monolith 还是 Microservices 架构" \
       --roles "architect,product-owner,tech-lead,backend-developer,devops-engineer" \
       --time-limit 30
```

**讨论要点**:
- Phase 1: 各角色从开发速度、运维复杂度、团队规模等角度阐述观点
- Phase 2: 质疑"平滑演进"的可行性、团队技能匹配度
- Phase 3: 整合出"模块化单体"折中方案
- Phase 4: 全员同意采用分级模块化的 Monolith 架构

**完整示例**: [examples/example-monolith-vs-microservices.md](examples/example-monolith-vs-microservices.md)

### 示例2: 技术栈选择讨论

**场景**: 实时协作文档平台应该选择什么后端技术栈？

```bash
/team --party "选择后端开发语言和框架" \
       --roles "architect,product-owner,tech-lead,backend-developer,devops-engineer" \
       --time-limit 25 \
       --focus "技术"
```

**讨论要点**:
- 候选方案: Node.js vs Java vs Go
- Phase 1: Architect 强调性能，PO 强调开发速度
- Phase 2: 量化分析消息处理量（270消息/秒/文档）
- Phase 3: 达成有条件的一致（两周评估期）
- Phase 4: 选择 Go，记录 Backend Developer 的不同意见

**完整示例**: [examples/example-tech-stack-selection.md](examples/example-tech-stack-selection.md)

## 快速开始

### 1. 手动触发 Party Mode

```bash
# 基本用法
/team --party "讨论主题"

# 指定角色
/team --party "讨论主题" --roles "architect,product-owner,tech-lead"

# 指定时间限制
/team --party "讨论主题" --time-limit 30

# 完整参数
/team --party "API 设计讨论" \
       --roles "architect,product-owner,backend-developer,frontend-developer" \
       --time-limit 30 \
       --preset "api_design"
```

### 2. 自动触发场景

当系统检测到以下场景时，会自动建议启用 Party Mode：
- 架构决策置信度 < 70%
- 技术栈选择
- 重大设计决策
- 安全策略制定

### 3. 讨论流程概览

```
Phase 1 (10-15min): 观点收集
  └── 每人独立发言 3-5 分钟

Phase 2 (15-20min): 质疑环节
  └── 每人至少提 1 个质疑问题

Phase 3 (10-15min): 方案整合
  └── 找共识、识分歧、形成备选方案

Phase 4 (5-10min): 决策投票
  └── product-owner 最终决定，记录不同意见
```

### 4. 输出文档

Party Mode 结束后自动生成：
- `decision.md` - 决策记录（决策内容、理由、替代方案、风险评估）
- `dissenting-opinions.md` - 不同意见记录（如有）
- `action-items.md` - 后续行动项
