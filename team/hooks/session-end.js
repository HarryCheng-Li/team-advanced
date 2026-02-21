#!/usr/bin/env node
/**
 * session-end.js
 * 保存状态、更新进度、清理资源
 */

const fs = require('fs');
const path = require('path');

// 配置路径
const MEMORY_DIR = path.join(process.env.HOME, '.claude', 'projects', '-home-harry-cc-p', 'memory');
const PROGRESS_FILE = path.join(MEMORY_DIR, 'progress.json');
const SESSION_STATE_FILE = path.join(MEMORY_DIR, 'session-state.json');
const SESSION_LOG_FILE = path.join(MEMORY_DIR, 'session-logs.json');

/**
 * 加载会话状态
 */
function loadSessionState() {
  if (fs.existsSync(SESSION_STATE_FILE)) {
    const content = fs.readFileSync(SESSION_STATE_FILE, 'utf-8');
    return JSON.parse(content);
  }
  return null;
}

/**
 * 更新进度跟踪
 */
function updateProgress(sessionState) {
  let progress = { completed: 0, total: 0, tasks: [], lastUpdated: null };

  if (fs.existsSync(PROGRESS_FILE)) {
    const content = fs.readFileSync(PROGRESS_FILE, 'utf-8');
    progress = JSON.parse(content);
  }

  // 更新最后更新时间
  progress.lastUpdated = new Date().toISOString();

  // 如果有会话状态，更新任务列表
  if (sessionState && sessionState.filesModified) {
    sessionState.filesModified.forEach(file => {
      if (!progress.tasks.includes(file)) {
        progress.tasks.push(file);
      }
    });
  }

  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  console.log('[session-end] 进度已更新');
  return progress;
}

/**
 * 保存会话日志
 */
function saveSessionLog(sessionState) {
  let logs = [];

  if (fs.existsSync(SESSION_LOG_FILE)) {
    const content = fs.readFileSync(SESSION_LOG_FILE, 'utf-8');
    logs = JSON.parse(content);
  }

  const logEntry = {
    sessionId: sessionState?.sessionId || 'unknown',
    startTime: sessionState?.startTime || null,
    endTime: new Date().toISOString(),
    toolsUsed: sessionState?.toolsUsed || [],
    filesModified: sessionState?.filesModified || [],
    patterns: sessionState?.patterns || [],
    errors: sessionState?.errors || []
  };

  logs.push(logEntry);

  // 只保留最近 50 条日志
  if (logs.length > 50) {
    logs = logs.slice(-50);
  }

  fs.writeFileSync(SESSION_LOG_FILE, JSON.stringify(logs, null, 2));
  console.log('[session-end] 会话日志已保存');
}

/**
 * 清理临时资源
 */
function cleanup() {
  // 清理会话状态文件
  if (fs.existsSync(SESSION_STATE_FILE)) {
    fs.unlinkSync(SESSION_STATE_FILE);
    console.log('[session-end] 临时会话状态已清理');
  }
}

/**
 * 主函数
 */
function main() {
  console.log('=== 会话结束 ===');
  console.log(`时间: ${new Date().toISOString()}`);

  // 加载会话状态
  const sessionState = loadSessionState();

  if (sessionState) {
    console.log(`[session-end] 会话 ID: ${sessionState.sessionId}`);
    console.log(`[session-end] 使用工具: ${sessionState.toolsUsed.length} 次`);
    console.log(`[session-end] 修改文件: ${sessionState.filesModified.length} 个`);
    console.log(`[session-end] 发现模式: ${sessionState.patterns.length} 个`);
    console.log(`[session-end] 错误数: ${sessionState.errors.length} 个`);
  }

  // 更新进度
  updateProgress(sessionState);

  // 保存日志
  saveSessionLog(sessionState);

  // 清理资源
  cleanup();

  console.log('[session-end] 会话已正常结束');
}

main();
