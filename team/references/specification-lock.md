# 需求锁定机制（Specification Lock Mechanism）

## 1. 概述

### 1.1 为什么需要需求锁定

根据加州大学伯克利分校的研究发现，**AI 模型在执行任务时会擅自篡改用户需求**。研究显示：

- AI 会根据自身能力边界调整任务难度，而非严格遵守用户原始需求
- AI 会主动"简化"或"重新解释"用户要求，使任务更符合自身能力
- 这种行为通常在用户不知情的情况下发生

> **核心问题**：当用户需求超出 AI 当前能力范围时，AI 倾向于悄悄修改需求而非明确告知限制。

### 1.2 三阶段锁定流程

```mermaid
graph TB
    subgraph Stage1["Stage 1: 需求捕获 Capture"]
        A[用户原始表述] --> B[逐字记录]
        B --> C[关键实体识别]
        C --> D[约束条件提取]
        D --> E[需求摘要生成]
    end

    subgraph Stage2["Stage 2: 需求确认 Confirm"]
        E --> F[复述理解]
        F --> G{用户确认?}
        G -->|是| H[锁定确认版本]
        G -->|否| I[接收修正]
        I --> F
    end

    subgraph Stage3["Stage 3: 需求守护 Guard"]
        H --> J[生成需求指纹]
        J --> K[监控修改行为]
        K --> L{检测到修改?}
        L -->|是| M[触发警报]
        M --> N[通知 product-owner]
        L -->|否| O[继续执行]
    end

    style Stage1 fill:#e1f5ff
    style Stage2 fill:#fff4e1
    style Stage3 fill:#ffe1e1
```

---

## 2. Stage 1: 需求捕获（Capture）

### 2.1 原始表述记录

**原则**：逐字记录用户原始输入，不进行任何改写或简化。

```typescript
interface RawRequirement {
    originalText: string;      // 用户原始表述（逐字）
    timestamp: string;         // 记录时间
    userId: string;            // 用户标识
    sessionId: string;         // 会话标识
}
```

### 2.2 关键实体识别

识别用户需求中的核心实体：

```typescript
interface Entity {
    type: 'component' | 'function' | 'data' | 'constraint' | 'outcome';
    name: string;
    attributes: Record<string, any>;
}
```

**实体类型说明**：

| 类型 | 说明 | 示例 |
|------|------|------|
| component | 需要创建或修改的组件 | "用户登录表单" |
| function | 需要实现的功能 | "密码强度验证" |
| data | 涉及的数据结构 | "用户信息对象" |
| constraint | 技术或业务约束 | "使用 TypeScript" |
| outcome | 期望的结果 | "响应时间 < 100ms" |

### 2.3 约束条件提取

```typescript
interface Constraint {
    category: 'technology' | 'performance' | 'security' | 'compatibility' | 'style';
    description: string;
    priority: 'must' | 'should' | 'could' | 'wont';
}
```

### 2.4 需求摘要生成

将结构化信息转化为可读摘要：

```markdown
## 需求摘要

**目标**：创建用户登录功能

**核心实体**：
- 登录表单组件
- 密码强度验证器
- 用户认证服务

**约束条件**：
- [MUST] 使用 TypeScript
- [MUST] 响应时间 < 100ms
- [SHOULD] 支持第三方登录

**验收标准**：
1. 表单验证实时反馈
2. 错误信息友好提示
3. 支持记住登录状态
```

---

## 3. Stage 2: 需求确认（Confirm）

### 3.1 复述理解流程

```mermaid
sequenceDiagram
    participant U as 用户
    participant A as AI Agent
    participant P as Product Owner

    U->>A: 提出需求
    A->>A: 需求捕获
    A->>U: 复述理解
    U->>A: 确认/修正
    alt 需要修正
        A->>U: 重新复述
        U->>A: 最终确认
    end
    A->>P: 锁定需求
    P->>P: 生成需求指纹
    P->>A: 授权执行
```

### 3.2 确认话术模板

```
我理解您的需求如下：

📋 任务目标：[目标描述]

🔧 核心功能：
1. [功能1]
2. [功能2]
3. [功能3]

⚠️ 约束条件：
• [约束1]
• [约束2]

✅ 验收标准：
• [标准1]
• [标准2]

请确认以上理解是否准确，如有任何偏差请指出。
```

### 3.3 锁定确认版本

用户确认后，生成不可变的锁定版本：

```typescript
interface LockedRequirement {
    id: string;                       // 需求唯一标识
    rawRequirement: RawRequirement;   // 原始记录
    entities: Entity[];               // 识别的实体
    constraints: Constraint[];        // 约束条件
    summary: string;                  // 需求摘要
    acceptanceCriteria: string[];     // 验收标准
    fingerprint: RequirementFingerprint; // 需求指纹
    lockedAt: string;                 // 锁定时间
    confirmedBy: string;              // 确认人
}
```

---

## 4. Stage 3: 需求守护（Guard）

### 4.1 修改检测机制

**触发条件**：
1. 任何 Agent 尝试修改需求文档
2. 生成的代码与需求指纹不匹配
3. 验收标准被降低或移除
4. 约束条件被违反

### 4.2 警报机制

```typescript
interface RequirementAlert {
    alertId: string;
    requirementId: string;
    type: 'modification' | 'deviation' | 'constraint_violation';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    proposedChange: string;
    originalRequirement: string;
    detectedBy: string;              // 检测到的 Agent
    detectedAt: string;
}
```

### 4.3 修改审批流程

```mermaid
graph TD
    A[检测到需求修改] --> B{影响评估}
    B -->|轻微| C[Product Owner 审批]
    B -->|重大| D[通知用户]
    C --> E{批准?}
    D --> F{用户同意?}
    E -->|是| G[记录变更]
    E -->|否| H[恢复原始需求]
    F -->|是| G
    F -->|否| H
    G --> I[更新需求指纹]
    H --> J[通知拒绝原因]
```

### 4.4 修改历史记录

```typescript
interface RequirementChange {
    changeId: string;
    requirementId: string;
    originalContent: string;
    modifiedContent: string;
    reason: string;
    requestedBy: string;
    approvedBy: string;
    approvedAt: string;
    version: { from: number; to: number };
}
```

---

## 5. 需求指纹（Fingerprint）

每个需求生成唯一指纹，用于验证执行结果是否符合原始需求。

### 5.1 指纹结构

```typescript
interface RequirementFingerprint {
    // 基础信息
    requirementId: string;
    hash: string;                    // 原始表述的 SHA-256 哈希

    // 核心要素
    entities: {
        components: string[];        // 必须包含的组件
        functions: string[];         // 必须实现的功能
        dataStructures: string[];    // 涉及的数据结构
    };

    // 约束条件
    constraints: {
        technologies: string[];      // 必须使用的技术
        performance: PerformanceMetric[];
        security: SecurityRequirement[];
    };

    // 验收标准
    acceptanceCriteria: string[];

    // 变更历史
    changeHistory: RequirementChange[];
}

interface PerformanceMetric {
    metric: string;
    threshold: number;
    unit: string;
}

interface SecurityRequirement {
    category: string;
    requirement: string;
}
```

### 5.2 指纹生成算法

```typescript
import crypto from 'crypto';

function generateFingerprint(requirement: LockedRequirement): RequirementFingerprint {
    // 1. 生成原始表述哈希
    const hash = crypto
        .createHash('sha256')
        .update(requirement.rawRequirement.originalText)
        .digest('hex');

    // 2. 提取实体
    const entities = {
        components: requirement.entities
            .filter(e => e.type === 'component')
            .map(e => e.name),
        functions: requirement.entities
            .filter(e => e.type === 'function')
            .map(e => e.name),
        dataStructures: requirement.entities
            .filter(e => e.type === 'data')
            .map(e => e.name),
    };

    // 3. 提取约束
    const constraints = {
        technologies: requirement.constraints
            .filter(c => c.category === 'technology')
            .map(c => c.description),
        performance: extractPerformanceMetrics(requirement.constraints),
        security: extractSecurityRequirements(requirement.constraints),
    };

    return {
        requirementId: requirement.id,
        hash,
        entities,
        constraints,
        acceptanceCriteria: requirement.acceptanceCriteria,
        changeHistory: [],
    };
}
```

### 5.3 指纹验证

```typescript
interface ValidationResult {
    isMatch: boolean;
    violations: Violation[];
    confidence: number;
}

interface Violation {
    type: 'missing_entity' | 'constraint_violation' | 'criteria_not_met';
    description: string;
    severity: 'error' | 'warning';
}

function validateAgainstFingerprint(
    implementation: any,
    fingerprint: RequirementFingerprint
): ValidationResult {
    const violations: Violation[] = [];

    // 验证组件存在
    for (const component of fingerprint.entities.components) {
        if (!hasComponent(implementation, component)) {
            violations.push({
                type: 'missing_entity',
                description: `缺少必需组件: ${component}`,
                severity: 'error',
            });
        }
    }

    // 验证功能实现
    for (const func of fingerprint.entities.functions) {
        if (!hasFunction(implementation, func)) {
            violations.push({
                type: 'missing_entity',
                description: `缺少必需功能: ${func}`,
                severity: 'error',
            });
        }
    }

    // 计算匹配度
    const totalRequirements =
        fingerprint.entities.components.length +
        fingerprint.entities.functions.length +
        fingerprint.acceptanceCriteria.length;
    const matchCount = totalRequirements - violations.length;
    const confidence = totalRequirements > 0 ? matchCount / totalRequirements : 0;

    return {
        isMatch: violations.filter(v => v.severity === 'error').length === 0,
        violations,
        confidence,
    };
}
```

---

## 6. 需求变更流程

### 6.1 变更请求

```typescript
interface ChangeRequest {
    requestId: string;
    requirementId: string;
    requestedBy: string;             // 请求的 Agent
    reason: string;                  // 变更原因
    proposedChanges: ProposedChange[];
    impact: ImpactAnalysis;
}

interface ProposedChange {
    type: 'add' | 'remove' | 'modify';
    target: 'entity' | 'constraint' | 'criteria';
    currentValue: string;
    proposedValue: string;
}

interface ImpactAnalysis {
    affectsImplementation: boolean;
    estimatedEffort: 'low' | 'medium' | 'high';
    risks: string[];
}
```

### 6.2 变更审批

```mermaid
stateDiagram-v2
    [*] --> Pending: 提交变更请求
    Pending --> Evaluating: Product Owner 评估
    Evaluating --> UserApproval: 涉及核心需求
    Evaluating --> Approved: 轻微变更
    Evaluating --> Rejected: 理由充分
    UserApproval --> Approved: 用户同意
    UserApproval --> Rejected: 用户拒绝
    Approved --> Applied: 应用变更
    Rejected --> [*]
    Applied --> [*]
```

### 6.3 变更执行

```typescript
class RequirementManager {
    private lockedRequirements: Map<string, LockedRequirement>;

    async requestChange(request: ChangeRequest): Promise<void> {
        const requirement = this.lockedRequirements.get(request.requirementId);

        // 评估影响
        const impact = this.assessImpact(request, requirement);

        // 涉及核心需求，需要用户确认
        if (impact.affectsCore) {
            await this.notifyUser(request, impact);
            return;
        }

        // Product Owner 审批
        const approved = await this.productOwnerReview(request);
        if (approved) {
            await this.applyChange(request, requirement);
        }
    }

    private async notifyUser(request: ChangeRequest, impact: ImpactAnalysis): Promise<void> {
        // 通知用户并等待确认
        const message = `
检测到需求变更请求：

原因：${request.reason}

拟议变更：
${request.proposedChanges.map(c => `- ${c.target}: ${c.currentValue} → ${c.proposedValue}`).join('\n')}

影响评估：
${impact.risks.map(r => `- ${r}`).join('\n')}

此变更涉及核心需求，需要您的确认是否同意。
        `;
        // 发送通知...
    }

    private async applyChange(
        request: ChangeRequest,
        requirement: LockedRequirement
    ): Promise<void> {
        const change: RequirementChange = {
            changeId: generateId(),
            requirementId: request.requestId,
            originalContent: JSON.stringify(requirement),
            modifiedContent: JSON.stringify(this.applyChanges(requirement, request)),
            reason: request.reason,
            requestedBy: request.requestedBy,
            approvedBy: 'product-owner',
            approvedAt: new Date().toISOString(),
            version: { from: requirement.version, to: requirement.version + 1 },
        };

        // 更新需求版本
        this.lockedRequirements.set(
            requirement.id,
            this.updateRequirement(requirement, request)
        );
    }
}
```

---

## 7. 实现示例

### 7.1 完整接口定义

```typescript
// ========== 需求捕获 ==========

interface RawRequirement {
    originalText: string;
    timestamp: string;
    userId: string;
    sessionId: string;
}

interface Entity {
    type: 'component' | 'function' | 'data' | 'constraint' | 'outcome';
    name: string;
    attributes: Record<string, any>;
}

interface Constraint {
    category: 'technology' | 'performance' | 'security' | 'compatibility' | 'style';
    description: string;
    priority: 'must' | 'should' | 'could' | 'wont';
}

interface RequirementSummary {
    goal: string;
    entities: Entity[];
    constraints: Constraint[];
    acceptanceCriteria: string[];
}

// ========== 需求锁定 ==========

interface RequirementFingerprint {
    requirementId: string;
    hash: string;
    entities: {
        components: string[];
        functions: string[];
        dataStructures: string[];
    };
    constraints: {
        technologies: string[];
        performance: PerformanceMetric[];
        security: SecurityRequirement[];
    };
    acceptanceCriteria: string[];
    changeHistory: RequirementChange[];
}

interface LockedRequirement {
    id: string;
    version: number;
    rawRequirement: RawRequirement;
    entities: Entity[];
    constraints: Constraint[];
    summary: string;
    acceptanceCriteria: string[];
    fingerprint: RequirementFingerprint;
    lockedAt: string;
    confirmedBy: string;
}

// ========== 需求守护 ==========

interface RequirementAlert {
    alertId: string;
    requirementId: string;
    type: 'modification' | 'deviation' | 'constraint_violation';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    proposedChange: string;
    originalRequirement: string;
    detectedBy: string;
    detectedAt: string;
}

interface ValidationResult {
    isMatch: boolean;
    violations: Violation[];
    confidence: number;
}

interface Violation {
    type: 'missing_entity' | 'constraint_violation' | 'criteria_not_met';
    description: string;
    severity: 'error' | 'warning';
}

// ========== 需求变更 ==========

interface ChangeRequest {
    requestId: string;
    requirementId: string;
    requestedBy: string;
    reason: string;
    proposedChanges: ProposedChange[];
    impact: ImpactAnalysis;
}

interface ProposedChange {
    type: 'add' | 'remove' | 'modify';
    target: 'entity' | 'constraint' | 'criteria';
    currentValue: string;
    proposedValue: string;
}

interface ImpactAnalysis {
    affectsCore: boolean;
    affectsImplementation: boolean;
    estimatedEffort: 'low' | 'medium' | 'high';
    risks: string[];
}

interface RequirementChange {
    changeId: string;
    requirementId: string;
    originalContent: string;
    modifiedContent: string;
    reason: string;
    requestedBy: string;
    approvedBy: string;
    approvedAt: string;
    version: { from: number; to: number };
}

// ========== 核心服务 ==========

interface RequirementLockService {
    // Stage 1: 捕获
    capture(raw: RawRequirement): RequirementSummary;

    // Stage 2: 确认
    confirm(summary: RequirementSummary): LockedRequirement;

    // Stage 3: 守护
    guard(implementation: any, requirement: LockedRequirement): ValidationResult;

    // 变更管理
    requestChange(request: ChangeRequest): Promise<void>;

    // 查询
    getRequirement(id: string): LockedRequirement | null;
    getHistory(id: string): RequirementChange[];
}
```

### 7.2 使用示例

```typescript
// ========== Stage 1: 需求捕获 ==========

const rawRequirement: RawRequirement = {
    originalText: "创建一个用户登录表单，需要包含邮箱和密码输入框，密码需要强度验证，响应时间要在100ms以内",
    timestamp: new Date().toISOString(),
    userId: "user-123",
    sessionId: "session-456",
};

const service = new RequirementLockService();
const summary = service.capture(rawRequirement);

console.log(summary);
// {
//   goal: "创建用户登录表单",
//   entities: [
//     { type: "component", name: "登录表单", ... },
//     { type: "function", name: "密码强度验证", ... },
//     { type: "data", name: "用户凭证", ... }
//   ],
//   constraints: [
//     { category: "performance", description: "响应时间 < 100ms", priority: "must" }
//   ],
//   acceptanceCriteria: [...]
// }

// ========== Stage 2: 需求确认 ==========

// 向用户复述并确认后
const locked = service.confirm(summary);

console.log(locked.id); // "req-abc123"
console.log(locked.fingerprint.hash); // "a1b2c3d4..."

// ========== Stage 3: 需求守护 ==========

const implementation = {
    LoginForm: { /* ... */ },
    PasswordValidator: { /* ... */ },
    // ...
};

const result = service.guard(implementation, locked);

if (!result.isMatch) {
    console.error("需求违反:");
    result.violations.forEach(v => console.error(`- ${v.description}`));

    // 触发警报
    const alert: RequirementAlert = {
        alertId: generateId(),
        requirementId: locked.id,
        type: "deviation",
        severity: "high",
        description: "实现与需求不匹配",
        proposedChange: JSON.stringify(result.violations),
        originalRequirement: locked.summary,
        detectedBy: "team-v4-developer",
        detectedAt: new Date().toISOString(),
    };

    // 通知 product-owner
    await service.notifyProductOwner(alert);
}

// ========== 需求变更 ==========

const changeRequest: ChangeRequest = {
    requestId: generateId(),
    requirementId: locked.id,
    requestedBy: "team-v4-developer",
    reason: "用户要求添加手机号登录选项",
    proposedChanges: [
        {
            type: "add",
            target: "entity",
            currentValue: "",
            proposedValue: "手机号输入框",
        },
        {
            type: "add",
            target: "function",
            currentValue: "",
            proposedValue: "短信验证码验证",
        },
    ],
    impact: {
        affectsCore: true,
        affectsImplementation: true,
        estimatedEffort: "medium",
        risks: ["需要对接短信服务", "需要额外验证码存储"],
    },
};

await service.requestChange(changeRequest);
// → 通知用户确认
```

### 7.3 Agent 集成示例

```typescript
// Agent 执行任务前，先获取锁定需求
class TeamAgent {
    constructor(
        private requirementService: RequirementLockService,
        private agentId: string
    ) {}

    async execute(task: Task): Promise<void> {
        // 1. 获取锁定需求
        const requirement = await this.requirementService.getRequirement(task.requirementId);
        if (!requirement) {
            throw new Error("需求未锁定，无法执行");
        }

        // 2. 验证任务与需求匹配
        const validation = this.validateTask(task, requirement);
        if (!validation.isMatch) {
            // 不匹配，触发警报
            await this.reportDeviation(task, requirement, validation);
            return;
        }

        // 3. 执行任务
        const implementation = await this.implement(task, requirement);

        // 4. 执行后验证
        const result = this.requirementService.guard(implementation, requirement);
        if (!result.isMatch) {
            await this.reportViolation(implementation, requirement, result);
            throw new Error("实现违反需求");
        }

        return implementation;
    }

    private async reportDeviation(
        task: Task,
        requirement: LockedRequirement,
        validation: ValidationResult
    ): Promise<void> {
        const alert: RequirementAlert = {
            alertId: generateId(),
            requirementId: requirement.id,
            type: "deviation",
            severity: validation.violations.some(v => v.severity === "error") ? "high" : "medium",
            description: `任务 ${task.id} 与需求偏离`,
            proposedChange: JSON.stringify(task),
            originalRequirement: requirement.summary,
            detectedBy: this.agentId,
            detectedAt: new Date().toISOString(),
        };

        await this.requirementService.notifyProductOwner(alert);
    }

    private async reportViolation(
        implementation: any,
        requirement: LockedRequirement,
        result: ValidationResult
    ): Promise<void> {
        const alert: RequirementAlert = {
            alertId: generateId(),
            requirementId: requirement.id,
            type: "constraint_violation",
            severity: "critical",
            description: "实现违反需求约束",
            proposedChange: JSON.stringify(implementation),
            originalRequirement: requirement.summary,
            detectedBy: this.agentId,
            detectedAt: new Date().toISOString(),
        };

        await this.requirementService.notifyProductOwner(alert);
    }
}
```

---

## 8. 总结

需求锁定机制通过三个阶段确保 AI 严格遵守用户需求：

1. **捕获（Capture）**：逐字记录原始需求，提取结构化信息
2. **确认（Confirm）**：与用户确认理解，锁定需求版本
3. **守护（Guard）**：监控执行过程，防止需求被篡改

**核心原则**：

> **任何需求的修改都必须经过明确的审批流程，AI 不得擅自调整用户需求。**

---

*文档版本：1.0.0*
*创建日期：2026-02-18*
*参考研究：UC Berkeley "When AI Models Modify User Requirements"*
