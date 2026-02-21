#!/usr/bin/env node
/**
 * pre-compact.js
 * 压缩前保存重要上下文到临时文件
 */

const fs = require('fs');
const path = require('path');

// 配置路径
const MEMORY_DIR = path.join(process.env.HOME, '.claude', 'projects', '-home-harry-cc-p', 'memory');
const SESSION_STATE_FILE = path.join(MEMORY_DIR, 'session-state.json');
const COMPACT_BACKUP_DIR = path.join(MEMORY_DIR, 'compact-backups');

/**
 * 确保备份目录存在
 */
function ensureBackupDir() {
  if (!fs.existsSync(COMPACT_BACKUP_DIR)) {
    fs.mkdirSync(COMPACT_BACKUP_DIR, { recursive: true });
  }
}

/**
 * 保存重要上下文
 */
function saveContext() {
  ensureBackupDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(COMPACT_BACKUP_DIR, `context-${timestamp}.json`);

  const context = {
    timestamp: new Date().toISOString(),
    sessionState: null,
    memoryFiles: {}
  };

  // 加载会话状态
  if (fs.existsSync(SESSION_STATE_FILE)) {
    context.sessionState = JSON.parse(fs.readFileSync(SESSION_STATE_FILE, 'utf-8'));
  }

  // 保存关键 memory 文件的摘要
  const memoryFiles = ['MEMORY.md', 'instincts.md', 'progress.json'];
  memoryFiles.forEach(filename => {
    const filepath = path.join(MEMORY_DIR, filename);
    if (fs.existsSync(filepath)) {
      const content = fs.readFileSync(filepath, 'utf-8');
      // 只保存前 1000 字符作为摘要
      context.memoryFiles[filename] = {
        exists: true,
        summary: content.substring(0, 1000),
        fullLength: content.length
      };
    } else {
      context.memoryFiles[filename] = { exists: false };
    }
  });

  // 保存备份
  fs.writeFileSync(backupFile, JSON.stringify(context, null, 2));
  console.log(`[pre-compact] 上下文已备份到: ${backupFile}`);

  return backupFile;
}

/**
 * 清理旧备份
 */
function cleanOldBackups() {
  if (!fs.existsSync(COMPACT_BACKUP_DIR)) {
    return;
  }

  const files = fs.readdirSync(COMPACT_BACKUP_DIR)
    .filter(f => f.startsWith('context-') && f.endsWith('.json'))
    .map(f => ({
      name: f,
      path: path.join(COMPACT_BACKUP_DIR, f),
      time: fs.statSync(path.join(COMPACT_BACKUP_DIR, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);

  // 只保留最近 10 个备份
  const toDelete = files.slice(10);
  toDelete.forEach(f => {
    fs.unlinkSync(f.path);
    console.log(`[pre-compact] 已删除旧备份: ${f.name}`);
  });
}

/**
 * 主函数
 */
function main() {
  console.log('=== 压缩前保存上下文 ===');
  console.log(`时间: ${new Date().toISOString()}`);

  // 保存上下文
  const backupFile = saveContext();

  // 清理旧备份
  cleanOldBackups();

  console.log('[pre-compact] 上下文保存完成，可以安全进行压缩');

  // 输出备份路径供 Claude 读取
  console.log(JSON.stringify({ backupFile }));
}

main();
