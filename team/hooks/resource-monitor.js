#!/usr/bin/env node
/**
 * Team Skill - Resource Monitor
 * v6.0 资源使用监控组件
 *
 * 功能：
 * 1. Token使用记录（model, inputTokens, outputTokens, cost）
 * 2. MCP调用记录（toolName, duration, success）
 * 3. 成本计算和预算管理
 * 4. 资源使用统计和报告
 *
 * 使用方式：
 * const ResourceMonitor = require('./resource-monitor');
 * ResourceMonitor.recordTokenUsage({ model, inputTokens, outputTokens, agentId });
 * ResourceMonitor.recordMCPCall({ toolName, duration, success, agentId });
 */

const fs = require('fs');
const path = require('path');

// ============== 配置 ==============

// Token定价配置（每1K tokens的价格，单位：美元）
const TOKEN_PRICING = {
  // Anthropic 模型
  'claude-opus-4-6': { input: 15.0, output: 75.0 },
  'claude-opus-4': { input: 15.0, output: 75.0 },
  'claude-opus-3': { input: 15.0, output: 75.0 },
  'claude-sonnet-4': { input: 3.0, output: 15.0 },
  'claude-sonnet-3.5': { input: 3.0, output: 15.0 },
  'claude-sonnet-3': { input: 3.0, output: 15.0 },
  'claude-haiku-3': { input: 0.25, output: 1.25 },
  'claude-3-opus': { input: 15.0, output: 75.0 },
  'claude-3-sonnet': { input: 3.0, output: 15.0 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'claude-3-5-sonnet': { input: 3.0, output: 15.0 },

  // OpenAI 模型
  'gpt-4o': { input: 5.0, output: 15.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4-turbo': { input: 10.0, output: 30.0 },
  'gpt-4': { input: 30.0, output: 60.0 },
  'gpt-3.5-turbo': { input: 0.5, output: 1.5 },

  // 默认价格（当模型未找到时使用）
  'default': { input: 3.0, output: 15.0 }
};

// 预算配置
const BUDGET_CONFIG = {
  defaultBudget: 10.0,           // 默认预算：$10
  warningThreshold: 0.8,         // 预警阈值：80%
  criticalThreshold: 0.95,       // 严重阈值：95%
  maxMCPCallsPerMinute: 60,      // 每分钟最大MCP调用数
  maxTokensPerSession: 1000000,  // 每会话最大Token数
};

// ============== 状态管理 ==============

const state = {
  teamName: null,
  sessionId: null,
  startTime: null,

  // Token使用记录
  tokenRecords: [],

  // MCP调用记录
  mcpRecords: [],

  // Agent统计
  agentStats: new Map(),

  // 预算状态
  budget: {
    limit: BUDGET_CONFIG.defaultBudget,
    used: 0,
    currency: 'USD'
  },

  // 告警状态
  alerts: [],

  // 运行状态
  isInitialized: false
};

// ============== 工具函数 ==============

function getTeamStateDir() {
  return path.join(process.env.HOME, '.claude', 'tasks', state.teamName || 'default');
}

function ensureStateDir() {
  const dir = getTeamStateDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getResourceDataPath() {
  return path.join(ensureStateDir(), 'resource-monitor.json');
}

function getResourceReportPath() {
  return path.join(ensureStateDir(), 'resource-report.json');
}

function saveState() {
  try {
    const dataPath = getResourceDataPath();
    const data = {
      teamName: state.teamName,
      sessionId: state.sessionId,
      startTime: state.startTime,
      budget: state.budget,
      tokenRecords: state.tokenRecords,
      mcpRecords: state.mcpRecords,
      agentStats: Object.fromEntries(state.agentStats),
      alerts: state.alerts,
      lastUpdate: new Date().toISOString()
    };
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('[Resource Monitor] 保存状态失败:', error.message);
  }
}

function loadState() {
  try {
    const dataPath = getResourceDataPath();
    if (fs.existsSync(dataPath)) {
      const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      state.teamName = data.teamName || state.teamName;
      state.sessionId = data.sessionId || state.sessionId;
      state.startTime = data.startTime || state.startTime;
      state.budget = data.budget || state.budget;
      state.tokenRecords = data.tokenRecords || [];
      state.mcpRecords = data.mcpRecords || [];
      state.alerts = data.alerts || [];
      if (data.agentStats) {
        state.agentStats = new Map(Object.entries(data.agentStats));
      }
    }
  } catch (error) {
    console.error('[Resource Monitor] 加载状态失败:', error.message);
  }
}

// ============== 成本计算 ==============

function getModelPricing(model) {
  // 精确匹配
  if (TOKEN_PRICING[model]) {
    return TOKEN_PRICING[model];
  }

  // 前缀匹配
  for (const [key, pricing] of Object.entries(TOKEN_PRICING)) {
    if (model.includes(key) || key.includes(model)) {
      return pricing;
    }
  }

  // 返回默认价格
  console.warn(`[Resource Monitor] 未找到模型 ${model} 的定价，使用默认价格`);
  return TOKEN_PRICING.default;
}

function calculateCost(model, inputTokens, outputTokens) {
  const pricing = getModelPricing(model);

  // 计算成本（价格是基于1K tokens的）
  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  const totalCost = inputCost + outputCost;

  return {
    inputCost: Math.round(inputCost * 10000) / 10000,    // 保留4位小数
    outputCost: Math.round(outputCost * 10000) / 10000,
    totalCost: Math.round(totalCost * 10000) / 10000,
    pricing
  };
}

// ============== Agent统计管理 ==============

function getOrCreateAgentStats(agentId) {
  if (!state.agentStats.has(agentId)) {
    state.agentStats.set(agentId, {
      agentId,
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalCost: 0,
      mcpCalls: 0,
      mcpSuccess: 0,
      mcpFailed: 0,
      totalMCPDuration: 0,
      firstActivity: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    });
  }
  return state.agentStats.get(agentId);
}

function updateAgentStats(agentId, updates) {
  const stats = getOrCreateAgentStats(agentId);
  Object.assign(stats, updates, { lastActivity: new Date().toISOString() });
  state.agentStats.set(agentId, stats);
}

// ============== 预算管理 ==============

function setBudget(limit, currency = 'USD') {
  state.budget.limit = limit;
  state.budget.currency = currency;
  saveState();
  console.log(`[Resource Monitor] 预算已设置: ${currency} ${limit}`);
}

function checkBudgetAlert() {
  const usage = state.budget.used / state.budget.limit;
  const alerts = [];

  if (usage >= BUDGET_CONFIG.criticalThreshold) {
    alerts.push({
      level: 'critical',
      type: 'budget_exceeded',
      message: `预算使用率超过 ${Math.round(usage * 100)}%！当前使用: $${state.budget.used.toFixed(4)}, 预算: $${state.budget.limit}`,
      timestamp: new Date().toISOString(),
      usage,
      used: state.budget.used,
      limit: state.budget.limit
    });
  } else if (usage >= BUDGET_CONFIG.warningThreshold) {
    alerts.push({
      level: 'warning',
      type: 'budget_warning',
      message: `预算使用率超过 ${Math.round(BUDGET_CONFIG.warningThreshold * 100)}%。当前使用: $${state.budget.used.toFixed(4)}, 预算: $${state.budget.limit}`,
      timestamp: new Date().toISOString(),
      usage,
      used: state.budget.used,
      limit: state.budget.limit
    });
  }

  // 检查MCP调用频率
  const recentMCPCalls = state.mcpRecords.filter(r => {
    const callTime = new Date(r.timestamp).getTime();
    const oneMinuteAgo = Date.now() - 60000;
    return callTime > oneMinuteAgo;
  });

  if (recentMCPCalls.length > BUDGET_CONFIG.maxMCPCallsPerMinute) {
    alerts.push({
      level: 'warning',
      type: 'mcp_rate_high',
      message: `MCP调用频率过高：最近一分钟 ${recentMCPCalls.length} 次调用`,
      timestamp: new Date().toISOString(),
      count: recentMCPCalls.length,
      threshold: BUDGET_CONFIG.maxMCPCallsPerMinute
    });
  }

  // 检查Token使用量
  const totalTokens = state.tokenRecords.reduce((sum, r) => sum + r.inputTokens + r.outputTokens, 0);
  if (totalTokens > BUDGET_CONFIG.maxTokensPerSession) {
    alerts.push({
      level: 'warning',
      type: 'token_usage_high',
      message: `Token使用量接近上限：${totalTokens.toLocaleString()} / ${BUDGET_CONFIG.maxTokensPerSession.toLocaleString()}`,
      timestamp: new Date().toISOString(),
      totalTokens,
      limit: BUDGET_CONFIG.maxTokensPerSession
    });
  }

  // 保存告警
  if (alerts.length > 0) {
    state.alerts.push(...alerts);
    saveState();

    // 输出告警
    for (const alert of alerts) {
      const prefix = alert.level === 'critical' ? 'CRITICAL' : 'WARNING';
      console.log(`[Resource Monitor] ${prefix}: ${alert.message}`);
    }
  }

  return alerts;
}

// ============== 记录功能 ==============

function recordTokenUsage({ model, inputTokens, outputTokens, agentId, metadata = {} }) {
  if (!state.isInitialized) {
    initialize({ teamName: 'default' });
  }

  const cost = calculateCost(model, inputTokens, outputTokens);

  const record = {
    id: `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'token_usage',
    timestamp: new Date().toISOString(),
    model,
    inputTokens,
    outputTokens,
    ...cost,
    agentId,
    metadata
  };

  state.tokenRecords.push(record);

  // 更新预算
  state.budget.used += cost.totalCost;

  // 更新Agent统计
  const agentStats = getOrCreateAgentStats(agentId);
  updateAgentStats(agentId, {
    totalTokens: agentStats.totalTokens + inputTokens + outputTokens,
    inputTokens: agentStats.inputTokens + inputTokens,
    outputTokens: agentStats.outputTokens + outputTokens,
    totalCost: agentStats.totalCost + cost.totalCost
  });

  // 检查预算告警
  const alerts = checkBudgetAlert();

  saveState();

  console.log(`[Resource Monitor] Token使用: ${model} | Input: ${inputTokens} | Output: ${outputTokens} | Cost: $${cost.totalCost.toFixed(6)} | Agent: ${agentId}`);

  return { record, alerts };
}

function recordMCPCall({ toolName, duration, success, agentId, error = null, metadata = {} }) {
  if (!state.isInitialized) {
    initialize({ teamName: 'default' });
  }

  const record = {
    id: `mcp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'mcp_call',
    timestamp: new Date().toISOString(),
    toolName,
    duration,  // 毫秒
    success,
    agentId,
    error,
    metadata
  };

  state.mcpRecords.push(record);

  // 更新Agent统计
  const agentStats = getOrCreateAgentStats(agentId);
  updateAgentStats(agentId, {
    mcpCalls: agentStats.mcpCalls + 1,
    mcpSuccess: success ? agentStats.mcpSuccess + 1 : agentStats.mcpSuccess,
    mcpFailed: success ? agentStats.mcpFailed : agentStats.mcpFailed + 1,
    totalMCPDuration: agentStats.totalMCPDuration + duration
  });

  // 检查MCP调用频率告警
  const alerts = checkBudgetAlert();

  saveState();

  const status = success ? 'SUCCESS' : 'FAILED';
  console.log(`[Resource Monitor] MCP调用: ${toolName} | ${status} | ${duration}ms | Agent: ${agentId}`);

  return { record, alerts };
}

// ============== 报告生成 ==============

function generateResourceReport() {
  const now = new Date();
  const sessionDuration = state.startTime ? now.getTime() - new Date(state.startTime).getTime() : 0;

  // Token统计
  const totalInputTokens = state.tokenRecords.reduce((sum, r) => sum + r.inputTokens, 0);
  const totalOutputTokens = state.tokenRecords.reduce((sum, r) => sum + r.outputTokens, 0);
  const totalTokens = totalInputTokens + totalOutputTokens;

  // 按模型统计
  const modelStats = {};
  for (const record of state.tokenRecords) {
    if (!modelStats[record.model]) {
      modelStats[record.model] = {
        model: record.model,
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0
      };
    }
    modelStats[record.model].calls++;
    modelStats[record.model].inputTokens += record.inputTokens;
    modelStats[record.model].outputTokens += record.outputTokens;
    modelStats[record.model].totalCost += record.totalCost;
  }

  // MCP统计
  const totalMCPCalls = state.mcpRecords.length;
  const successfulMCPCalls = state.mcpRecords.filter(r => r.success).length;
  const failedMCPCalls = totalMCPCalls - successfulMCPCalls;
  const mcpSuccessRate = totalMCPCalls > 0 ? (successfulMCPCalls / totalMCPCalls * 100).toFixed(2) : 0;
  const avgMCPDuration = totalMCPCalls > 0
    ? (state.mcpRecords.reduce((sum, r) => sum + r.duration, 0) / totalMCPCalls).toFixed(2)
    : 0;

  // 按工具统计MCP
  const toolStats = {};
  for (const record of state.mcpRecords) {
    if (!toolStats[record.toolName]) {
      toolStats[record.toolName] = {
        toolName: record.toolName,
        calls: 0,
        success: 0,
        failed: 0,
        totalDuration: 0,
        avgDuration: 0
      };
    }
    toolStats[record.toolName].calls++;
    if (record.success) {
      toolStats[record.toolName].success++;
    } else {
      toolStats[record.toolName].failed++;
    }
    toolStats[record.toolName].totalDuration += record.duration;
  }

  // 计算平均耗时
  for (const tool of Object.values(toolStats)) {
    tool.avgDuration = (tool.totalDuration / tool.calls).toFixed(2);
  }

  // Agent排行
  const agentRankings = Array.from(state.agentStats.values())
    .sort((a, b) => b.totalCost - a.totalCost);

  // 预算状态
  const budgetUsage = state.budget.limit > 0 ? (state.budget.used / state.budget.limit * 100).toFixed(2) : 0;

  const report = {
    timestamp: now.toISOString(),
    teamName: state.teamName,
    sessionId: state.sessionId,
    sessionDuration: {
      milliseconds: sessionDuration,
      formatted: formatDuration(sessionDuration)
    },

    summary: {
      totalTokens,
      totalInputTokens,
      totalOutputTokens,
      totalCost: Math.round(state.budget.used * 10000) / 10000,
      totalMCPCalls,
      mcpSuccessRate: `${mcpSuccessRate}%`,
      avgMCPDuration: `${avgMCPDuration}ms`,
      budgetUsage: `${budgetUsage}%`,
      budgetRemaining: Math.round((state.budget.limit - state.budget.used) * 10000) / 10000
    },

    budget: {
      limit: state.budget.limit,
      used: Math.round(state.budget.used * 10000) / 10000,
      remaining: Math.round((state.budget.limit - state.budget.used) * 10000) / 10000,
      currency: state.budget.currency,
      usagePercent: parseFloat(budgetUsage)
    },

    tokenStats: {
      byModel: Object.values(modelStats).map(s => ({
        ...s,
        totalCost: Math.round(s.totalCost * 10000) / 10000
      })),
      recentRecords: state.tokenRecords.slice(-10)  // 最近10条记录
    },

    mcpStats: {
      total: totalMCPCalls,
      success: successfulMCPCalls,
      failed: failedMCPCalls,
      successRate: `${mcpSuccessRate}%`,
      avgDuration: `${avgMCPDuration}ms`,
      byTool: Object.values(toolStats),
      recentRecords: state.mcpRecords.slice(-10)  // 最近10条记录
    },

    agentRankings: agentRankings.map(a => ({
      ...a,
      totalCost: Math.round(a.totalCost * 10000) / 10000
    })),

    alerts: state.alerts.slice(-20),  // 最近20条告警

    trends: calculateTrends()
  };

  return report;
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

function calculateTrends() {
  const now = Date.now();
  const oneHourAgo = now - 3600000;

  // 最近一小时的Token使用趋势
  const recentTokens = state.tokenRecords.filter(r => new Date(r.timestamp).getTime() > oneHourAgo);
  const hourlyTokenRate = recentTokens.length > 0
    ? recentTokens.reduce((sum, r) => sum + r.inputTokens + r.outputTokens, 0) / (recentTokens.length || 1)
    : 0;

  // 最近一小时的MCP调用趋势
  const recentMCP = state.mcpRecords.filter(r => new Date(r.timestamp).getTime() > oneHourAgo);
  const hourlyMCPRate = recentMCP.length;

  // 成本趋势（每小时）
  const hourlyCost = recentTokens.reduce((sum, r) => sum + r.totalCost, 0);

  // 预测剩余预算可用时间（小时）
  const remainingBudget = state.budget.limit - state.budget.used;
  const estimatedHoursRemaining = hourlyCost > 0 ? remainingBudget / hourlyCost : Infinity;

  return {
    hourlyTokenRate: Math.round(hourlyTokenRate),
    hourlyMCPRate,
    hourlyCost: Math.round(hourlyCost * 10000) / 10000,
    estimatedHoursRemaining: estimatedHoursRemaining === Infinity ? 'N/A' : Math.round(estimatedHoursRemaining * 10) / 10
  };
}

function saveResourceReport(report = null) {
  const finalReport = report || generateResourceReport();
  try {
    const reportPath = getResourceReportPath();
    fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));
    console.log(`[Resource Monitor] 资源报告已保存: ${reportPath}`);
    return true;
  } catch (error) {
    console.error('[Resource Monitor] 保存报告失败:', error.message);
    return false;
  }
}

// ============== 初始化 ==============

function initialize({ teamName, sessionId = null, budget = null }) {
  state.teamName = teamName;
  state.sessionId = sessionId || `session_${Date.now()}`;
  state.startTime = new Date().toISOString();
  state.isInitialized = true;

  // 加载已有状态
  loadState();

  // 设置预算
  if (budget) {
    setBudget(budget.limit || BUDGET_CONFIG.defaultBudget, budget.currency || 'USD');
  }

  console.log(`[Resource Monitor] 已初始化 | Team: ${teamName} | Session: ${state.sessionId}`);

  saveState();

  return state;
}

function shutdown() {
  console.log('[Resource Monitor] 正在关闭...');

  // 生成最终报告
  const finalReport = generateResourceReport();
  saveResourceReport(finalReport);

  state.isInitialized = false;

  console.log('[Resource Monitor] 已关闭');

  return finalReport;
}

// ============== 查询功能 ==============

function getStats() {
  return {
    teamName: state.teamName,
    sessionId: state.sessionId,
    isInitialized: state.isInitialized,
    budget: state.budget,
    totalTokenRecords: state.tokenRecords.length,
    totalMCPRecords: state.mcpRecords.length,
    agentCount: state.agentStats.size,
    alertCount: state.alerts.length
  };
}

function getAgentStats(agentId) {
  return state.agentStats.get(agentId) || null;
}

function getAllAgentStats() {
  return Array.from(state.agentStats.values());
}

function getAlerts(level = null) {
  if (level) {
    return state.alerts.filter(a => a.level === level);
  }
  return state.alerts;
}

// ============== CLI 入口 ==============

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'init':
      const teamName = args[args.indexOf('--team') + 1];
      const budgetLimit = parseFloat(args[args.indexOf('--budget') + 1]);
      if (!teamName) {
        console.error('用法: node resource-monitor.js init --team <team_name> [--budget <limit>]');
        process.exit(1);
      }
      initialize({
        teamName,
        budget: budgetLimit ? { limit: budgetLimit } : null
      });
      break;

    case 'report':
      loadState();
      const report = generateResourceReport();
      console.log(JSON.stringify(report, null, 2));
      saveResourceReport(report);
      break;

    case 'stats':
      loadState();
      console.log(JSON.stringify(getStats(), null, 2));
      break;

    case 'shutdown':
      loadState();
      shutdown();
      break;

    default:
      console.log(`
用法: node resource-monitor.js <command> [options]

命令:
  init --team <name> [--budget <limit>]  初始化监控
  report                                  生成资源报告
  stats                                   显示统计信息
  shutdown                                关闭监控并生成最终报告

示例:
  node resource-monitor.js init --team my-team --budget 50
  node resource-monitor.js report
      `);
  }
}

// ============== 导出模块 ==============

module.exports = {
  // 初始化
  initialize,
  shutdown,

  // 记录功能
  recordTokenUsage,
  recordMCPCall,

  // 预算管理
  setBudget,
  checkBudgetAlert,

  // 报告生成
  generateResourceReport,
  saveResourceReport,

  // 查询
  getStats,
  getAgentStats,
  getAllAgentStats,
  getAlerts,

  // 配置
  TOKEN_PRICING,
  BUDGET_CONFIG,

  // 工具函数
  calculateCost,
  getModelPricing
};
