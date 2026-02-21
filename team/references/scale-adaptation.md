# 规模自适应系统 (Scale Adaptation)

## 概述

规模自适应系统根据任务复杂度自动选择合适的执行流程和资源配置，确保效率和质量的平衡。

## 五级规模系统

| 级别 | 名称 | Stories | 流程 | 预计时间 | 角色数 |
|------|------|---------|------|----------|--------|
| **Level 0** | 快速修复 | 1-2 | Quick Flow | 15-30分钟 | 1 |
| **Level 1** | 小型任务 | 3-5 | Quick + Tech Spec | 1-2小时 | 2-3 |
| **Level 2** | 中型任务 | 6-10 | Standard | 2-4小时 | 3-5 |
| **Level 3** | 大型任务 | 11-30 | Full + Party Mode | 1-3天 | 6-10 |
| **Level 4** | 企业级 | 30+ | Full + Security + DevOps | 1-2周 | 10+ |

## 级别定义

### Level 0: 快速修复 (Hotfix)

```yaml
特征:
  - 单一明确的问题
  - 影响范围小
  - 不涉及架构变更
  - 修改不超过 5 个文件

示例:
  - 修复一个拼写错误
  - 调整一个颜色值
  - 修改一个配置项

流程: Quick Flow
  Phase 0: 查询 Instincts
  Phase 1: 简化尽调
  Phase 5: 直接执行
  Phase 5.5: 快速验证 (Build + Tests)
  Phase 6: 简化验收
  Phase 7: 交付

角色: 单 Agent (general-purpose)
验证: 快速模式 [Build, Tests]
```

### Level 1: 小型任务 (Small Task)

```yaml
特征:
  - 功能明确
  - 技术方案清晰
  - 涉及 1-2 个模块
  - 修改 5-15 个文件

示例:
  - 添加一个表单字段
  - 新增一个 API 端点
  - 实现一个简单组件

流程: Quick + Tech Spec
  Phase 0: 查询 Instincts
  Phase 1: 简化尽调
  Phase 2: 简化 Interview (最多3轮)
  Phase 4: 简化架构决策
  Phase 5: 团队执行
  Phase 5.5: 标准验证
  Phase 6: 验收
  Phase 7: 交付
  Phase 8: 基础学习

角色: 2-3 人 (product-owner + developer)
验证: 标准模式 [Build, Types, Tests, Security]
```

### Level 2: 中型任务 (Medium Task)

```yaml
特征:
  - 功能较复杂
  - 需要一定设计
  - 涉及 2-4 个模块
  - 修改 15-50 个文件

示例:
  - 实现用户认证功能
  - 添加搜索功能
  - 重构一个模块

流程: Standard
  Phase 0-8 完整流程
  标准 Interview
  标准验证

角色: 3-5 人 (product-owner + architect + developers)
验证: 标准模式
```

### Level 3: 大型任务 (Large Task)

```yaml
特征:
  - 功能复杂
  - 需要架构决策
  - 涉及多个模块
  - 修改 50+ 个文件

示例:
  - 实现完整的支付系统
  - 大规模重构
  - 新增核心业务模块

流程: Full + Party Mode
  Phase 0-8 完整流程
  完整 Interview + 文档
  Party Mode 架构讨论
  严格验证 + 对抗性审查

角色: 6-10 人 (完整团队)
验证: 严格模式 (全部7阶段 + 对抗性审查)
```

### Level 4: 企业级 (Enterprise)

```yaml
特征:
  - 系统级变更
  - 多团队协作
  - 安全合规要求
  - 修改 100+ 个文件

示例:
  - 新建一个子系统
  - 大型平台迁移
  - 合规性改造

流程: Full + Security + DevOps
  Phase 0-8 完整流程
  安全审查阶段
  DevOps 规划阶段
  灰度发布计划
  回滚预案

角色: 10+ 人 (多团队)
验证: 严格模式 + 安全审计 + 性能测试
```

## 自动判断逻辑

```javascript
function determineScale(userInput, analysisResult) {
  // 1. 检查强制关键词
  if (containsKeywords(userInput, ['hotfix', '紧急修复', '生产问题'])) {
    return { level: 0, reason: '检测到紧急修复关键词' };
  }

  // 2. 计算复杂度分数
  const score = calculateComplexityScore({
    estimatedTime: analysisResult.estimatedTime,
    fileCount: analysisResult.affectedFiles,
    moduleCount: analysisResult.affectedModules,
    techDomains: analysisResult.techDomains,
    riskLevel: analysisResult.riskLevel,
    hasArchitectureChange: analysisResult.hasArchitectureChange,
    hasSecurityImpact: analysisResult.hasSecurityImpact
  });

  // 3. 映射到级别
  if (score < 10) return { level: 0, reason: '低复杂度' };
  if (score < 30) return { level: 1, reason: '小型任务' };
  if (score < 60) return { level: 2, reason: '中型任务' };
  if (score < 90) return { level: 3, reason: '大型任务' };
  return { level: 4, reason: '企业级' };
}

function calculateComplexityScore(factors) {
  let score = 0;

  // 时间因素
  if (factors.estimatedTime < 30) score += 5;
  else if (factors.estimatedTime < 120) score += 15;
  else if (factors.estimatedTime < 240) score += 30;
  else score += 50;

  // 文件数量
  score += Math.min(factors.fileCount * 2, 20);

  // 模块数量
  score += factors.moduleCount * 5;

  // 技术领域
  score += factors.techDomains * 5;

  // 风险级别
  if (factors.riskLevel === 'high') score += 15;
  if (factors.riskLevel === 'critical') score += 25;

  // 架构变更
  if (factors.hasArchitectureChange) score += 20;

  // 安全影响
  if (factors.hasSecurityImpact) score += 15;

  return score;
}
```

## 关键词检测

```yaml
Level 0 关键词:
  - hotfix, 紧急修复, 生产问题
  - 修复, bug, 错误
  - 改一个小, 调整一下

Level 1 关键词:
  - 添加一个, 新增一个
  - 简单的, 小功能
  - 修改字段, 调整样式

Level 2 关键词:
  - 功能, 模块
  - 重构, 优化
  - 实现, 开发

Level 3 关键词:
  - 系统, 架构
  - 大规模, 完整
  - 集成, 平台

Level 4 关键词:
  - 企业级, 合规
  - 迁移, 改造
  - 安全审计, 灰度发布
```

## 流程差异对比

| 维度 | Level 0 | Level 1 | Level 2 | Level 3 | Level 4 |
|------|---------|---------|---------|---------|---------|
| **尽调** | 简化 | 简化 | 标准 | 完整 | 完整+备选 |
| **Interview** | 跳过 | 最多3轮 | 5-10轮 | 完整+文档 | 完整+文档 |
| **架构决策** | 跳过 | 简化 | 标准 | Party Mode | 多方评审 |
| **团队规模** | 1人 | 2-3人 | 3-5人 | 6-10人 | 10+人 |
| **验证模式** | 快速 | 标准 | 标准 | 严格 | 严格+审计 |
| **对抗性审查** | 无 | 无 | 可选 | 必须 | 必须 |
| **学习阶段** | 无 | 基础 | 标准 | 完整 | 完整+复盘 |

## 验证差异

```yaml
Level 0 (快速):
  stages: [Build, Tests]

Level 1 (标准):
  stages: [Build, Types, Tests, Security]

Level 2 (标准):
  stages: [Build, Types, Lint, Tests, Security, Functional]

Level 3 (严格):
  stages: [全部 7 阶段 + 对抗性审查]

Level 4 (严格+):
  stages: [全部 7 阶段 + 对抗性审查 + 安全审计 + 性能测试]
```

## 手动覆盖

用户可以手动指定级别：

```
/team --level 3 "实现用户认证功能"
```

或指定模式：

```
/team --quick "快速模式"    # Level 0/1
/team --full "完整模式"     # Level 3/4
```

## 相关参考

- **执行流程**: [phases/](../phases/)
- **验证系统**: [references/enhanced-verification.md](enhanced-verification.md)
- **对抗性审查**: [references/adversarial-review.md](adversarial-review.md)
- **定制化系统**: [customization/customize-schema.yaml](../customization/customize-schema.yaml)
