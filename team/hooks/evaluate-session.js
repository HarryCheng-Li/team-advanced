#!/usr/bin/env node
/**
 * evaluate-session.js
 * 提取模式、生成 instinct、更新置信度
 * 在会话结束时触发 (Stop)
 */

const fs = require('fs');
const path = require('path');

// 配置路径
const MEMORY_DIR = path.join(process.env.HOME, '.claude', 'projects', '-home-harry-cc-p', 'memory');
const SESSION_STATE_FILE = path.join(MEMORY_DIR, 'session-state.json');
const SESSION_LOG_FILE = path.join(MEMORY_DIR, 'session-logs.json');
const INSTINCTS_FILE = path.join(MEMORY_DIR, 'instincts.md');

/**
 * 加载会话日志
 */
function loadSessionLogs() {
  if (fs.existsSync(SESSION_LOG_FILE)) {
    return JSON.parse(fs.readFileSync(SESSION_LOG_FILE, 'utf-8'));
  }
  return [];
}

/**
 * 加载现有 instincts
 */
function loadInstincts() {
  if (fs.existsSync(INSTINCTS_FILE)) {
    return fs.readFileSync(INSTINCTS_FILE, 'utf-8');
  }
  return '# Instincts\n\n这是从会话中自动提取的模式和最佳实践。\n\n';
}

/**
 * 从错误中提取模式
 */
function extractErrorPatterns(logs) {
  const errorPatterns = {};

  logs.forEach(log => {
    if (log.errors) {
      log.errors.forEach(error => {
        error.issues.forEach(issue => {
          const key = `${issue.type}-${issue.severity}`;
          if (!errorPatterns[key]) {
            errorPatterns[key] = {
              type: issue.type,
              severity: issue.severity,
              count: 0,
              files: []
            };
          }
          errorPatterns[key].count += issue.count;
          if (!errorPatterns[key].files.includes(error.file)) {
            errorPatterns[key].files.push(error.file);
          }
        });
      });
    }
  });

  return Object.values(errorPatterns).sort((a, b) => b.count - a.count);
}

/**
 * 从工具使用中提取模式
 */
function extractToolPatterns(logs) {
  const toolUsage = {};

  logs.forEach(log => {
    if (log.toolsUsed) {
      log.toolsUsed.forEach(tool => {
        if (!toolUsage[tool]) {
          toolUsage[tool] = 0;
        }
        toolUsage[tool]++;
      });
    }
  });

  return Object.entries(toolUsage)
    .map(([tool, count]) => ({ tool, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * 生成 instinct 条目
 */
function generateInstinct(errorPatterns, toolPatterns) {
  const lines = [];
  lines.push(`\n## 会话评估 - ${new Date().toISOString()}\n`);

  // 基于错误模式生成建议
  if (errorPatterns.length > 0) {
    lines.push('### 常见问题\n');

    errorPatterns.slice(0, 5).forEach(pattern => {
      if (pattern.severity === 'high') {
        lines.push(`- **[高优先级]** 避免 ${pattern.type}，已出现 ${pattern.count} 次`);
      } else if (pattern.severity === 'medium') {
        lines.push(`- [中优先级] 检查 ${pattern.type}，已出现 ${pattern.count} 次`);
      }
    });
  }

  // 基于工具使用生成建议
  if (toolPatterns.length > 0) {
    lines.push('\n### 常用工具\n');
    toolPatterns.slice(0, 5).forEach(({ tool, count }) => {
      lines.push(`- ${tool}: 使用 ${count} 次`);
    });
  }

  return lines.join('\n');
}

/**
 * 更新置信度
 */
function updateConfidence(errorPatterns) {
  // 基于错误数量调整置信度
  const highSeverityCount = errorPatterns.filter(p => p.severity === 'high').length;
  const mediumSeverityCount = errorPatterns.filter(p => p.severity === 'medium').length;

  // 计算调整值
  const adjustment = -(highSeverityCount * 0.1 + mediumSeverityCount * 0.05);

  return {
    adjustment,
    highSeverityCount,
    mediumSeverityCount,
    newConfidence: Math.max(0.5, Math.min(1.0, 1.0 + adjustment))
  };
}

/**
 * 保存 instincts
 */
function saveInstincts(content) {
  fs.writeFileSync(INSTINCTS_FILE, content);
  console.log('[evaluate-session] instincts 已更新');
}

/**
 * 主函数
 */
function main() {
  console.log('=== 会话评估 ===');
  console.log(`时间: ${new Date().toISOString()}`);

  // 加载日志
  const logs = loadSessionLogs();
  console.log(`[evaluate-session] 加载了 ${logs.length} 条会话日志`);

  if (logs.length === 0) {
    console.log('[evaluate-session] 无日志数据，跳过评估');
    return;
  }

  // 提取模式
  const errorPatterns = extractErrorPatterns(logs);
  const toolPatterns = extractToolPatterns(logs);

  console.log(`[evaluate-session] 发现 ${errorPatterns.length} 个错误模式`);
  console.log(`[evaluate-session] 发现 ${toolPatterns.length} 个工具使用模式`);

  // 生成 instinct
  const instinctEntry = generateInstinct(errorPatterns, toolPatterns);

  // 加载并更新 instincts 文件
  let instincts = loadInstincts();

  // 添加新条目
  instincts += instinctEntry;

  // 限制文件大小 (保留最近 50 条评估)
  const sections = instincts.split('\n## ');
  if (sections.length > 51) { // 51 因为第一个是标题
    instincts = sections[0] + '\n## ' + sections.slice(-50).join('\n## ');
  }

  // 保存
  saveInstincts(instincts);

  // 更新置信度
  const confidence = updateConfidence(errorPatterns);

  console.log('[evaluate-session] 置信度更新:');
  console.log(JSON.stringify(confidence, null, 2));

  // 输出摘要
  console.log('\n=== 评估摘要 ===');
  console.log(`错误模式: ${errorPatterns.length}`);
  console.log(`工具模式: ${toolPatterns.length}`);
  console.log(`置信度调整: ${confidence.adjustment.toFixed(2)}`);

  // 输出 JSON 结果
  console.log(JSON.stringify({
    errorPatterns: errorPatterns.slice(0, 5),
    toolPatterns: toolPatterns.slice(0, 5),
    confidence
  }, null, 2));
}

main();
