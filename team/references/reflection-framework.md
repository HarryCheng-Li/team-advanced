# 反思与元认知框架

## 三层反思体系

```
L1: 行动后反思 (After-Action Reflection)
    ↓ 每次任务完成后
L2: 阶段性反思 (Phase Reflection)
    ↓ 每个 Phase 完成后
L3: 项目级反思 (Project Reflection)
    项目结束后
```

---

## L1: 行动后反思

**触发时机**：每个 Agent 完成自己的任务后

**反思内容**：
```yaml
反思维度:
  结果评估:
    - 结果是否符合预期？
    - 有哪些偏差？原因是什么？

  过程评估:
    - 执行中遇到什么困难？
    - 哪些决策是正确的？
    - 哪些可以改进？

  质量自检:
    - 代码/产出是否符合标准？
    - 边界情况是否考虑？
    - 是否有明显错误？
```

**实现代码**：
```javascript
// 每个任务完成后自动触发
Task({
  description: "行动后反思",
  prompt: `你是 self-reflector。

## 刚完成的任务
任务：${taskName}
产出：${output}

## 反思清单
1. **结果是否符合预期？**
   - 预期：${expectedResult}
   - 实际：${actualResult}
   - 偏差：${deviation}

2. **质量自检**
   - [ ] 符合需求
   - [ ] 无明显错误
   - [ ] 边界情况已处理
   - [ ] 文档完整

3. **改进点**
   - 下次如何做得更好？

## 输出
如果发现问题，立即报告 tech-lead。
如果通过自检，标记任务完成。`,
  subagent_type: "general-purpose",
  name: "self-reflector",
  trigger: "afterEachTask"
});
```

---

## L2: 阶段性反思

**触发时机**：每个 Phase 完成后（Phase 3, 5, 7 后）

**反思内容**：
```yaml
反思维度:
  进度评估:
    - 计划 vs 实际
    - 延迟原因
    - 是否需要调整计划

  协作评估:
    - 沟通是否顺畅
    - 是否有信息孤岛
    - 决策效率如何

  质量评估:
    - 产出质量是否符合标准
    - 是否需要返工
    - 风险识别

  改进建议:
    - 下一阶段的优化建议
```

**实现代码**：
```javascript
// Phase 结束后执行
Task({
  description: "阶段性反思",
  prompt: `你是 phase-reflector。

## 刚完成的 Phase
Phase：${phaseName}
持续时间：${duration}
参与 Agent：${agents}

## 复盘模板

### 1. 进度回顾
| 计划 | 实际 | 偏差 |
|------|------|------|
| ... | ... | ... |

### 2. 协作情况
- 沟通问题：
- 阻塞点：
- 解决方式：

### 3. 质量检查
- 产出是否符合标准？
- 有哪些需要返工？

### 4. 下一阶段建议
- 需要调整什么？
- 风险预警？

## 输出
生成阶段性复盘报告，更新到 progress.md`,
  subagent_type: "general-purpose",
  name: "phase-reflector"
});
```

---

## L3: 项目级反思

**触发时机**：Phase 8 交付完成后

**反思内容**：
```yaml
反思维度:
  成功经验:
    - 哪些做法值得复用
    - 最佳实践提取

  失败教训:
    - 哪些错误可以避免
    - 根因分析

  流程改进:
    - Skill 流程的改进建议
    - 工具/模板的优化

  Agent 表现:
    - 各 Agent 的表现评估
    - 角色配置优化建议

  知识沉淀:
    - 更新 lessons-learned.md
    - 更新 agent-experiences/
```

**实现代码**：
```javascript
// 项目结束后执行
Task({
  description: "项目级反思",
  prompt: `你是 project-reflector。

## 项目信息
名称：${projectName}
持续时间：${duration}
团队成员：${teamMembers}

## 复盘模板

### 1. 成功经验 ✅
| 经验 | 应用场景 | 复用建议 |
|------|----------|----------|
| ... | ... | ... |

### 2. 失败教训 ❌
| 问题 | 原因 | 改进措施 |
|------|------|----------|
| ... | ... | ... |

### 3. 流程改进建议
- Skill 流程优化：
- 工具改进：
- 模板更新：

### 4. Agent 表现评估
| Agent | 表现 | 改进建议 |
|-------|------|----------|
| ... | ... | ... |

### 5. 知识沉淀清单
- [ ] 更新 lessons-learned.md
- [ ] 更新 agent-experiences/{role}.md
- [ ] 更新 architecture.md（如有架构决策）

## 输出
生成项目复盘报告，执行知识沉淀。`,
  subagent_type: "general-purpose",
  name: "project-reflector"
});
```

---

## 反思触发器配置

```javascript
// 在 SKILL.md 中配置触发点
const reflectionTriggers = {
  L1: {
    timing: "afterTaskComplete",
    condition: "always",
    autoExecute: true
  },
  L2: {
    timing: "afterPhaseComplete",
    condition: "phase in [3, 5, 7]",
    autoExecute: true
  },
  L3: {
    timing: "afterProjectComplete",
    condition: "always",
    autoExecute: true
  }
};
```

## 与记忆系统的集成

```javascript
// 反思结果自动沉淀到记忆
function saveReflectionToMemory(reflection) {
  if (reflection.type === "L1") {
    // 临时存储，不长期保留
    writeToSessionMemory(reflection);
  } else if (reflection.type === "L2") {
    // 存储到团队记忆
    appendToFile(`teams/${teamName}/progress.md`, reflection);
  } else if (reflection.type === "L3") {
    // 沉淀到长期记忆
    appendToFile("memory/lessons-learned.md", reflection);
    updateAgentExperiences(reflection.agentFeedback);
  }
}
```
