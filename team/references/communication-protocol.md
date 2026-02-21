# Agent 通信协议（Communication Protocol）

> 版本：5.0.0 | 更新时间：2026-02-19

---

## ⭐ v5.0 新增：健康检查消息类型

### progress_report（进度报告）

Executor → Supervisor，每 60 秒发送

```typescript
interface ProgressReport {
  type: 'progress_report';
  sender: string;          // Executor ID
  receiver: 'supervisor';
  timestamp: string;
  content: {
    status: 'working' | 'idle' | 'blocked' | 'complete';
    progress_percent: number;  // 0-100
    current_step: string;
    issues: string[] | null;
    eta_minutes: number;
  };
}
```

### health_check（健康询问）

Supervisor → Executor，检测到异常时发送

```typescript
interface HealthCheck {
  type: 'health_check';
  sender: 'supervisor';
  receiver: string;        // Executor ID
  timestamp: string;
  content: {
    reason: 'idle_detected' | 'progress_stale' | 'routine';
    idle_duration: number | null;  // 毫秒
    question: string;              // "你还在正常工作吗？需要帮助吗？"
    options: string[];             // ["继续工作", "需要帮助", "遇到问题"]
  };
}
```

### health_response（健康响应）

Executor → Supervisor，响应健康询问

```typescript
interface HealthResponse {
  type: 'health_response';
  sender: string;          // Executor ID
  receiver: 'supervisor';
  timestamp: string;
  content: {
    status: 'working' | 'blocked' | 'need_help';
    blocker_description: string | null;
    help_needed: string | null;
  };
}
```

### anomaly_report（异常报告）

Supervisor → Coordinator，报告严重异常

```typescript
interface AnomalyReport {
  type: 'anomaly_report';
  sender: 'supervisor';
  receiver: 'coordinator';
  timestamp: string;
  content: {
    executor_id: string;
    anomaly_type: 'idle' | 'error' | 'timeout' | 'mcp_stuck';
    severity: 'warning' | 'critical';
    details: string;
    recommendation: 'continue' | 'assist' | 'restart' | 'replan';
  };
}
```

### adjustment_decision（调整决策）

Coordinator → Supervisor，决策如何处理异常

```typescript
interface AdjustmentDecision {
  type: 'adjustment_decision';
  sender: 'coordinator';
  receiver: 'supervisor';
  timestamp: string;
  content: {
    action: 'continue' | 'assist' | 'restart' | 'replan';
    new_executor_spec: object | null;  // 如需派发新成员
    reason: string;
  };
}
```

### health_report（健康报告）

Supervisor → Coordinator，定期报告

```typescript
interface HealthReport {
  type: 'health_report';
  sender: 'supervisor';
  receiver: 'coordinator';
  timestamp: string;
  content: {
    members: Array<{
      id: string;
      status: 'working' | 'idle' | 'blocked';
      health: 'healthy' | 'warning' | 'critical';
      last_update: string;
    }>;
    summary: {
      total: number;
      healthy: number;
      warning: number;
      critical: number;
    };
  };
}
```

---

## 1. 概述

### 1.1 背景与问题

根据伯克利研究（2025）发现，Multi-Agent 系统中 **32% 的失败源于 Agent 间沟通问题**，表现为：

- **"鸡同鸭讲"**：程序员和架构师对话7轮毫无进展
- **信息隐瞒**：明知API文档有误却不敢质疑
- **理解偏差**：对同一术语有不同理解

### 1.2 协议目标

1. **消除歧义**：标准化消息格式，避免误解
2. **可追溯**：所有消息可追踪和审计
3. **高效协作**：减少无效沟通，提高决策效率
4. **权限清晰**：明确谁可以发送什么消息给谁

---

## 2. 消息格式定义

### 2.1 核心消息结构

```typescript
interface AgentMessage {
  id: string;              // 唯一消息 ID
  timestamp: string;       // ISO 8601 时间戳
  sender: AgentInfo;       // 发送者信息
  receiver: string | 'broadcast';  // 接收者
  type: MessageType;       // 消息类型
  subject: string;         // 主题（≤50字符）
  content: string;         // 详细内容（Markdown）
  attachments?: Attachment[];  // 附件
  taskId: string;          // 关联任务 ID
  relatedRequirements: string[];  // 关联需求
  confidence: number;      // 置信度 0-1
  expectResponse: boolean; // 是否需要响应
  deadline?: string;       // 响应截止时间
  priority: 'low' | 'normal' | 'high' | 'critical';
}

type MessageType =
  | 'status_update'     // 状态更新
  | 'request_input'     // 请求输入
  | 'provide_output'    // 提供输出
  | 'raise_issue'       // 提出问题
  | 'request_review'    // 请求审查
  | 'provide_feedback'  // 提供反馈
  | 'alert'             // 警报
  | 'handoff';          // 交接
```

---

## 3. 消息类型详解

### 3.1 status_update（状态更新）
定期报告进度，不期望响应

### 3.2 request_input（请求输入）
请求其他 Agent 或用户提供信息

### 3.3 raise_issue（提出问题）
遇到阻塞，需要帮助

### 3.4 alert（警报）
严重问题，需要立即关注（如需求偏离）

### 3.5 request_review（请求审查）
请求代码或方案审查

### 3.6 provide_feedback（提供反馈）
对审查或问题提供反馈

### 3.7 handoff（交接）
任务或职责交接

---

## 4. 消息优先级

| 优先级 | 响应时间 | 使用场景 |
|--------|----------|----------|
| low | 24小时内 | 常规信息 |
| normal | 4小时内 | 日常协作 |
| high | 1小时内 | 阻塞问题 |
| critical | 立即 | 严重错误 |

---

## 5. 通信频率控制

| 消息类型 | 最小间隔 | 最大频率 |
|----------|----------|----------|
| status_update | 5 分钟 | 12 次/小时 |
| raise_issue | 无限制 | 无限制 |
| alert | 无限制 | 无限制 |
| request_review | 10 分钟 | 6 次/小时 |

---

## 6. 权限矩阵

| 角色 | 可发送消息类型 |
|------|----------------|
| product-owner | status_update, request_input, provide_feedback, alert, handoff |
| architect | status_update, request_input, provide_output, provide_feedback, alert, handoff |
| developer | status_update, request_input, provide_output, raise_issue, request_review, handoff |
| reviewer | status_update, provide_feedback, alert |
| verifier | status_update, provide_output, alert |

---

*文档版本：1.0.0*
*创建日期：2026-02-18*
