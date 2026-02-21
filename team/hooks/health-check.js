#!/usr/bin/env node
/**
 * Team Skill - Health Check System
 * v6.0 完整可靠性保障组件
 *
 * 功能：
 * 1. 每 30 秒检查所有 Executor 状态
 * 2. 检测异常（空闲、卡住、错误、MCP超时）
 * 3. 发送实际消息（通过状态文件）
 * 4. 超时后报告异常并执行强制终止
 *
 * 使用方式：
 * node health-check.js --team <team_name> [--interval 30]
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// 导入资源监控器
let ResourceMonitor;
try {
  ResourceMonitor = require('./resource-monitor');
} catch (error) {
  console.warn('[Health Check] 资源监控器未加载:', error.message);
}

// 消息状态枚举
const MessageStatus = {
  PENDING: 'pending',       // 消息创建，等待发送
  SENT: 'sent',             // 消息已发送
  DELIVERED: 'delivered',   // 消息已送达接收方
  ACKNOWLEDGED: 'acknowledged', // 消息已被接收方确认消费
  FAILED: 'failed',         // 消息发送失败
  EXPIRED: 'expired',       // 消息超时过期
};

// 配置
const CONFIG = {
  healthCheckInterval: 30 * 1000,    // 30 秒
  idleWarningThreshold: 2 * 60 * 1000,  // 2 分钟
  idleTimeoutThreshold: 5 * 60 * 1000,  // 5 分钟
  progressStaleThreshold: 2 * 60 * 1000, // 2 分钟
  mcpCallTimeout: 30 * 1000,         // 30 秒 MCP调用超时
  mcpStuckThreshold: 60 * 1000,      // 60 秒 MCP卡住阈值
  gracefulShutdownTimeout: 30 * 1000, // 30 秒优雅关闭
  forceKillTimeout: 60 * 1000,       // 60 秒强制终止
  maxRetries: 3,                     // 最大重试次数
  messageTimeout: 60 * 1000,         // 消息超时时间（60秒）
  messageRetryInterval: 10 * 1000,   // 消息重试间隔（10秒）
  maxMessageRetries: 3,              // 消息最大重试次数
};

// 状态存储
const state = {
  teamName: null,
  teamMembers: new Map(),
  lastProgressUpdate: new Map(),
  mcpCallStartTime: new Map(),      // MCP调用开始时间（主动注册）
  mcpCallTool: new Map(),           // 当前MCP调用的工具（主动注册）
  anomalies: [],
  checkCount: 0,
  activeIntervals: [],
  isRunning: false,

  // 被动检测状态
  passiveCheckState: new Map(),     // 成员被动检测状态
  lastOutputs: new Map(),           // 上次检查的输出内容
  outputTimestamps: new Map(),      // 输出内容时间戳
  runningStateStartTime: new Map(), // "Running…"状态开始时间
  possibleMCPStuck: new Map(),      // 可能的MCP卡住标记

  // 消息追踪相关
  messageStore: new Map(),          // 消息存储 (messageId -> messageData)
  pendingMessages: new Set(),       // 待确认消息ID集合
  messageCallbacks: new Map(),      // 消息回调 (messageId -> callback)
};

// 被动检测配置
const PASSIVE_CONFIG = {
  runningStateThreshold: 30 * 1000,    // "Running…"超过30秒视为可疑
  outputStuckThreshold: 45 * 1000,     // 输出停滞超过45秒视为可疑
  noOutputThreshold: 60 * 1000,        // 无输出超过60秒视为可疑
  suspiciousKeywords: [                // 可疑关键词列表
    'Running…',
    'Running...',
    '⎿  Running',
    'Pending…',
    'Pending...',
    '⏳',
    '等待中',
    '处理中...',
  ],
  mcpToolPatterns: [                   // MCP工具调用模式
    /mcp__\w+/,
    /MCP\s*调用/,
    /调用.*MCP/,
    /正在使用.*工具/,
  ],
};

// 团队状态目录
function getTeamStateDir() {
  return path.join(process.env.HOME, '.claude', 'tasks', state.teamName || 'default');
}

// 确保状态目录存在
function ensureStateDir() {
  const dir = getTeamStateDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// 获取成员状态文件路径
function getMemberStatePath(memberId) {
  return path.join(ensureStateDir(), `${memberId}.state.json`);
}

// 获取消息队列文件路径
function getMessageQueuePath() {
  return path.join(ensureStateDir(), 'message-queue.json');
}

// 获取消息存储文件路径
function getMessageStorePath() {
  return path.join(ensureStateDir(), 'message-store.json');
}

// 获取消息统计报告路径
function getMessageReportPath() {
  return path.join(ensureStateDir(), 'message-report.json');
}

// 读取成员状态
function readMemberState(memberId) {
  try {
    const statePath = getMemberStatePath(memberId);
    if (fs.existsSync(statePath)) {
      const data = fs.readFileSync(statePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`[Health Check] 读取成员状态失败 ${memberId}:`, error.message);
  }
  return null;
}

// 写入成员状态
function writeMemberState(memberId, memberState) {
  try {
    const statePath = getMemberStatePath(memberId);
    fs.writeFileSync(statePath, JSON.stringify(memberState, null, 2));
  } catch (error) {
    console.error(`[Health Check] 写入成员状态失败 ${memberId}:`, error.message);
  }
}

// 持久化消息存储
function persistMessageStore() {
  try {
    const storePath = getMessageStorePath();
    const storeData = {
      timestamp: new Date().toISOString(),
      messages: Array.from(state.messageStore.entries()).map(([id, msg]) => ({
        id,
        ...msg,
      })),
    };
    fs.writeFileSync(storePath, JSON.stringify(storeData, null, 2));
  } catch (error) {
    console.error('[Health Check] 持久化消息存储失败:', error.message);
  }
}

// 加载消息存储
function loadMessageStore() {
  try {
    const storePath = getMessageStorePath();
    if (fs.existsSync(storePath)) {
      const data = fs.readFileSync(storePath, 'utf8');
      const storeData = JSON.parse(data);
      if (storeData.messages) {
        storeData.messages.forEach(msg => {
          const { id, ...msgData } = msg;
          state.messageStore.set(id, msgData);
          if (msgData.status === MessageStatus.PENDING ||
              msgData.status === MessageStatus.SENT ||
              msgData.status === MessageStatus.DELIVERED) {
            state.pendingMessages.add(id);
          }
        });
      }
    }
  } catch (error) {
    console.error('[Health Check] 加载消息存储失败:', error.message);
  }
}

// 生成消息ID
function generateMessageId() {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 发送消息（增强版，带状态追踪）
function sendMessage(message, options = {}) {
  try {
    const messageId = message.id || generateMessageId();
    const timestamp = Date.now();

    // 构建完整消息对象
    const fullMessage = {
      ...message,
      id: messageId,
      timestamp: new Date(timestamp).toISOString(),
      timestampMs: timestamp,
      status: MessageStatus.PENDING,
      retryCount: 0,
      deliverAttempts: [],
      requireAcknowledgment: options.requireAcknowledgment !== false, // 默认需要确认
      ackDeadline: timestamp + CONFIG.messageTimeout,
    };

    // 存储到内存
    state.messageStore.set(messageId, fullMessage);
    state.pendingMessages.add(messageId);

    // 如果有回调，注册回调
    if (options.onAcknowledged && typeof options.onAcknowledged === 'function') {
      state.messageCallbacks.set(messageId, options.onAcknowledged);
    }

    // 写入消息队列
    const queuePath = getMessageQueuePath();
    let queue = [];
    if (fs.existsSync(queuePath)) {
      const data = fs.readFileSync(queuePath, 'utf8');
      queue = JSON.parse(data);
    }

    // 创建队列消息（不包含内部状态）
    const queueMessage = {
      id: messageId,
      type: message.type,
      sender: message.sender,
      receiver: message.receiver,
      content: message.content,
      timestamp: fullMessage.timestamp,
      requireAcknowledgment: fullMessage.requireAcknowledgment,
    };

    queue.push(queueMessage);
    fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));

    // 更新消息状态为已发送
    updateMessageStatus(messageId, MessageStatus.SENT, {
      sentAt: timestamp,
    });

    console.log(`[Health Check] 消息已发送: ${messageId} (${message.type} -> ${message.receiver || 'broadcast'})`);

    // 持久化消息存储
    persistMessageStore();

    return {
      success: true,
      messageId,
      status: MessageStatus.SENT,
    };
  } catch (error) {
    console.error('[Health Check] 发送消息失败:', error.message);

    // 标记为失败
    if (message.id) {
      updateMessageStatus(message.id, MessageStatus.FAILED, {
        error: error.message,
        failedAt: Date.now(),
      });
    }

    return {
      success: false,
      error: error.message,
      status: MessageStatus.FAILED,
    };
  }
}

// 更新消息状态
function updateMessageStatus(messageId, newStatus, metadata = {}) {
  const message = state.messageStore.get(messageId);
  if (!message) {
    console.warn(`[Health Check] 尝试更新不存在消息的状态: ${messageId}`);
    return false;
  }

  const oldStatus = message.status;
  message.status = newStatus;
  message.lastStatusChange = Date.now();

  // 添加状态历史
  if (!message.statusHistory) {
    message.statusHistory = [];
  }
  message.statusHistory.push({
    from: oldStatus,
    to: newStatus,
    timestamp: Date.now(),
    ...metadata,
  });

  // 合并元数据
  Object.assign(message, metadata);

  // 更新pending集合
  if (newStatus === MessageStatus.ACKNOWLEDGED ||
      newStatus === MessageStatus.FAILED ||
      newStatus === MessageStatus.EXPIRED) {
    state.pendingMessages.delete(messageId);

    // 执行回调
    if (newStatus === MessageStatus.ACKNOWLEDGED) {
      const callback = state.messageCallbacks.get(messageId);
      if (callback) {
        try {
          callback(message);
        } catch (error) {
          console.error(`[Health Check] 消息回调执行失败: ${messageId}`, error.message);
        }
        state.messageCallbacks.delete(messageId);
      }
    }
  }

  // 持久化
  persistMessageStore();

  console.log(`[Health Check] 消息状态更新: ${messageId} ${oldStatus} -> ${newStatus}`);
  return true;
}

// 确认收到消息（由Agent调用）
function acknowledgeMessage(messageId, ackType = 'acknowledged', ackData = {}) {
  const message = state.messageStore.get(messageId);
  if (!message) {
    console.warn(`[Health Check] 确认失败，消息不存在: ${messageId}`);
    return {
      success: false,
      error: 'Message not found',
    };
  }

  // 根据确认类型更新状态
  let newStatus;
  if (ackType === 'delivered') {
    newStatus = MessageStatus.DELIVERED;
  } else if (ackType === 'acknowledged') {
    newStatus = MessageStatus.ACKNOWLEDGED;
  } else {
    newStatus = MessageStatus.ACKNOWLEDGED;
  }

  updateMessageStatus(messageId, newStatus, {
    acknowledgedAt: Date.now(),
    acknowledgedBy: ackData.agentId || 'unknown',
    ackType,
    ...ackData,
  });

  console.log(`[Health Check] 消息已确认: ${messageId} (${ackType})`);

  return {
    success: true,
    messageId,
    status: newStatus,
  };
}

// 查询消息状态
function checkMessageStatus(messageId) {
  const message = state.messageStore.get(messageId);
  if (!message) {
    return {
      exists: false,
      error: 'Message not found',
    };
  }

  return {
    exists: true,
    messageId,
    status: message.status,
    type: message.type,
    sender: message.sender,
    receiver: message.receiver,
    createdAt: message.timestampMs,
    lastStatusChange: message.lastStatusChange,
    retryCount: message.retryCount || 0,
    statusHistory: message.statusHistory || [],
    isPending: state.pendingMessages.has(messageId),
  };
}

// 重试失败消息
function retryFailedMessages(messageIds = null) {
  const results = {
    attempted: 0,
    succeeded: 0,
    failed: 0,
    details: [],
  };

  // 确定要重试的消息
  const messagesToRetry = messageIds
    ? messageIds.filter(id => state.messageStore.has(id))
    : Array.from(state.messageStore.keys()).filter(id => {
        const msg = state.messageStore.get(id);
        return msg.status === MessageStatus.FAILED ||
               msg.status === MessageStatus.EXPIRED;
      });

  for (const messageId of messagesToRetry) {
    results.attempted++;
    const message = state.messageStore.get(messageId);

    // 检查重试次数
    if (message.retryCount >= CONFIG.maxMessageRetries) {
      results.details.push({
        messageId,
        success: false,
        error: 'Max retries exceeded',
      });
      results.failed++;
      continue;
    }

    // 执行重试
    try {
      message.retryCount++;
      message.lastRetryAt = Date.now();

      // 重新发送到队列
      const queuePath = getMessageQueuePath();
      let queue = [];
      if (fs.existsSync(queuePath)) {
        const data = fs.readFileSync(queuePath, 'utf8');
        queue = JSON.parse(data);
      }

      const queueMessage = {
        id: messageId,
        type: message.type,
        sender: message.sender,
        receiver: message.receiver,
        content: message.content,
        timestamp: new Date().toISOString(),
        requireAcknowledgment: message.requireAcknowledgment,
        isRetry: true,
        retryCount: message.retryCount,
      };

      queue.push(queueMessage);
      fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));

      // 重置状态为PENDING
      updateMessageStatus(messageId, MessageStatus.PENDING, {
        retriedAt: Date.now(),
        retryCount: message.retryCount,
      });

      // 重新标记为SENT
      updateMessageStatus(messageId, MessageStatus.SENT, {
        resentAt: Date.now(),
      });

      results.details.push({
        messageId,
        success: true,
        retryCount: message.retryCount,
      });
      results.succeeded++;

      console.log(`[Health Check] 消息重试成功: ${messageId} (第${message.retryCount}次)`);
    } catch (error) {
      results.details.push({
        messageId,
        success: false,
        error: error.message,
      });
      results.failed++;
      console.error(`[Health Check] 消息重试失败: ${messageId}`, error.message);
    }
  }

  return results;
}

// 检查消息超时
function checkMessageTimeouts() {
  const now = Date.now();
  const expiredMessages = [];

  for (const messageId of state.pendingMessages) {
    const message = state.messageStore.get(messageId);
    if (!message) continue;

    const isTimeout = now > message.ackDeadline;
    const shouldRetry = message.retryCount < CONFIG.maxMessageRetries;

    if (isTimeout) {
      if (shouldRetry) {
        // 自动重试
        console.log(`[Health Check] 消息超时，自动重试: ${messageId}`);
        retryFailedMessages([messageId]);
      } else {
        // 标记为过期
        updateMessageStatus(messageId, MessageStatus.EXPIRED, {
          expiredAt: now,
          reason: 'Timeout and max retries exceeded',
        });
        expiredMessages.push(messageId);

        // 发送超时通知
        sendMessage({
          type: 'message_expired',
          sender: 'supervisor',
          receiver: 'coordinator',
          content: {
            originalMessageId: messageId,
            originalType: message.type,
            originalReceiver: message.receiver,
            expiredAt: new Date().toISOString(),
            retryCount: message.retryCount,
          },
        }, { requireAcknowledgment: false });
      }
    }
  }

  if (expiredMessages.length > 0) {
    console.log(`[Health Check] 发现 ${expiredMessages.length} 条过期消息`);
  }

  return expiredMessages;
}

// 生成消息送达率报告
function generateMessageReport() {
  const report = {
    timestamp: new Date().toISOString(),
    teamName: state.teamName,
    summary: {
      total: state.messageStore.size,
      pending: 0,
      sent: 0,
      delivered: 0,
      acknowledged: 0,
      failed: 0,
      expired: 0,
      deliveryRate: 0,
      acknowledgmentRate: 0,
    },
    recentMessages: [],
    failedMessages: [],
    expiredMessages: [],
  };

  for (const [messageId, message] of state.messageStore) {
    switch (message.status) {
      case MessageStatus.PENDING:
        report.summary.pending++;
        break;
      case MessageStatus.SENT:
        report.summary.sent++;
        break;
      case MessageStatus.DELIVERED:
        report.summary.delivered++;
        break;
      case MessageStatus.ACKNOWLEDGED:
        report.summary.acknowledged++;
        break;
      case MessageStatus.FAILED:
        report.summary.failed++;
        report.failedMessages.push({
          messageId,
          type: message.type,
          receiver: message.receiver,
          failedAt: message.failedAt,
          error: message.error,
        });
        break;
      case MessageStatus.EXPIRED:
        report.summary.expired++;
        report.expiredMessages.push({
          messageId,
          type: message.type,
          receiver: message.receiver,
          expiredAt: message.expiredAt,
          retryCount: message.retryCount,
        });
        break;
    }
  }

  // 计算送达率和确认率
  const completedMessages = report.summary.delivered +
                            report.summary.acknowledged +
                            report.summary.failed +
                            report.summary.expired;

  if (completedMessages > 0) {
    report.summary.deliveryRate = ((report.summary.delivered + report.summary.acknowledged) /
                                   completedMessages * 100).toFixed(2);
    report.summary.acknowledgmentRate = (report.summary.acknowledged /
                                         completedMessages * 100).toFixed(2);
  }

  // 获取最近的消息（最近20条）
  const sortedMessages = Array.from(state.messageStore.entries())
    .sort((a, b) => b[1].timestampMs - a[1].timestampMs)
    .slice(0, 20);

  report.recentMessages = sortedMessages.map(([id, msg]) => ({
    messageId: id,
    type: msg.type,
    receiver: msg.receiver,
    status: msg.status,
    timestamp: msg.timestamp,
    retryCount: msg.retryCount || 0,
  }));

  return report;
}

// 保存消息报告
function saveMessageReport(report) {
  try {
    const reportPath = getMessageReportPath();
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  } catch (error) {
    console.error('[Health Check] 保存消息报告失败:', error.message);
  }
}

// 注册 MCP 调用开始
function registerMCPCallStart(memberId, toolName) {
  state.mcpCallStartTime.set(memberId, Date.now());
  state.mcpCallTool.set(memberId, toolName);
  console.log(`[Health Check] 成员 ${memberId} 开始 MCP 调用: ${toolName}`);
}

// 注册 MCP 调用结束
function registerMCPCallEnd(memberId) {
  state.mcpCallStartTime.delete(memberId);
  state.mcpCallTool.delete(memberId);
}

// ==================== 被动健康检查 ====================

/**
 * 被动健康检查 - 不依赖Agent主动注册
 * 通过检查TaskOutput等输出来检测可能的MCP卡住
 * @param {string} memberId - 成员ID
 * @returns {object} 检查结果
 */
async function passiveHealthCheck(memberId) {
  const now = Date.now();
  const memberState = state.teamMembers.get(memberId);

  if (!memberState) {
    return { status: 'unknown', reason: 'member_not_found' };
  }

  // 跳过正在终止的成员
  if (memberState.status === 'terminating' || memberState.status === 'terminated') {
    return { status: 'skipped', reason: 'member_terminating' };
  }

  console.log(`[Health Check] 开始被动检查: ${memberId}`);

  // 获取或初始化被动检测状态
  let passiveState = state.passiveCheckState.get(memberId);
  if (!passiveState) {
    passiveState = {
      memberId,
      firstCheckTime: now,
      lastCheckTime: now,
      runningStateDetected: false,
      runningStateStartTime: null,
      suspiciousCount: 0,
      confirmedStuck: false,
    };
    state.passiveCheckState.set(memberId, passiveState);
  }

  // 获取当前输出（从状态文件或其他来源）
  const currentOutput = await fetchMemberOutput(memberId);
  const lastOutput = state.lastOutputs.get(memberId);

  // 检测结果
  const detection = {
    memberId,
    timestamp: now,
    hasRunningState: false,
    runningDuration: 0,
    outputChanged: false,
    hasNewOutput: false,
    suspiciousKeywords: [],
    possibleMCPStuck: false,
    confidence: 0, // 置信度 0-100
  };

  // 1. 检测"Running…"状态
  if (currentOutput) {
    detection.hasRunningState = detectRunningState(currentOutput);
    detection.suspiciousKeywords = extractSuspiciousKeywords(currentOutput);

    // 如果检测到Running状态
    if (detection.hasRunningState) {
      const runningStartTime = state.runningStateStartTime.get(memberId);

      if (!runningStartTime) {
        // 首次检测到Running状态
        state.runningStateStartTime.set(memberId, now);
        detection.runningDuration = 0;
        console.log(`[Passive Check] ${memberId}: 首次检测到 Running 状态`);
      } else {
        // 计算Running持续时间
        detection.runningDuration = now - runningStartTime;

        // 超过阈值，标记为可疑
        if (detection.runningDuration > PASSIVE_CONFIG.runningStateThreshold) {
          detection.possibleMCPStuck = true;
          passiveState.suspiciousCount++;

          // 计算置信度（持续时间越长，置信度越高）
          detection.confidence = Math.min(100,
            50 + (detection.runningDuration - PASSIVE_CONFIG.runningStateThreshold) / 1000 * 5
          );

          console.log(`[Passive Check] ${memberId}: Running 状态持续 ${Math.round(detection.runningDuration/1000)}s, ` +
                      `置信度: ${detection.confidence}%`);
        }
      }
    } else {
      // 没有Running状态，清除计时
      if (state.runningStateStartTime.has(memberId)) {
        console.log(`[Passive Check] ${memberId}: Running 状态结束`);
        state.runningStateStartTime.delete(memberId);
      }
    }

    // 2. 检测输出是否变化
    if (lastOutput !== undefined) {
      detection.outputChanged = lastOutput !== currentOutput;
      detection.hasNewOutput = currentOutput.length > (lastOutput?.length || 0);

      // 如果输出长时间未变化，增加可疑度
      if (!detection.outputChanged && !detection.hasRunningState) {
        const lastOutputTime = state.outputTimestamps.get(memberId) || now;
        const timeSinceLastOutput = now - lastOutputTime;

        if (timeSinceLastOutput > PASSIVE_CONFIG.outputStuckThreshold) {
          detection.possibleMCPStuck = true;
          detection.confidence = Math.max(detection.confidence,
            Math.min(80, timeSinceLastOutput / 1000 - 30));

          console.log(`[Passive Check] ${memberId}: 输出停滞 ${Math.round(timeSinceLastOutput/1000)}s`);
        }
      }
    }

    // 3. 保存当前输出
    state.lastOutputs.set(memberId, currentOutput);
    state.outputTimestamps.set(memberId, now);
  } else {
    // 4. 检测长时间无输出
    const lastOutputTime = state.outputTimestamps.get(memberId);
    if (lastOutputTime) {
      const timeSinceLastOutput = now - lastOutputTime;

      if (timeSinceLastOutput > PASSIVE_CONFIG.noOutputThreshold) {
        detection.possibleMCPStuck = true;
        detection.confidence = Math.min(70, timeSinceLastOutput / 1000 - 40);

        console.log(`[Passive Check] ${memberId}: 长时间无输出 (${Math.round(timeSinceLastOutput/1000)}s)`);
      }
    }
  }

  // 更新被动检测状态
  passiveState.lastCheckTime = now;
  passiveState.runningStateDetected = detection.hasRunningState;
  passiveState.runningStateStartTime = state.runningStateStartTime.get(memberId);

  // 如果置信度足够高，标记为可能的MCP卡住
  if (detection.confidence >= 60) {
    state.possibleMCPStuck.set(memberId, {
      detectedAt: now,
      confidence: detection.confidence,
      reason: detection.hasRunningState ? 'running_state_timeout' : 'output_stuck',
      duration: detection.runningDuration || (now - (state.outputTimestamps.get(memberId) || now)),
    });
  }

  // 记录被动检测日志
  logPassiveCheck(memberId, detection);

  return detection;
}

/**
 * 获取成员输出
 * 从状态文件或其他存储位置获取Agent的输出内容
 * @param {string} memberId - 成员ID
 * @returns {string|null} 输出内容
 */
async function fetchMemberOutput(memberId) {
  try {
    // 1. 首先尝试从成员状态文件获取最新输出
    const memberState = readMemberState(memberId);
    if (memberState && memberState.lastOutput) {
      return memberState.lastOutput;
    }

    // 2. 尝试从任务输出文件获取
    const taskOutputPath = path.join(
      process.env.HOME,
      '.claude', 'tasks',
      state.teamName || 'default',
      `${memberId}.output.json`
    );

    if (fs.existsSync(taskOutputPath)) {
      const data = fs.readFileSync(taskOutputPath, 'utf8');
      const output = JSON.parse(data);
      return output.content || output.text || '';
    }

    // 3. 尝试从项目文件获取（子Agent输出）
    const projectOutputPath = path.join(
      process.env.HOME,
      '.claude', 'projects',
      state.teamName || 'default',
      `${memberId}.jsonl`
    );

    if (fs.existsSync(projectOutputPath)) {
      const data = fs.readFileSync(projectOutputPath, 'utf8');
      // 获取最后几行
      const lines = data.trim().split('\n').filter(line => line.trim());
      if (lines.length > 0) {
        const lastLine = lines[lines.length - 1];
        try {
          const entry = JSON.parse(lastLine);
          return entry.output || entry.content || entry.text || lastLine;
        } catch {
          return lastLine;
        }
      }
    }

    // 4. 尝试从debug文件获取
    const debugFiles = fs.readdirSync(path.join(process.env.HOME, '.claude', 'debug'))
      .filter(f => f.includes(memberId) || f.includes(state.teamName || ''));

    for (const debugFile of debugFiles.slice(0, 1)) {
      const debugPath = path.join(process.env.HOME, '.claude', 'debug', debugFile);
      if (fs.existsSync(debugPath)) {
        const data = fs.readFileSync(debugPath, 'utf8');
        // 获取最后1000字符
        return data.slice(-1000);
      }
    }

    return null;
  } catch (error) {
    console.error(`[Passive Check] 获取 ${memberId} 输出失败:`, error.message);
    return null;
  }
}

/**
 * 检测输出中是否包含"Running…"等状态
 * @param {string} output - 输出内容
 * @returns {boolean} 是否包含Running状态
 */
function detectRunningState(output) {
  if (!output || typeof output !== 'string') {
    return false;
  }

  // 检查最后几行是否包含Running状态
  const lines = output.split('\n').filter(line => line.trim());
  const lastLines = lines.slice(-5).join(' ');

  return PASSIVE_CONFIG.suspiciousKeywords.some(keyword =>
    lastLines.includes(keyword) || output.slice(-200).includes(keyword)
  );
}

/**
 * 提取输出中的可疑关键词
 * @param {string} output - 输出内容
 * @returns {string[]} 发现的关键词列表
 */
function extractSuspiciousKeywords(output) {
  if (!output || typeof output !== 'string') {
    return [];
  }

  return PASSIVE_CONFIG.suspiciousKeywords.filter(keyword =>
    output.includes(keyword)
  );
}

/**
 * 检测MCP工具调用模式
 * @param {string} output - 输出内容
 * @returns {boolean} 是否包含MCP调用
 */
function detectMCPPattern(output) {
  if (!output || typeof output !== 'string') {
    return false;
  }

  return PASSIVE_CONFIG.mcpToolPatterns.some(pattern =>
    pattern.test(output)
  );
}

/**
 * 记录被动检测日志
 * @param {string} memberId - 成员ID
 * @param {object} detection - 检测结果
 */
function logPassiveCheck(memberId, detection) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type: 'passive_check',
    memberId,
    ...detection,
  };

  // 输出到控制台
  if (detection.possibleMCPStuck) {
    console.warn(`[Passive Check] ⚠️ ${memberId}: 可能MCP卡住 (置信度: ${detection.confidence}%)`);
    if (detection.hasRunningState) {
      console.warn(`  └─ Running状态持续: ${Math.round(detection.runningDuration/1000)}s`);
    }
    if (!detection.outputChanged) {
      console.warn(`  └─ 输出未变化`);
    }
  }

  // 保存到被动检测日志文件
  try {
    const logPath = path.join(ensureStateDir(), 'passive-check-log.jsonl');
    fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
  } catch (error) {
    // 忽略日志写入错误
  }
}

/**
 * 获取被动检测状态
 * @param {string} memberId - 成员ID（可选，不提供则返回所有）
 * @returns {object} 被动检测状态
 */
function getPassiveCheckState(memberId) {
  if (memberId) {
    return state.passiveCheckState.get(memberId) || null;
  }

  const result = {};
  for (const [id, passiveState] of state.passiveCheckState) {
    result[id] = passiveState;
  }
  return result;
}

/**
 * 清除被动检测状态
 * @param {string} memberId - 成员ID
 */
function clearPassiveCheckState(memberId) {
  state.passiveCheckState.delete(memberId);
  state.lastOutputs.delete(memberId);
  state.outputTimestamps.delete(memberId);
  state.runningStateStartTime.delete(memberId);
  state.possibleMCPStuck.delete(memberId);
  console.log(`[Passive Check] 清除 ${memberId} 的被动检测状态`);
}

// 检查 MCP 超时
async function checkMCPTimeouts() {
  const now = Date.now();
  const stuckMembers = [];

  for (const [memberId, startTime] of state.mcpCallStartTime) {
    const duration = now - startTime;
    const toolName = state.mcpCallTool.get(memberId) || 'unknown';

    if (duration > CONFIG.mcpStuckThreshold) {
      stuckMembers.push({
        memberId,
        toolName,
        duration,
        severity: 'critical',
        type: 'mcp_stuck',
      });
    } else if (duration > CONFIG.mcpCallTimeout) {
      console.log(`[Health Check] 警告: 成员 ${memberId} MCP 调用 ${toolName} 已进行 ${Math.round(duration/1000)}s`);
    }
  }

  // 处理卡住的成员
  for (const stuck of stuckMembers) {
    console.error(`[Health Check] CRITICAL: 成员 ${stuck.memberId} MCP 调用卡住!`);
    console.error(`  工具: ${stuck.toolName}, 持续时间: ${Math.round(stuck.duration/1000)}s`);

    await handleMCPStuck(stuck);
  }

  return stuckMembers;
}

// 处理 MCP 卡住
async function handleMCPStuck(stuck) {
  const { memberId, toolName, duration } = stuck;

  // 1. 发送异常报告给 Coordinator
  sendMessage({
    type: 'anomaly_report',
    sender: 'supervisor',
    receiver: 'coordinator',
    content: {
      executorId: memberId,
      anomalyType: 'mcp_stuck',
      severity: 'critical',
      details: `MCP 调用 ${toolName} 卡住，持续时间: ${Math.round(duration/1000)}秒`,
      recommendation: 'RESTART',
      mcpTool: toolName,
      duration: duration,
    },
  });

  // 2. 尝试强制终止
  await forceTerminate(memberId, 'mcp_stuck');
}

// 强制终止成员
async function forceTerminate(memberId, reason) {
  console.log(`[Health Check] 开始强制终止成员: ${memberId}, 原因: ${reason}`);

  const memberState = state.teamMembers.get(memberId);
  if (!memberState) {
    console.error(`[Health Check] 成员 ${memberId} 不存在`);
    return false;
  }

  // 更新状态为 terminating
  updateMemberState(memberId, { status: 'terminating', terminateReason: reason });

  // 1. 发送优雅关闭请求
  sendMessage({
    type: 'shutdown_request',
    sender: 'supervisor',
    receiver: memberId,
    content: {
      reason: `Health check ${reason} - initiating graceful shutdown`,
      gracefulTimeout: CONFIG.gracefulShutdownTimeout,
    },
  });

  // 2. 等待优雅关闭
  console.log(`[Health Check] 等待 ${CONFIG.gracefulShutdownTimeout/1000}s 进行优雅关闭...`);
  await sleep(CONFIG.gracefulShutdownTimeout);

  // 3. 检查是否已关闭
  const currentState = readMemberState(memberId);
  if (currentState && currentState.status === 'terminated') {
    console.log(`[Health Check] 成员 ${memberId} 已优雅关闭`);
    state.teamMembers.delete(memberId);
    return true;
  }

  // 4. 执行强制终止
  console.log(`[Health Check] 优雅关闭失败，执行强制终止...`);

  // 尝试通过 TaskStop 终止
  try {
    // 这里假设可以通过某种方式获取 task_id 并调用 TaskStop
    // 实际实现可能需要根据具体平台调整
    await executeForceKill(memberId);
  } catch (error) {
    console.error(`[Health Check] 强制终止失败:`, error.message);
  }

  // 5. 标记为已终止
  updateMemberState(memberId, {
    status: 'terminated',
    terminatedAt: new Date().toISOString(),
    terminateReason: reason,
    forceKilled: true,
  });

  state.teamMembers.delete(memberId);

  // 6. 通知 Coordinator 可以派发接替者
  sendMessage({
    type: 'executor_terminated',
    sender: 'supervisor',
    receiver: 'coordinator',
    content: {
      executorId: memberId,
      reason: reason,
      forceKilled: true,
      recommendation: 'DISPATCH_REPLACEMENT',
    },
  });

  return true;
}

// 执行强制终止（平台相关）
async function executeForceKill(memberId) {
  // 尝试查找并终止相关进程
  // 这里是一个示例实现，实际可能需要根据运行环境调整
  try {
    // 在 Windows 上
    if (process.platform === 'win32') {
      await execPromise(`taskkill /F /FI "WINDOWTITLE eq ${memberId}" 2>nul || exit 0`);
    } else {
      // 在 Linux/Mac 上
      await execPromise(`pkill -f "${memberId}" 2>/dev/null || true`);
    }
  } catch (error) {
    // 忽略错误，因为进程可能已经不存在
  }
}

// 健康检查主函数
async function performHealthCheck() {
  state.checkCount++;
  const now = Date.now();
  const anomalies = [];

  // ===== 1. 被动健康检查（不依赖主动注册）=====
  console.log('[Health Check] 开始被动健康检查...');
  const passiveDetections = [];

  for (const [memberId, memberState] of state.teamMembers) {
    // 跳过正在终止的成员
    if (memberState.status === 'terminating' || memberState.status === 'terminated') {
      continue;
    }

    try {
      const detection = await passiveHealthCheck(memberId);
      passiveDetections.push(detection);

      // 如果被动检测发现可能的MCP卡住，创建异常
      if (detection.possibleMCPStuck && detection.confidence >= 60) {
        // 避免重复报告（如果已经有主动注册的MCP调用）
        if (!state.mcpCallStartTime.has(memberId)) {
          anomalies.push({
            type: 'possible_mcp_stuck_passive',
            memberId,
            duration: detection.runningDuration || detection.timeSinceLastOutput,
            severity: detection.confidence >= 80 ? 'critical' : 'warning',
            recommendation: detection.confidence >= 80 ? 'RESTART' : 'SEND_HEALTH_CHECK',
            confidence: detection.confidence,
            detectionSource: 'passive',
            details: `被动检测发现可能的MCP卡住 (置信度: ${detection.confidence}%)`,
          });

          console.warn(`[Health Check] ⚠️ 被动检测到 ${memberId} 可能MCP卡住 ` +
                       `(置信度: ${detection.confidence}%)`);
        }
      }
    } catch (error) {
      console.error(`[Health Check] 被动检查 ${memberId} 失败:`, error.message);
    }
  }

  // ===== 2. 检查消息超时 =====
  const expiredMessages = checkMessageTimeouts();
  if (expiredMessages.length > 0) {
    anomalies.push(...expiredMessages.map(id => ({
      type: 'message_expired',
      messageId: id,
      severity: 'warning',
    })));
  }

  // ===== 3. 检查 MCP 超时（主动注册）=====
  const mcpStuck = await checkMCPTimeouts();
  anomalies.push(...mcpStuck);

  // ===== 4. 检查每个成员 =====
  for (const [memberId, memberState] of state.teamMembers) {
    // 跳过正在终止的成员
    if (memberState.status === 'terminating' || memberState.status === 'terminated') {
      continue;
    }

    const lastUpdate = state.lastProgressUpdate.get(memberId) || 0;
    const timeSinceUpdate = now - lastUpdate;

    // 检查 1: 进度停滞
    if (timeSinceUpdate > CONFIG.progressStaleThreshold) {
      // 检查是否正在进行 MCP 调用（主动或被动检测）
      const hasActiveMCP = state.mcpCallStartTime.has(memberId);
      const hasPassiveMCP = state.possibleMCPStuck.has(memberId);

      if (!hasActiveMCP && !hasPassiveMCP) {
        anomalies.push({
          type: 'progress_stale',
          memberId,
          duration: timeSinceUpdate,
          severity: 'warning',
          recommendation: 'SEND_HEALTH_CHECK',
        });
      }
    }

    // 检查 2: 空闲过久
    if (memberState.status === 'idle' && memberState.idleSince) {
      const idleTime = now - memberState.idleSince;
      if (idleTime > CONFIG.idleWarningThreshold) {
        anomalies.push({
          type: 'idle_too_long',
          memberId,
          duration: idleTime,
          severity: idleTime > CONFIG.idleTimeoutThreshold ? 'critical' : 'warning',
          recommendation: idleTime > CONFIG.idleTimeoutThreshold ? 'RESTART' : 'ASSIST',
        });
      }
    }

    // 检查 3: 错误过多
    if (memberState.errorCount && memberState.errorCount >= CONFIG.maxRetries) {
      anomalies.push({
        type: 'error_count_high',
        memberId,
        errorCount: memberState.errorCount,
        severity: 'warning',
        recommendation: 'ASSIST',
      });
    }

    // 检查 4: 质量检查（50% 进度）
    if (memberState.progress >= 50 && !memberState.qualityChecked) {
      anomalies.push({
        type: 'quality_check_needed',
        memberId,
        progress: memberState.progress,
        severity: 'info',
        recommendation: 'QUALITY_CHECK',
      });
    }
  }

  // ===== 4. 处理检测到的异常 =====
  for (const anomaly of anomalies) {
    await handleAnomaly(anomaly);
  }

  // ===== 5. 保存异常历史 =====
  state.anomalies.push(...anomalies.filter(a => a.severity !== 'info'));

  // ===== 6. 生成并保存健康报告 =====
  const healthReport = generateHealthReport();
  saveHealthReport(healthReport);

  // ===== 7. 记录被动检测统计 =====
  logPassiveCheckSummary(passiveDetections);

  // ===== 8. 生成并保存消息报告 =====
  const messageReport = generateMessageReport();
  saveMessageReport(messageReport);

  // ===== 9. 生成资源使用报告（如果资源监控器可用）=====
  if (ResourceMonitor && state.checkCount % 2 === 0) {  // 每2次健康检查生成一次资源报告
    try {
      const resourceReport = ResourceMonitor.generateResourceReport();
      ResourceMonitor.saveResourceReport(resourceReport);

      // 检查是否有预算告警
      if (resourceReport.budget && resourceReport.budget.usagePercent >= 80) {
        sendMessage({
          type: 'resource_alert',
          sender: 'supervisor',
          receiver: 'coordinator',
          content: {
            alertType: 'budget_warning',
            usagePercent: resourceReport.budget.usagePercent,
            used: resourceReport.budget.used,
            limit: resourceReport.budget.limit,
            message: `预算使用率已达 ${resourceReport.budget.usagePercent.toFixed(2)}%`
          }
        }, { requireAcknowledgment: true });
      }
    } catch (error) {
      console.error('[Health Check] 生成资源报告失败:', error.message);
    }
  }

  return anomalies;
}

/**
 * 记录被动检测汇总日志
 * @param {array} detections - 所有被动检测结果
 */
function logPassiveCheckSummary(detections) {
  const stuckCount = detections.filter(d => d.possibleMCPStuck).length;
  const runningCount = detections.filter(d => d.hasRunningState).length;

  if (stuckCount > 0 || runningCount > 0) {
    console.log(`[Passive Check] 汇总: ${detections.length} 成员检查, ` +
                `${runningCount} 处于Running状态, ${stuckCount} 可能卡住`);
  }
}

// 处理异常
async function handleAnomaly(anomaly) {
  const { type, memberId, severity, recommendation } = anomaly;

  console.log(`[Health Check] 检测到异常: ${type} - ${memberId} (${severity})`);

  switch (recommendation) {
    case 'SEND_HEALTH_CHECK':
      await sendHealthCheckMessage(memberId, type);
      break;

    case 'ASSIST':
      await reportAnomaly(memberId, anomaly, 'ASSIST');
      break;

    case 'RESTART':
      await reportAnomaly(memberId, anomaly, 'RESTART');
      // 对于 critical 级别的空闲过久，直接执行 RESTART
      if (type === 'idle_too_long' && severity === 'critical') {
        await forceTerminate(memberId, 'idle_timeout');
      }
      break;

    case 'QUALITY_CHECK':
      await requestQualityCheck(memberId);
      break;
  }
}

// 发送健康检查消息
async function sendHealthCheckMessage(memberId, reason) {
  const message = {
    type: 'health_check',
    sender: 'supervisor',
    receiver: memberId,
    content: {
      reason,
      question: '你还在正常工作吗？需要帮助吗？',
      options: ['继续工作', '需要帮助', '遇到问题'],
      responseTimeout: 60, // 60秒内必须响应
    },
  };

  sendMessage(message, {
    requireAcknowledgment: true,
    onAcknowledged: (msg) => {
      console.log(`[Health Check] 健康检查消息已确认: ${msg.id}`);
    },
  });

  // 记录发送时间，用于后续检查响应
  updateMemberState(memberId, {
    lastHealthCheckSent: Date.now(),
  });
}

// 报告异常给 Coordinator
async function reportAnomaly(memberId, anomaly, recommendation) {
  const report = {
    type: 'anomaly_report',
    sender: 'supervisor',
    receiver: 'coordinator',
    content: {
      executorId: memberId,
      anomalyType: anomaly.type,
      severity: anomaly.severity,
      details: `检测到 ${anomaly.type}，持续时间: ${Math.round(anomaly.duration / 1000)}秒`,
      recommendation,
      timestamp: new Date().toISOString(),
    },
  };

  sendMessage(report, { requireAcknowledgment: true });
}

// 请求质量检查
async function requestQualityCheck(memberId) {
  sendMessage({
    type: 'quality_check_request',
    sender: 'supervisor',
    receiver: memberId,
    content: {
      progress: state.teamMembers.get(memberId)?.progress,
      message: '请提交当前进度供质量检查',
    },
  }, { requireAcknowledgment: true });

  updateMemberState(memberId, { qualityChecked: true });
}

// 更新成员状态
function updateMemberState(memberId, stateUpdate) {
  const currentState = state.teamMembers.get(memberId) || {
    status: 'unknown',
    errorCount: 0,
    progress: 0,
  };

  const newState = {
    ...currentState,
    ...stateUpdate,
    lastUpdate: Date.now(),
  };

  // 如果状态变为 idle，记录时间
  if (stateUpdate.status === 'idle' && currentState.status !== 'idle') {
    newState.idleSince = Date.now();
  }

  // 如果状态从 idle 变为 working，清除 idle 时间
  if (stateUpdate.status === 'working' && currentState.status === 'idle') {
    newState.idleSince = null;
  }

  state.teamMembers.set(memberId, newState);

  // 更新进度时间
  if (stateUpdate.progress !== undefined) {
    state.lastProgressUpdate.set(memberId, Date.now());
  }

  // 持久化状态
  writeMemberState(memberId, newState);

  return newState;
}

// 注册新成员
function registerMember(memberId, initialState = {}) {
  console.log(`[Health Check] 注册新成员: ${memberId}`);
  updateMemberState(memberId, {
    status: 'registered',
    registeredAt: Date.now(),
    ...initialState,
  });
}

// 注销成员
function unregisterMember(memberId) {
  console.log(`[Health Check] 注销成员: ${memberId}`);
  state.teamMembers.delete(memberId);
  state.lastProgressUpdate.delete(memberId);
  state.mcpCallStartTime.delete(memberId);
  state.mcpCallTool.delete(memberId);

  // 清理被动检测状态
  clearPassiveCheckState(memberId);

  // 删除状态文件
  try {
    const statePath = getMemberStatePath(memberId);
    if (fs.existsSync(statePath)) {
      fs.unlinkSync(statePath);
    }
  } catch (error) {
    console.error(`[Health Check] 删除成员状态文件失败:`, error.message);
  }
}

// 生成健康报告
function generateHealthReport() {
  const now = Date.now();
  const report = {
    timestamp: new Date().toISOString(),
    checkCount: state.checkCount,
    teamName: state.teamName,
    members: [],
    summary: {
      total: state.teamMembers.size,
      healthy: 0,
      warning: 0,
      critical: 0,
      terminating: 0,
    },
  };

  for (const [memberId, memberState] of state.teamMembers) {
    const lastUpdate = state.lastProgressUpdate.get(memberId) || 0;
    const timeSinceUpdate = now - lastUpdate;
    const mcpCallTime = state.mcpCallStartTime.get(memberId);

    let healthStatus = 'healthy';

    if (memberState.status === 'terminating' || memberState.status === 'terminated') {
      healthStatus = 'terminating';
      report.summary.terminating++;
    } else if (mcpCallTime && (now - mcpCallTime) > CONFIG.mcpStuckThreshold) {
      healthStatus = 'critical';
      report.summary.critical++;
    } else if (timeSinceUpdate > CONFIG.idleTimeoutThreshold) {
      healthStatus = 'critical';
      report.summary.critical++;
    } else if (timeSinceUpdate > CONFIG.idleWarningThreshold) {
      healthStatus = 'warning';
      report.summary.warning++;
    } else {
      report.summary.healthy++;
    }

    // 检查被动检测状态
    const passiveStuck = state.possibleMCPStuck.get(memberId);

    report.members.push({
      id: memberId,
      status: memberState.status,
      healthStatus,
      progress: memberState.progress,
      lastUpdate: new Date(lastUpdate).toISOString(),
      timeSinceUpdate: Math.round(timeSinceUpdate / 1000) + 's',
      mcpCall: mcpCallTime ? {
        tool: state.mcpCallTool.get(memberId),
        duration: Math.round((now - mcpCallTime) / 1000) + 's',
        source: 'active',
      } : passiveStuck ? {
        tool: 'unknown',
        duration: Math.round(passiveStuck.duration / 1000) + 's',
        source: 'passive',
        confidence: passiveStuck.confidence,
      } : null,
      passiveCheck: state.passiveCheckState.get(memberId) ? {
        runningState: state.passiveCheckState.get(memberId).runningStateDetected,
        suspiciousCount: state.passiveCheckState.get(memberId).suspiciousCount,
      } : null,
    });
  }

  return report;
}

// 保存健康报告
function saveHealthReport(report) {
  try {
    const reportPath = path.join(ensureStateDir(), 'health-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  } catch (error) {
    console.error('[Health Check] 保存健康报告失败:', error.message);
  }
}

// 工具函数：睡眠
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 启动健康检查循环
async function startHealthCheckLoop(teamName, intervalMs = CONFIG.healthCheckInterval) {
  if (state.isRunning) {
    console.log('[Health Check] 健康检查已在运行');
    return () => {};
  }

  state.teamName = teamName;
  state.isRunning = true;

  // 加载历史消息存储
  loadMessageStore();

  console.log(`[Health Check] 启动健康检查循环，团队: ${teamName}`);
  console.log(`[Health Check] 检查间隔: ${intervalMs / 1000}秒`);
  console.log(`[Health Check] MCP超时阈值: ${CONFIG.mcpCallTimeout / 1000}秒`);
  console.log(`[Health Check] MCP卡住阈值: ${CONFIG.mcpStuckThreshold / 1000}秒`);
  console.log(`[Health Check] 消息超时: ${CONFIG.messageTimeout / 1000}秒`);
  console.log(`[Health Check] 消息最大重试: ${CONFIG.maxMessageRetries}次`);

  // 立即执行一次检查
  await performHealthCheck();

  // 定期执行健康检查
  const intervalId = setInterval(async () => {
    if (!state.isRunning) return;

    try {
      const anomalies = await performHealthCheck();
      if (anomalies.length > 0) {
        const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
        const warningCount = anomalies.filter(a => a.severity === 'warning').length;
        console.log(`[Health Check] 发现 ${anomalies.length} 个异常 (${criticalCount} critical, ${warningCount} warning)`);
      }
    } catch (error) {
      console.error('[Health Check] 检查失败:', error);
    }
  }, intervalMs);

  state.activeIntervals.push(intervalId);

  // 返回停止函数
  return stopHealthCheckLoop;
}

// 停止健康检查循环
function stopHealthCheckLoop() {
  console.log('[Health Check] 停止健康检查循环');
  state.isRunning = false;

  state.activeIntervals.forEach(intervalId => {
    clearInterval(intervalId);
  });
  state.activeIntervals = [];

  // 保存最终报告
  const finalReport = generateHealthReport();
  saveHealthReport(finalReport);

  const finalMessageReport = generateMessageReport();
  saveMessageReport(finalMessageReport);

  // 持久化消息存储
  persistMessageStore();

  console.log('[Health Check] 健康检查已停止');
}

// 获取当前状态（用于调试）
function getState() {
  return {
    teamName: state.teamName,
    isRunning: state.isRunning,
    checkCount: state.checkCount,
    memberCount: state.teamMembers.size,
    members: Array.from(state.teamMembers.keys()),
    mcpCallsInProgress: Array.from(state.mcpCallStartTime.entries()).map(([id, time]) => ({
      memberId: id,
      tool: state.mcpCallTool.get(id),
      duration: Date.now() - time,
    })),
    pendingMessages: state.pendingMessages.size,
    totalMessages: state.messageStore.size,
  };
}

// CLI 入口
if (require.main === module) {
  const args = process.argv.slice(2);
  const teamName = args[args.indexOf('--team') + 1];
  const interval = parseInt(args[args.indexOf('--interval') + 1]) * 1000 || CONFIG.healthCheckInterval;

  if (!teamName) {
    console.error('用法: node health-check.js --team <team_name> [--interval 30]');
    process.exit(1);
  }

  startHealthCheckLoop(teamName, interval);

  // 处理退出信号
  process.on('SIGINT', () => {
    console.log('\n[Health Check] 收到中断信号');
    stopHealthCheckLoop();
    process.exit(0);
  });
}

module.exports = {
  // 核心功能
  performHealthCheck,
  startHealthCheckLoop,
  stopHealthCheckLoop,

  // 成员管理
  registerMember,
  unregisterMember,
  updateMemberState,

  // MCP 监控（主动注册）
  registerMCPCallStart,
  registerMCPCallEnd,

  // 被动健康检查
  passiveHealthCheck,
  getPassiveCheckState,
  clearPassiveCheckState,

  // 消息系统
  sendMessage,
  acknowledgeMessage,
  checkMessageStatus,
  retryFailedMessages,
  checkMessageTimeouts,
  generateMessageReport,

  // 消息状态枚举
  MessageStatus,

  // 报告
  generateHealthReport,
  getState,

  // 配置
  CONFIG,
  PASSIVE_CONFIG,

  // 强制终止
  forceTerminate,
};
