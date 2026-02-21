#!/usr/bin/env node
/**
 * session-start.js
 * 会话开始时加载上下文、检查 instincts、初始化会话状态
 */

const fs = require('fs');
const path = require('path');

// 配置路径
const MEMORY_DIR = path.join(process.env.HOME, '.claude', 'projects', '-home-harry-cc-p', 'memory');
const INSTINCTS_FILE = path.join(MEMORY_DIR, 'instincts.md');
const PROGRESS_FILE = path.join(MEMORY_DIR, 'progress.json');
const SESSION_STATE_FILE = path.join(MEMORY_DIR, 'session-state.json');

/**
 * 加载 instincts 文件
 */
function loadInstincts() {
  if (fs.existsSync(INSTINCTS_FILE)) {
    const content = fs.readFileSync(INSTINCTS_FILE, 'utf-8');
    console.log('[session-start] 已加载 instincts');
    return content;
  }
  console.log('[session-start] instincts 文件不存在，将创建新文件');
  return null;
}

/**
 * 加载进度跟踪
 */
function loadProgress() {
  if (fs.existsSync(PROGRESS_FILE)) {
    const content = fs.readFileSync(PROGRESS_FILE, 'utf-8');
    const progress = JSON.parse(content);
    console.log(`[session-start] 当前进度: ${progress.completed || 0}/${progress.total || 0} 任务完成`);
    return progress;
  }
  return { completed: 0, total: 0, tasks: [] };
}

/**
 * 初始化会话状态
 */
function initSessionState() {
  const state = {
    sessionId: `session-${Date.now()}`,
    startTime: new Date().toISOString(),
    toolsUsed: [],
    filesModified: [],
    patterns: [],
    errors: []
  };

  fs.writeFileSync(SESSION_STATE_FILE, JSON.stringify(state, null, 2));
  console.log(`[session-start] 会话已初始化: ${state.sessionId}`);
  return state;
}

/**
 * 主函数
 */
function main() {
  console.log('=== 会话开始 ===');
  console.log(`时间: ${new Date().toISOString()}`);

  // 加载上下文
  const instincts = loadInstincts();
  const progress = loadProgress();

  // 初始化会话状态
  const sessionState = initSessionState();

  // 输出上下文摘要
  const context = {
    hasInstincts: !!instincts,
    progressStatus: `${progress.completed}/${progress.total}`,
    sessionId: sessionState.sessionId
  };

  console.log('[session-start] 上下文加载完成');
  console.log(JSON.stringify(context, null, 2));
}

main();
