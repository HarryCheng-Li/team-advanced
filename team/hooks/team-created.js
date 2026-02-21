#!/usr/bin/env node
/**
 * Team Skill - Team Created Hook
 * 团队创建时自动启动健康检查和资源监控
 */

const fs = require('fs');
const path = require('path');
const { startHealthCheckLoop } = require('./health-check');
const ResourceMonitor = require('./resource-monitor');

async function main() {
  const args = process.argv.slice(2);
  const teamName = args[args.indexOf('--team') + 1];
  const budget = parseFloat(args[args.indexOf('--budget') + 1]);

  if (!teamName) {
    console.error('[Team Created] 错误: 未指定团队名称');
    process.exit(1);
  }

  console.log(`[Team Created] 团队 ${teamName} 已创建`);

  // 启动健康检查
  try {
    await startHealthCheckLoop(teamName);
    console.log(`[Team Created] 健康检查已启动`);
  } catch (error) {
    console.error(`[Team Created] 启动健康检查失败:`, error.message);
  }

  // 初始化资源监控
  try {
    ResourceMonitor.initialize({
      teamName,
      budget: budget ? { limit: budget } : null
    });
    console.log(`[Team Created] 资源监控已初始化`);
  } catch (error) {
    console.error(`[Team Created] 初始化资源监控失败:`, error.message);
  }
}

main();
