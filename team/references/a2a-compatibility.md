# A2A 协议兼容层

> ⚠️ **重要声明**：此处的 A2A 协议实现仅为**概念借鉴和格式规范**，完全不涉及修改 Claude Code 底层代码。
>
> - ✅ 只修改 SKILL.md 和相关引用文件
> - ✅ 只使用标准的 Task、SendMessage 等工具
> - ✅ 目的是让 Agent 通信更标准化，为未来兼容预留接口
> - ❌ 不修改任何 Claude Code 源码
> - ❌ 不涉及任何底层协议实现

---

## A2A 核心概念

Google 于 2025 年推出的 Agent2Agent Protocol 定义了以下核心概念：

| 概念 | 说明 | Skill 层映射 |
|------|------|-------------|
| **Agent Card** | Agent 的能力描述卡 | Agent 的 prompt 中的角色定义 |
| **Task** | 任务单元 | Task 工具创建的子任务 |
| **Message** | 消息传递 | SendMessage 工具发送的消息 |
| **Part** | 多模态内容片段 | 消息中的内容块 |

---

## Agent Card 规范

每个 Agent 生成时附带 Agent Card：

```javascript
// Agent Card 模板
const agentCard = {
  // 基本信息
  name: "backend-developer",
  description: "后端开发专家，擅长 API 设计和数据库建模",
  version: "1.0.0",

  // 能力描述
  capabilities: {
    skills: [
      "API 设计",
      "数据库建模",
      "业务逻辑实现",
      "性能优化"
    ],
    tools: ["Read", "Edit", "Bash"],
    languages: ["TypeScript", "Python", "Go"],
    frameworks: ["Express", "NestJS", "Fastify"]
  },

  // 端点（概念性，用于标准化）
  endpoints: {
    task: "/agents/backend/task",
    status: "/agents/backend/status",
    cancel: "/agents/backend/cancel"
  },

  // 支持的交互模式
  interactionModes: {
    streaming: true,
    async: true,
    multimodal: false
  },

  // 依赖的其他 Agent（用于拓扑构建）
  dependencies: ["database-designer"],

  // 元数据
  metadata: {
    createdBy: "team-skill",
    createdAt: "2026-02-16T10:00:00Z",
    topology: "star"
  }
};

// 创建 Agent 时生成 Agent Card
Task({
  description: "生成后端开发 Agent",
  prompt: `你是 backend-developer。

## Agent Card
${JSON.stringify(agentCard, null, 2)}

## 你的任务
${taskDescription}

## 输出格式要求
请按照 A2A 协议格式输出：
1. 任务状态 (pending/working/completed/failed)
2. 产出物 (artifacts)
3. 执行历史 (history)`,
  subagent_type: "general-purpose",
  name: "backend-developer"
});
```

---

## Task 标准格式

A2A 风格的 Task 结构：

```javascript
// A2A Task 结构
const a2aTask = {
  // 任务标识
  id: "task-uuid-123",
  sessionId: "session-uuid-456",

  // 任务状态
  status: "working", // pending/working/input-required/completed/canceled/failed

  // 任务元数据
  metadata: {
    createdAt: "2026-02-16T10:00:00Z",
    startedAt: "2026-02-16T10:01:00Z",
    completedAt: null,
    estimatedDuration: 1800, // 秒
  },

  // 任务历史（消息记录）
  history: [
    {
      role: "user",
      parts: [{ type: "text", content: "实现用户登录 API" }]
    },
    {
      role: "agent",
      parts: [{ type: "text", content: "正在设计 API 接口..." }],
      timestamp: "2026-02-16T10:05:00Z"
    }
  ],

  // 产出物
  artifacts: [
    {
      name: "api-spec.json",
      type: "application/json",
      content: "...",
      createdAt: "2026-02-16T10:15:00Z"
    },
    {
      name: "implementation.ts",
      type: "text/typescript",
      content: "...",
      createdAt: "2026-02-16T10:30:00Z"
    }
  ],

  // 状态更新流（用于长时间任务）
  statusUpdates: [
    {
      status: "working",
      message: "正在设计数据库 Schema",
      timestamp: "2026-02-16T10:10:00Z",
      percentComplete: 30
    }
  ]
};
```

---

## Message 标准格式

A2A 风格的消息结构：

```javascript
// A2A Message 结构
const a2aMessage = {
  // 消息标识
  id: "msg-uuid-789",
  taskId: "task-uuid-123",

  // 发送者和接收者
  sender: "backend-developer",
  recipient: "tech-lead",

  // 时间戳
  timestamp: "2026-02-16T10:15:00Z",

  // 消息内容（Parts）
  parts: [
    {
      type: "text",
      content: "API 设计完成，等待评审"
    },
    {
      type: "data",
      content: {
        apiEndpoints: ["/api/login", "/api/logout"],
        estimatedComplexity: "medium"
      }
    },
    {
      type: "file",
      filename: "api-design.md",
      mimeType: "text/markdown",
      content: "..."
    }
  ],

  // 消息元数据
  metadata: {
    priority: "high",
    requiresResponse: true,
    responseDeadline: "2026-02-16T10:30:00Z"
  }
};

// 使用 SendMessage 发送 A2A 格式消息
SendMessage({
  type: "message",
  recipient: "tech-lead",
  content: JSON.stringify(a2aMessage, null, 2),
  summary: "[A2A] API设计完成待评审"
});
```

---

## 标准 Part 类型

```javascript
// A2A 标准 Part 类型
const partTypes = {
  // 文本内容
  TEXT: {
    type: "text",
    content: "纯文本内容"
  },

  // 文件
  FILE: {
    type: "file",
    filename: "example.ts",
    mimeType: "text/typescript",
    content: "文件内容或路径"
  },

  // 结构化数据
  DATA: {
    type: "data",
    content: {
      key: "value",
      nested: { ... }
    }
  },

  // 代码
  CODE: {
    type: "code",
    language: "typescript",
    content: "console.log('hello');",
    filename: "example.ts"
  },

  // 错误信息
  ERROR: {
    type: "error",
    code: "FILE_NOT_FOUND",
    message: "文件不存在",
    stack: "...",
    recoverable: true
  },

  // 状态更新
  STATUS: {
    type: "status",
    status: "working",
    percentComplete: 50,
    message: "正在处理..."
  }
};
```

---

## Skill 层集成示例

```javascript
// 完整的 A2A 风格任务流程

// 1. 创建 Agent 并生成 Agent Card
const agentCard = generateAgentCard({
  name: "security-reviewer",
  role: "security",
  skills: ["漏洞检测", "代码审计"]
});

// 2. 创建 A2A 格式 Task
const task = createA2aTask({
  id: generateUUID(),
  description: "审查登录功能安全性",
  assignee: "security-reviewer",
  artifacts: [{ name: "login.ts", content: "..." }]
});

// 3. 发送 A2A 格式消息
SendMessage({
  type: "message",
  recipient: "security-reviewer",
  content: JSON.stringify({
    type: "a2a-task-assignment",
    task: task,
    agentCard: agentCard
  }),
  summary: "[A2A] 分配安全审查任务"
});

// 4. 接收 A2A 格式响应
// Agent 返回：
const response = {
  type: "a2a-task-update",
  taskId: task.id,
  status: "completed",
  artifacts: [
    {
      name: "security-report.md",
      type: "text/markdown",
      content: "..."
    }
  ],
  summary: {
    issuesFound: 2,
    severity: "medium"
  }
};
```

---

## 未来兼容说明

当 Claude Code 或其他平台支持 A2A 协议时，本 Skill 可以无缝迁移：

```javascript
// 当前：Skill 层模拟
SendMessage({
  type: "message",
  recipient: "other-agent",
  content: JSON.stringify(a2aMessage)
});

// 未来：真正的 A2A 协议
A2aClient.sendMessage({
  targetAgent: "other-agent",
  message: a2aMessage
});
```

**好处**：
1. 现在：标准化的内部通信格式
2. 未来：可直接对接外部 A2A Agent
3. 零迁移成本：只需切换底层实现
