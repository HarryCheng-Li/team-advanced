# Party Mode 执行协议

本文档详细定义 Party Mode 的执行细节，确保多 Agent 讨论过程规范、高效、可追溯。

---

## 1. 触发条件

### 1.1 自动触发

系统在以下场景自动建议启用 Party Mode：

| 场景 | 触发条件 | 置信度阈值 |
|------|----------|------------|
| 架构决策 | 涉及系统架构变更或选型 | < 70% |
| 技术栈选择 | 需要选择编程语言、框架、数据库等 | < 70% |
| 重大设计决策 | 影响系统核心设计的选择 | < 70% |
| 安全策略制定 | 涉及安全架构或策略 | < 80% |
| 性能优化方案 | 需要权衡多种优化策略 | < 70% |
| 重构决策 | 大规模代码重构方案 | < 70% |

**自动触发流程：**
```
1. 系统检测到决策场景
2. 评估当前置信度
3. 置信度低于阈值 → 建议启用 Party Mode
4. 用户确认后启动
```

### 1.2 手动触发

用户可通过以下命令手动启动 Party Mode：

```bash
/team --party "讨论主题"
```

**可选参数：**
```bash
/team --party "讨论主题" \
       --roles "architect,tech-lead,backend-developer" \
       --time-limit 30 \
       --preset "architecture_review"
```

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--roles` | 指定参与角色，逗号分隔 | 根据场景自动选择 |
| `--time-limit` | 时间限制（分钟） | 30 |
| `--preset` | 使用预定义配置 | - |
| `--focus` | 讨论焦点（技术/产品/安全） | 自动判断 |

---

## 2. 参与角色定义

### 2.1 必须角色

以下角色在 Party Mode 中必须参与：

| 角色 | 职责 | 视角 |
|------|------|------|
| **architect** | 技术架构把控 | 长期可维护性、扩展性、技术债务 |
| **product-owner** | 产品决策 | 用户需求、商业价值、交付时间 |

### 2.2 可选角色

根据讨论主题选择参与的可选角色：

| 角色 | 适用场景 | 职责 |
|------|----------|------|
| **tech-lead** | 技术实现讨论 | 技术可行性、团队技能、实现复杂度 |
| **backend-developer** | 后端相关决策 | 后端实现细节、数据库设计、API设计 |
| **frontend-developer** | 前端相关决策 | UI/UX实现、前端架构、性能优化 |
| **devops-engineer** | 部署运维讨论 | CI/CD、监控、运维成本、可观测性 |
| **security-reviewer** | 安全相关讨论 | 安全风险、合规要求、安全最佳实践 |
| **qa-verifier** | 质量保障讨论 | 测试策略、质量保证、风险识别 |
| **data-engineer** | 数据相关决策 | 数据模型、数据流、分析需求 |

### 2.3 角色选择逻辑

**场景-角色映射表：**

```yaml
架构选型:
  required: [architect, product-owner]
  optional: [tech-lead, backend-developer, devops-engineer]
  recommended: [architect, product-owner, tech-lead, backend-developer]

技术栈选择:
  required: [architect, product-owner]
  optional: [tech-lead, backend-developer, frontend-developer]
  recommended: [architect, product-owner, tech-lead]

API设计:
  required: [architect, product-owner]
  optional: [backend-developer, frontend-developer, security-reviewer]
  recommended: [architect, backend-developer, frontend-developer]

数据库选型:
  required: [architect, product-owner]
  optional: [backend-developer, data-engineer, devops-engineer]
  recommended: [architect, backend-developer, data-engineer]

安全策略:
  required: [architect, product-owner]
  optional: [security-reviewer, backend-developer, devops-engineer]
  recommended: [architect, product-owner, security-reviewer]

部署方案:
  required: [architect, product-owner]
  optional: [devops-engineer, backend-developer, security-reviewer]
  recommended: [architect, devops-engineer, backend-developer]
```

---

## 3. 讨论流程（Phase级别）

Party Mode 讨论分为 4 个 Phase，每个 Phase 有明确的目标、时间限制和输出要求。

### Phase 1: 观点收集（Opinion Collection）

**目标：** 让每个参与者独立表达观点，建立讨论基础

**时间：** 每人 3-5 分钟，总计 10-15 分钟

**流程：**
```
1. Coordinator 宣布 Phase 1 开始
2. 按角色顺序依次发言（architect → product-owner → 其他）
3. 每人发言 3-5 分钟，阐述：
   - 对问题的理解
   - 推荐方案及理由
   - 关键考量因素
   - 潜在风险
4. 此阶段禁止互相质疑或讨论
5. Coordinator 记录各方观点
```

**发言模板：**
```markdown
## {角色名} 观点

### 问题理解
{对讨论问题的理解}

### 推荐方案
{推荐的具体方案}

### 理由
1. {理由1}
2. {理由2}
3. {理由3}

### 关键考量
- {技术/产品/成本等方面的考量}

### 潜在风险
- {识别的风险点}
```

**输出：** 各方观点汇总文档

---

### Phase 2: 质疑环节（Challenge Phase）

**目标：** 通过对抗性提问发现盲点、检验假设

**时间：** 15-20 分钟

**流程：**
```
1. Coordinator 宣布 Phase 2 开始
2. 每人至少向其他角色提出 1 个质疑问题
3. 被质疑者需要回应，可以：
   - 承认并补充
   - 反驳并提供证据
   - 提出折中方案
4. Coordinator 控制节奏，确保讨论不偏离主题
5. 记录关键质疑点和回应
```

**质疑问题类型：**

| 类型 | 目的 | 示例 |
|------|------|------|
| 假设检验 | 验证前提假设 | "你假设用户量会快速增长，有什么数据支持？" |
| 风险挖掘 | 发现潜在风险 | "如果第三方服务宕机，系统如何处理？" |
| 成本质疑 | 质疑成本估算 | "你说开发成本低，考虑过维护成本吗？" |
| 可行性挑战 | 质疑技术可行性 | "这个方案需要团队掌握新技术，培训成本考虑了吗？" |
| 替代方案 | 要求考虑其他选项 | "为什么不考虑使用 Serverless 方案？" |

**规则：**
- 质疑针对观点，不针对个人
- 被质疑者必须回应，不能回避
- 可以互相质疑，形成讨论
- Coordinator 有权终止无意义的争论

**输出：** 质疑与回应记录

---

### Phase 3: 方案整合（Synthesis Phase）

**目标：** 找出共识点，识别分歧点，探索整合方案

**时间：** 10-15 分钟

**流程：**
```
1. Coordinator 总结 Phase 1 和 Phase 2 的关键信息
2. 识别共识点（所有角色同意的部分）
3. 识别分歧点（存在不同意见的部分）
4. 针对分歧点，探索：
   - 是否存在中间方案
   - 是否可以分阶段实施
   - 是否可以通过原型验证
5. 形成 2-3 个备选方案
```

**整合模板：**
```markdown
## 共识点
- [ ] {共识内容1}
- [ ] {共识内容2}

## 分歧点
| 分歧点 | 角色A观点 | 角色B观点 | 差异原因 |
|--------|-----------|-----------|----------|
| {分歧} | {观点} | {观点} | {原因} |

## 备选方案
### 方案A: {名称}
- 描述: {方案描述}
- 支持者: {支持角色}
- 优势: {优势}
- 劣势: {劣势}

### 方案B: {名称}
...

## 建议决策
{Coordinator 的建议}
```

**输出：** 整合后的备选方案文档

---

### Phase 4: 决策投票（Decision Phase）

**目标：** 做出最终决策，记录不同意见

**时间：** 5-10 分钟

**流程：**
```
1. Coordinator 呈现备选方案
2. 各角色投票（赞成/反对/弃权）
3. product-owner 听取投票结果
4. product-owner 做出最终决定
5. 记录决策和理由
6. 记录不同意见（如有）
7. 确定后续行动项
```

**投票规则：**
- 必须角色（architect, product-owner）必须表态
- 可选角色可以弃权
- 不追求全票通过，追求充分讨论后的决策
- product-owner 有最终决定权

**决策记录模板：**
```markdown
## 最终决策

**决策内容:** {具体决策}

**决策理由:**
1. {理由1}
2. {理由2}

**投票结果:**
| 角色 | 投票 | 备注 |
|------|------|------|
| architect | 赞成/反对 | {意见摘要} |
| product-owner | 赞成/反对 | {意见摘要} |
| ... | ... | ... |

## 不同意见记录
| 角色 | 不同意见 | 理由 |
|------|----------|------|
| {角色} | {不同意见} | {理由} |

## 后续行动项
| 行动项 | 负责人 | 截止时间 |
|--------|--------|----------|
| {行动项} | {角色} | {时间} |
```

**输出：** 最终决策文档

---

## 4. 终止条件

Party Mode 在以下条件下终止：

### 4.1 时间限制

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| 总时间限制 | 30 分钟 | 可配置 |
| Phase 1 时间 | 15 分钟 | 超时强制进入 Phase 2 |
| Phase 2 时间 | 20 分钟 | 超时强制进入 Phase 3 |
| Phase 3 时间 | 15 分钟 | 超时强制进入 Phase 4 |
| Phase 4 时间 | 10 分钟 | 超时 product-owner 必须决策 |

**超时处理：**
- 每个 Phase 结束前 3 分钟，Coordinator 提醒
- 超时后 Coordinator 有权强制推进到下一阶段
- 总时间超时后，product-owner 必须立即做出决策

### 4.2 达成共识

当满足以下条件时，可以提前终止：
- 所有必须角色（architect, product-owner）达成一致
- 无重大分歧需要记录
- 后续行动项已明确

### 4.3 product-owner 强制终止

product-owner 有权在以下情况强制终止：
- 讨论已经充分，可以做出决策
- 讨论陷入无意义的循环
- 出现新的关键信息需要重新评估
- 业务优先级发生变化

### 4.4 僵局检测

当检测到以下情况时，Coordinator 应介入：
- 连续 10 分钟无实质性进展
- 同一观点重复争论超过 3 轮
- 讨论偏离主题超过 5 分钟

**僵局处理：**
1. Coordinator 指出僵局
2. 给各方 2 分钟总结最终立场
3. product-owner 基于现有信息做出决策
4. 记录分歧点作为风险

---

## 5. 输出格式

Party Mode 结束后，必须生成以下文档：

### 5.1 decision.md（决策记录）

**文件路径：** `.claude/decisions/{timestamp}-{topic}.md`

**内容结构：**
```markdown
# 决策记录: {决策主题}

## 基本信息
- **决策日期:** {日期}
- **决策方式:** Party Mode
- **参与者:** {角色列表}
- **讨论时长:** {时长}

## 决策内容
{具体决策内容}

## 决策理由
1. {理由1}
2. {理由2}
...

## 替代方案
### 方案A: {名称}
- 描述: {描述}
- 未选择原因: {原因}

### 方案B: {名称}
...

## 参与者观点摘要
| 角色 | 主要观点 | 最终立场 |
|------|----------|----------|
| {角色} | {观点} | 赞成/反对 |

## 风险评估
| 风险 | 可能性 | 影响 | 缓解措施 |
|------|--------|------|----------|
| {风险} | 高/中/低 | 高/中/低 | {措施} |

## 后续行动
| 行动项 | 负责人 | 截止时间 | 状态 |
|--------|--------|----------|------|
| {行动项} | {负责人} | {时间} | 待办 |
```

### 5.2 dissenting-opinions.md（不同意见记录）

**文件路径：** `.claude/decisions/{timestamp}-{topic}-dissent.md`

**内容结构：**
```markdown
# 不同意见记录: {决策主题}

## 决策引用
- **决策文件:** {decision.md 链接}
- **决策内容:** {简述}

## 不同意见列表

### 意见 1: {角色} - {简要描述}
**持不同意见者:** {角色}

**不同意见:**
{详细描述}

**理由:**
1. {理由1}
2. {理由2}

**建议替代方案:**
{替代方案}

**记录时间:** {时间}

---

### 意见 2: ...

## 触发重新评估的条件
- {条件1}
- {条件2}
```

### 5.3 action-items.md（后续行动项）

**文件路径：** `.claude/decisions/{timestamp}-{topic}-actions.md`

**内容结构：**
```markdown
# 后续行动项: {决策主题}

## 决策引用
- **决策文件:** {decision.md 链接}

## 立即行动（本周）
| 序号 | 行动项 | 负责人 | 截止时间 | 优先级 | 状态 |
|------|--------|--------|----------|--------|------|
| 1 | {行动} | {角色} | {时间} | P0/P1/P2 | 待办 |

## 短期行动（本月）
| 序号 | 行动项 | 负责人 | 截止时间 | 优先级 | 状态 |
|------|--------|--------|----------|--------|------|
| 1 | {行动} | {角色} | {时间} | P0/P1/P2 | 待办 |

## 中期行动（本季度）
| 序号 | 行动项 | 负责人 | 截止时间 | 优先级 | 状态 |
|------|--------|--------|----------|--------|------|
| 1 | {行动} | {角色} | {时间} | P0/P1/P2 | 待办 |

## 验证里程碑
| 里程碑 | 验证标准 | 预计时间 | 负责人 |
|--------|----------|----------|--------|
| {里程碑} | {标准} | {时间} | {角色} |

## 状态更新记录
| 时间 | 更新内容 | 更新人 |
|------|----------|--------|
| {时间} | {内容} | {角色} |
```

---

## 6. Coordinator 职责

Coordinator 在 Party Mode 中承担以下职责：

### 6.1 流程管理
- 控制讨论节奏，确保各 Phase 按时完成
- 维护发言秩序，确保每人有表达机会
- 在超时情况下强制推进流程

### 6.2 内容管理
- 记录各方观点和关键论点
- 识别并总结共识和分歧
- 确保讨论不偏离主题

### 6.3 冲突调解
- 在争论升级时介入调解
- 将人身攻击引导回观点讨论
- 在僵局时提出突破建议

### 6.4 文档生成
- 生成 decision.md
- 生成 dissenting-opinions.md（如有）
- 生成 action-items.md

---

## 7. 质量检查清单

Party Mode 结束前，Coordinator 应确认：

- [ ] 所有必须角色都已充分发言
- [ ] 至少完成一轮质疑环节
- [ ] 共识点和分歧点已明确记录
- [ ] 决策理由充分且可追溯
- [ ] 不同意见已记录（如有）
- [ ] 后续行动项已明确分配
- [ ] 所有输出文档已生成

---

## 8. 附录

### 8.1 快速参考卡

```
Party Mode 执行速查
===================

触发: /team --party "主题" [--roles ...] [--time-limit 30]

必须角色: architect, product-owner
可选角色: tech-lead, backend-developer, frontend-developer,
          devops-engineer, security-reviewer, qa-verifier, data-engineer

4个Phase:
  Phase 1 (10-15min): 观点收集 - 每人独立发言
  Phase 2 (15-20min): 质疑环节 - 对抗性提问
  Phase 3 (10-15min): 方案整合 - 找共识、识分歧
  Phase 4 (5-10min):  决策投票 - product-owner决策

终止条件:
  - 时间到 (默认30分钟)
  - 达成共识
  - product-owner强制终止
  - 僵局10分钟

输出:
  - decision.md (决策记录)
  - dissenting-opinions.md (不同意见)
  - action-items.md (后续行动)
```

### 8.2 常见问题

**Q: 如果某个角色无法参与怎么办？**
A: 必须角色必须参与，否则无法进行。可选角色缺席时，Coordinator 可以基于该角色的典型视角补充观点。

**Q: 讨论超时怎么办？**
A: Coordinator 会在每个 Phase 结束前提醒。超时后 Coordinator 有权强制推进。总超时后 product-owner 必须立即决策。

**Q: 可以修改已做出的决策吗？**
A: 可以。当触发重新评估条件时（如发现重大风险、业务变化等），可以重新启动 Party Mode 讨论。

**Q: 如何处理情绪化的争论？**
A: Coordinator 应介入调解，将讨论引导回观点层面。如无法平息，product-owner 可强制终止并做出决策。
