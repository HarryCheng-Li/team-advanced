# SAS vs MAS 架构选择器

## 架构对比

| 维度 | SAS (Single-Agent + Skills) | MAS (Multi-Agent Team) |
|------|----------------------------|------------------------|
| **核心思想** | 一个 Agent，多个 Skills | 多个 Agent，协作完成 |
| **适用任务** | 简单、边界清晰、单一领域 | 复杂、需要多角色协作 |
| **Token 消耗** | 低（-40% ~ -60%） | 高 |
| **响应速度** | 快（无协作开销） | 慢（有通信开销） |
| **适用场景** | 代码生成、简单审查、文档编写 | 架构设计、复杂 Bug 排查、大型项目 |

## 选择算法

```javascript
// 架构选择决策函数
function selectArchitecture(taskDescription, context) {
  let sasScore = 0;
  let masScore = 0;

  // SAS 倾向指标
  if (estimatedTime < 30) sasScore += 3;
  if (singleDomain) sasScore += 2;
  if (!requiresCollaboration) sasScore += 2;
  if (tokenSensitive) sasScore += 2;

  // MAS 倾向指标
  if (estimatedTime > 60) masScore += 3;
  if (multipleDomains) masScore += 2;
  if (requiresParallelExploration) masScore += 3;
  if (highRisk || requiresValidation) masScore += 2;
  if (complexArchitecture) masScore += 2;

  return sasScore >= masScore ? "SAS" : "MAS";
}
```

## 实现模板

### SAS 模式执行
```javascript
// 单 Agent 顺序执行多个 Skills
async function executeSAS(task) {
  // 1. 需求澄清
  Skill({ skill: "interview-skills", args: task.description });

  // 2. 代码生成
  const codeResult = await Task({
    prompt: `生成代码: ${task.description}`,
    subagent_type: "general-purpose"
  });

  // 3. 测试生成
  const testResult = await Task({
    prompt: `为以下代码生成测试: ${codeResult}`,
    subagent_type: "Bash"
  });

  return { code: codeResult, tests: testResult };
}
```

### MAS 模式执行
```javascript
// 创建 Team 并行协作
async function executeMAS(task) {
  TeamCreate({ team_name: task.name, description: task.description });

  // 并行创建多个 Agent
  Task({ name: "backend-dev", ... });
  Task({ name: "frontend-dev", ... });
  Task({ name: "test-engineer", ... });

  // 等待协作完成
  return await waitForTeamCompletion();
}
```

## 快速判断规则

**选择 SAS 如果：**
- 任务预计 < 30 分钟完成
- 只需一个技术领域（如纯后端、纯前端）
- 不需要多方审查/辩论
- 对 Token 消耗敏感

**选择 MAS 如果：**
- 任务预计 > 1 小时完成
- 需要多个技术领域协作
- 需要并行探索（如 Bug 排查）
- 需要多方审查/验证
- 高风险决策
