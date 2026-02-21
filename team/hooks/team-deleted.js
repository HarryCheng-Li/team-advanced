#!/usr/bin/env node
/**
 * Team Skill - Team Deleted Hook
 * 团队删除时自动停止健康检查和资源监控
 */

const { stopHealthCheckLoop } = require('./health-check');
const ResourceMonitor = require('./resource-monitor');

async function main() {
  const args = process.argv.slice(2);
  const teamName = args[args.indexOf('--team') + 1];

  if (!teamName) {
    console.error('[Team Deleted] 错误: 未指定团队名称');
    process.exit(1);
  }

  console.log(`[Team Deleted] 团队 ${teamName} 正在删除`);

  // 停止健康检查
  try {
    stopHealthCheckLoop();
    console.log(`[Team Deleted] 健康检查已停止`);
  } catch (error) {
    console.error(`[Team Deleted] 停止健康检查失败:`, error.message);
  }

  // 关闭资源监控
  try {
    const finalReport = ResourceMonitor.shutdown();
    console.log(`[Team Deleted] 资源监控已关闭`);
    console.log(`[Team Deleted] 最终成本: $${finalReport.summary.totalCost.toFixed(4)}`);
  } catch (error) {
    console.error(`[Team Deleted] 关闭资源监控失败:`, error.message);
  }
}

main();
