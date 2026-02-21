#!/usr/bin/env node
/**
 * post-tool-use.js
 * 检查 console.log、敏感信息、代码风格
 * 在 Edit 工具使用后触发
 */

const fs = require('fs');
const path = require('path');

// 配置路径
const MEMORY_DIR = path.join(process.env.HOME, '.claude', 'projects', '-home-harry-cc-p', 'memory');
const SESSION_STATE_FILE = path.join(MEMORY_DIR, 'session-state.json');

// 敏感信息模式
const SENSITIVE_PATTERNS = [
  /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
  /secret\s*[:=]\s*['"][^'"]+['"]/gi,
  /password\s*[:=]\s*['"][^'"]+['"]/gi,
  /token\s*[:=]\s*['"][^'"]+['"]/gi,
  /credential\s*[:=]\s*['"][^'"]+['"]/gi,
  /private[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
  /[a-zA-Z0-9]{32,}/g  // 可能的密钥
];

// 禁止的 console 模式
const CONSOLE_PATTERNS = [
  /console\.log\s*\(/g,
  /console\.debug\s*\(/g,
  /console\.info\s*\(/g,
  /console\.warn\s*\(/g,
  /console\.error\s*\(/g,
  /debugger\s*;?/g
];

/**
 * 加载会话状态
 */
function loadSessionState() {
  if (fs.existsSync(SESSION_STATE_FILE)) {
    return JSON.parse(fs.readFileSync(SESSION_STATE_FILE, 'utf-8'));
  }
  return {
    sessionId: `session-${Date.now()}`,
    startTime: new Date().toISOString(),
    toolsUsed: [],
    filesModified: [],
    patterns: [],
    errors: []
  };
}

/**
 * 保存会话状态
 */
function saveSessionState(state) {
  fs.writeFileSync(SESSION_STATE_FILE, JSON.stringify(state, null, 2));
}

/**
 * 检查敏感信息
 */
function checkSensitiveInfo(content, filename) {
  const issues = [];

  SENSITIVE_PATTERNS.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches) {
      issues.push({
        type: 'sensitive-info',
        pattern: index,
        count: matches.length,
        file: filename,
        severity: 'high'
      });
    }
  });

  return issues;
}

/**
 * 检查 console 语句
 */
function checkConsoleStatements(content, filename) {
  const issues = [];

  CONSOLE_PATTERNS.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches) {
      issues.push({
        type: 'console-statement',
        pattern: index,
        count: matches.length,
        file: filename,
        severity: 'medium'
      });
    }
  });

  return issues;
}

/**
 * 检查代码风格
 */
function checkCodeStyle(content, filename) {
  const issues = [];

  // 检查行尾空格
  const trailingSpaces = content.match(/[^\S\n]+$/gm);
  if (trailingSpaces) {
    issues.push({
      type: 'trailing-spaces',
      count: trailingSpaces.length,
      file: filename,
      severity: 'low'
    });
  }

  // 检查多个空行
  const multipleBlankLines = content.match(/\n{3,}/g);
  if (multipleBlankLines) {
    issues.push({
      type: 'multiple-blank-lines',
      count: multipleBlankLines.length,
      file: filename,
      severity: 'low'
    });
  }

  // 检查 TODO/FIXME (仅提示)
  const todos = content.match(/(TODO|FIXME|XXX|HACK):/gi);
  if (todos) {
    issues.push({
      type: 'todo-comment',
      count: todos.length,
      file: filename,
      severity: 'info'
    });
  }

  return issues;
}

/**
 * 主函数
 */
function main() {
  // 从环境变量或参数获取文件路径
  const filepath = process.env.CLAUDE_TOOL_PATH || process.argv[2];

  if (!filepath || !fs.existsSync(filepath)) {
    console.log('[post-tool-use] 未提供有效的文件路径');
    return;
  }

  console.log('=== 文件编辑后检查 ===');
  console.log(`文件: ${filepath}`);
  console.log(`时间: ${new Date().toISOString()}`);

  // 读取文件内容
  const content = fs.readFileSync(filepath, 'utf-8');
  const filename = path.basename(filepath);

  // 加载会话状态
  const sessionState = loadSessionState();

  // 记录修改的文件
  if (!sessionState.filesModified.includes(filepath)) {
    sessionState.filesModified.push(filepath);
  }

  // 执行检查
  const allIssues = [
    ...checkSensitiveInfo(content, filename),
    ...checkConsoleStatements(content, filename),
    ...checkCodeStyle(content, filename)
  ];

  // 记录问题
  if (allIssues.length > 0) {
    sessionState.errors.push({
      timestamp: new Date().toISOString(),
      file: filepath,
      issues: allIssues
    });
  }

  // 保存会话状态
  saveSessionState(sessionState);

  // 输出检查结果
  if (allIssues.length === 0) {
    console.log('[post-tool-use] 检查通过，无问题');
  } else {
    console.log(`[post-tool-use] 发现 ${allIssues.length} 个问题:`);
    allIssues.forEach(issue => {
      console.log(`  - [${issue.severity}] ${issue.type}: ${issue.count} 处`);
    });
  }

  // 输出 JSON 格式结果
  console.log(JSON.stringify({
    file: filepath,
    issues: allIssues,
    issueCount: allIssues.length
  }, null, 2));
}

main();
