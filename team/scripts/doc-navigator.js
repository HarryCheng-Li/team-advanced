#!/usr/bin/env node
/**
 * Team Skill 文档导航工具
 * v1.0.0
 *
 * 使用方法:
 *   node doc-navigator.js --topic "health-check"
 *   node doc-navigator.js --search "message"
 *   node doc-navigator.js --list
 *   node doc-navigator.js --map
 */

const fs = require('fs');
const path = require('path');

// 文档索引
const DOC_INDEX = [
  // 核心文档
  { path: 'SKILL.md', title: 'Team Skill 主文档', topics: ['quickstart', 'core', 'phases', 'roles'], type: 'core' },
  { path: 'KNOWLEDGE-MAP.md', title: '知识地图', topics: ['navigation', 'index', 'guide'], type: 'core' },
  { path: 'METADATA.json', title: '技能元数据', topics: ['metadata', 'config'], type: 'core' },

  // 角色文档
  { path: 'personas/coordinator.md', title: 'Coordinator 指南', topics: ['coordinator', 'coordination', 'management'], type: 'persona' },
  { path: 'personas/supervisor.md', title: 'Supervisor 指南', topics: ['supervisor', 'health-check', 'monitoring'], type: 'persona' },
  { path: 'personas/user-service/product-owner.md', title: 'Product Owner', topics: ['product-owner', 'user', 'requirements'], type: 'persona' },
  { path: 'personas/user-service/user-translator.md', title: 'User Translator', topics: ['user-translator', 'communication'], type: 'persona' },
  { path: 'personas/user-service/qa-verifier.md', title: 'QA Verifier', topics: ['qa-verifier', 'testing', 'verification'], type: 'persona' },
  { path: 'personas/technical/architect.md', title: 'Architect', topics: ['architect', 'architecture', 'design'], type: 'persona' },
  { path: 'personas/technical/tech-lead.md', title: 'Tech Lead', topics: ['tech-lead', 'leadership'], type: 'persona' },
  { path: 'personas/technical/backend-developer.md', title: 'Backend Developer', topics: ['backend', 'developer', 'api'], type: 'persona' },
  { path: 'personas/technical/frontend-developer.md', title: 'Frontend Developer', topics: ['frontend', 'developer', 'ui'], type: 'persona' },
  { path: 'personas/technical/database-designer.md', title: 'Database Designer', topics: ['database', 'schema', 'sql'], type: 'persona' },
  { path: 'personas/technical/test-engineer.md', title: 'Test Engineer', topics: ['test', 'testing', 'qa'], type: 'persona' },
  { path: 'personas/research/tech-scout.md', title: 'Tech Scout', topics: ['research', 'scout', 'investigation'], type: 'persona' },
  { path: 'personas/research/repo-analyst.md', title: 'Repo Analyst', topics: ['analysis', 'repository', 'code-review'], type: 'persona' },

  // Phase 文档
  { path: 'phases/phase-00-instincts.md', title: 'Phase 0: Instincts', topics: ['instincts', 'memory', 'learning'], type: 'phase' },
  { path: 'phases/phase-01-due-diligence.md', title: 'Phase 1: Due Diligence', topics: ['research', 'investigation', 'due-diligence'], type: 'phase' },
  { path: 'phases/phase-02-clarification.md', title: 'Phase 2: Clarification', topics: ['requirements', 'clarification', 'interview'], type: 'phase' },
  { path: 'phases/phase-03-deep-search.md', title: 'Phase 3: Deep Search', topics: ['search', 'deep-search', 'technical'], type: 'phase' },
  { path: 'phases/phase-04-architecture.md', title: 'Phase 4: Architecture', topics: ['architecture', 'design', 'decisions'], type: 'phase' },
  { path: 'phases/phase-05-execution.md', title: 'Phase 5: Execution', topics: ['execution', 'implementation', 'coding'], type: 'phase' },
  { path: 'phases/phase-05.5-verification.md', title: 'Phase 5.5: Verification', topics: ['verification', 'testing', 'quality'], type: 'phase' },
  { path: 'phases/phase-06-acceptance.md', title: 'Phase 6: Acceptance', topics: ['acceptance', 'user', 'delivery'], type: 'phase' },
  { path: 'phases/phase-07-delivery.md', title: 'Phase 7: Delivery', topics: ['delivery', 'documentation', 'handover'], type: 'phase' },
  { path: 'phases/phase-08-learning.md', title: 'Phase 8: Learning', topics: ['learning', 'improvement', 'feedback'], type: 'phase' },

  // 参考文档
  { path: 'references/roles.md', title: '角色系统', topics: ['roles', 'personas', 'agents'], type: 'reference' },
  { path: 'references/saga-pattern.md', title: 'Saga 模式', topics: ['saga', 'transaction', 'compensation'], type: 'reference' },
  { path: 'references/iron-laws.md', title: 'Iron Laws 铁律', topics: ['iron-laws', 'rules', 'principles'], type: 'reference' },
  { path: 'references/anti-patterns.md', title: 'Anti-Patterns 反模式', topics: ['anti-patterns', 'mistakes', 'avoid'], type: 'reference' },
  { path: 'references/resource-monitoring.md', title: '资源监控', topics: ['monitoring', 'resources', 'tokens', 'cost'], type: 'reference' },
  { path: 'references/architecture.md', title: '架构设计', topics: ['architecture', 'design', 'system'], type: 'reference' },
  { path: 'references/reliability-framework.md', title: '可靠性框架', topics: ['reliability', 'quality', 'assurance'], type: 'reference' },
  { path: 'references/communication-protocol.md', title: '通信协议', topics: ['communication', 'protocol', 'messages'], type: 'reference' },
  { path: 'references/rollback-recovery.md', title: '回滚恢复', topics: ['rollback', 'recovery', 'failure'], type: 'reference' },
  { path: 'references/specification-lock.md', title: '需求锁定', topics: ['requirements', 'lock', 'specification'], type: 'reference' },
  { path: 'references/enhanced-verification.md', title: '增强验证', topics: ['verification', 'testing', 'quality'], type: 'reference' },
  { path: 'references/adversarial-review.md', title: '对抗性审查', topics: ['review', 'adversarial', 'quality'], type: 'reference' },
  { path: 'references/scale-adaptation.md', title: '规模自适应', topics: ['scale', 'size', 'adaptation'], type: 'reference' },
  { path: 'references/findings-system.md', title: 'Findings 系统', topics: ['findings', 'issues', 'tracking'], type: 'reference' },
  { path: 'references/systematic-debugging.md', title: '系统化调试', topics: ['debugging', 'troubleshooting', 'fix'], type: 'reference' },
  { path: 'references/continuous-learning.md', title: '持续学习', topics: ['learning', 'improvement', 'feedback'], type: 'reference' },
  { path: 'references/instinct-evolution.md', title: 'Instinct 进化', topics: ['instincts', 'evolution', 'memory'], type: 'reference' },
  { path: 'references/organizational-memory.md', title: '组织记忆', topics: ['memory', 'knowledge', 'organization'], type: 'reference' },
  { path: 'references/non-technical-user-mode.md', title: '非技术用户模式', topics: ['user', 'non-technical', 'communication'], type: 'reference' },

  // Hook 文档
  { path: 'hooks/health-check.js', title: '健康检查实现', topics: ['health-check', 'monitoring', 'supervisor'], type: 'hook' },
  { path: 'hooks/resource-monitor.js', title: '资源监控实现', topics: ['monitoring', 'resources', 'tokens'], type: 'hook' },
  { path: 'hooks/saga-executor.js', title: 'Saga 执行器', topics: ['saga', 'execution', 'transaction'], type: 'hook' },
  { path: 'hooks/team-created.js', title: '团队创建钩子', topics: ['hooks', 'team', 'creation'], type: 'hook' },
  { path: 'hooks/team-deleted.js', title: '团队删除钩子', topics: ['hooks', 'team', 'deletion'], type: 'hook' },
  { path: 'hooks/session-start.js', title: '会话开始钩子', topics: ['hooks', 'session', 'start'], type: 'hook' },
  { path: 'hooks/session-end.js', title: '会话结束钩子', topics: ['hooks', 'session', 'end'], type: 'hook' },
  { path: 'hooks/hooks.json', title: 'Hook 配置', topics: ['hooks', 'config', 'registration'], type: 'hook' },

  // Party Mode
  { path: 'party-mode/party-mode.md', title: 'Party Mode', topics: ['party', 'discussion', 'collaboration'], type: 'party' },
  { path: 'party-mode/discussion-templates.md', title: '讨论模板', topics: ['templates', 'discussion', 'party'], type: 'party' },

  // 定制化
  { path: 'customization/customize-schema.yaml', title: '定制化 Schema', topics: ['customization', 'config', 'schema'], type: 'customization' },

  // Rules
  { path: 'rules/common/coding-style.md', title: '代码规范', topics: ['coding', 'style', 'rules'], type: 'rules' },
  { path: 'rules/common/security.md', title: '安全规范', topics: ['security', 'safety', 'rules'], type: 'rules' },
  { path: 'rules/common/testing.md', title: '测试规范', topics: ['testing', 'test', 'rules'], type: 'rules' },
  { path: 'rules/common/git-workflow.md', title: 'Git 工作流', topics: ['git', 'workflow', 'rules'], type: 'rules' },
  { path: 'rules/typescript/patterns.md', title: 'TypeScript 模式', topics: ['typescript', 'patterns', 'rules'], type: 'rules' },
  { path: 'rules/typescript/tools.md', title: 'TypeScript 工具', topics: ['typescript', 'tools', 'rules'], type: 'rules' },

  // 示例
  { path: 'examples/first-team-task.md', title: '第一个团队任务', topics: ['tutorial', 'example', 'getting-started'], type: 'example' },

  // 故障排查
  { path: 'troubleshooting/health-check-issues.md', title: '健康检查问题', topics: ['troubleshooting', 'health-check', 'issues'], type: 'troubleshooting' },
  { path: 'troubleshooting/message-issues.md', title: '消息确认问题', topics: ['troubleshooting', 'messages', 'issues'], type: 'troubleshooting' },
  { path: 'troubleshooting/performance.md', title: '性能优化', topics: ['troubleshooting', 'performance', 'optimization'], type: 'troubleshooting' },

  // 测试
  { path: 'tests/README.md', title: '测试指南', topics: ['testing', 'test', 'guide'], type: 'test' },
];

// 主题映射
const TOPIC_MAPPINGS = {
  'health-check': ['health-check', 'monitoring', 'supervisor', 'health'],
  'message': ['messages', 'communication', 'protocol', 'messaging'],
  'mcp': ['mcp', 'tools', 'execution'],
  'saga': ['saga', 'transaction', 'compensation'],
  'role': ['roles', 'personas', 'agents'],
  'phase': ['phases', 'execution', 'workflow'],
  'reliability': ['reliability', 'quality', 'assurance', 'monitoring'],
  'performance': ['performance', 'optimization', 'resources'],
  'troubleshooting': ['troubleshooting', 'debugging', 'issues', 'fix'],
  'architecture': ['architecture', 'design', 'system'],
  'customization': ['customization', 'config', 'schema'],
  'party': ['party', 'discussion', 'collaboration'],
  'testing': ['testing', 'test', 'verification'],
  'security': ['security', 'safety'],
};

// 获取技能根目录
function getSkillDir() {
  return path.dirname(path.dirname(__filename));
}

// 搜索文档
function searchDocs(query) {
  const normalizedQuery = query.toLowerCase();
  const results = [];

  for (const doc of DOC_INDEX) {
    const matchScore = calculateMatchScore(doc, normalizedQuery);
    if (matchScore > 0) {
      results.push({ ...doc, score: matchScore });
    }
  }

  // 按匹配度排序
  results.sort((a, b) => b.score - a.score);
  return results;
}

// 计算匹配分数
function calculateMatchScore(doc, query) {
  let score = 0;

  // 标题匹配
  if (doc.title.toLowerCase().includes(query)) {
    score += 10;
  }

  // 路径匹配
  if (doc.path.toLowerCase().includes(query)) {
    score += 5;
  }

  // 主题匹配
  for (const topic of doc.topics) {
    if (topic.toLowerCase().includes(query)) {
      score += 3;
    }
  }

  // 扩展主题匹配
  for (const [key, topics] of Object.entries(TOPIC_MAPPINGS)) {
    if (key.includes(query) || query.includes(key)) {
      for (const topic of topics) {
        if (doc.topics.includes(topic)) {
          score += 2;
        }
      }
    }
  }

  return score;
}

// 按主题查找文档
function findByTopic(topic) {
  const normalizedTopic = topic.toLowerCase();
  const results = [];

  // 直接匹配
  for (const doc of DOC_INDEX) {
    if (doc.topics.some(t => t.toLowerCase().includes(normalizedTopic))) {
      results.push(doc);
    }
  }

  // 映射主题匹配
  if (TOPIC_MAPPINGS[normalizedTopic]) {
    const mappedTopics = TOPIC_MAPPINGS[normalizedTopic];
    for (const doc of DOC_INDEX) {
      if (mappedTopics.some(t => doc.topics.includes(t))) {
        if (!results.find(r => r.path === doc.path)) {
          results.push(doc);
        }
      }
    }
  }

  return results;
}

// 列出所有文档
function listAllDocs() {
  const byType = {};

  for (const doc of DOC_INDEX) {
    if (!byType[doc.type]) {
      byType[doc.type] = [];
    }
    byType[doc.type].push(doc);
  }

  return byType;
}

// 打印搜索结果
function printSearchResults(results, query) {
  console.log(`\n=== 搜索结果: "${query}" ===\n`);

  if (results.length === 0) {
    console.log('未找到相关文档。');
    console.log('\n建议:');
    console.log('  - 尝试使用不同的关键词');
    console.log('  - 使用 --list 查看所有文档');
    return;
  }

  console.log(`找到 ${results.length} 个相关文档:\n`);

  for (let i = 0; i < Math.min(results.length, 10); i++) {
    const doc = results[i];
    const fullPath = path.join(getSkillDir(), doc.path);
    const exists = fs.existsSync(fullPath) ? '' : ' [缺失]';

    console.log(`${i + 1}. ${doc.title}${exists}`);
    console.log(`   路径: ${doc.path}`);
    console.log(`   类型: ${doc.type}`);
    console.log(`   主题: ${doc.topics.join(', ')}`);
    if (doc.score) {
      console.log(`   相关度: ${'★'.repeat(Math.min(Math.ceil(doc.score / 3), 5))}`);
    }
    console.log();
  }

  if (results.length > 10) {
    console.log(`... 还有 ${results.length - 10} 个结果`);
  }
}

// 打印主题结果
function printTopicResults(results, topic) {
  console.log(`\n=== 主题: "${topic}" ===\n`);

  if (results.length === 0) {
    console.log('未找到相关文档。');
    return;
  }

  // 按类型分组
  const byType = {};
  for (const doc of results) {
    if (!byType[doc.type]) {
      byType[doc.type] = [];
    }
    byType[doc.type].push(doc);
  }

  for (const [type, docs] of Object.entries(byType)) {
    console.log(`\n${type.toUpperCase()} (${docs.length}):`);
    for (const doc of docs) {
      const fullPath = path.join(getSkillDir(), doc.path);
      const exists = fs.existsSync(fullPath) ? '' : ' [缺失]';
      console.log(`  - ${doc.title}${exists}`);
      console.log(`    ${doc.path}`);
    }
  }
}

// 打印所有文档
function printAllDocs() {
  const byType = listAllDocs();

  console.log('\n=== 所有文档 ===\n');

  const typeOrder = ['core', 'persona', 'phase', 'reference', 'hook', 'party', 'customization', 'rules', 'example', 'troubleshooting', 'test'];

  for (const type of typeOrder) {
    const docs = byType[type];
    if (docs && docs.length > 0) {
      console.log(`\n${type.toUpperCase()} (${docs.length}):`);
      for (const doc of docs) {
        const fullPath = path.join(getSkillDir(), doc.path);
        const exists = fs.existsSync(fullPath) ? '✓' : '✗';
        console.log(`  [${exists}] ${doc.title}`);
        console.log(`      ${doc.path}`);
      }
    }
  }

  // 统计
  const total = DOC_INDEX.length;
  let existing = 0;
  for (const doc of DOC_INDEX) {
    const fullPath = path.join(getSkillDir(), doc.path);
    if (fs.existsSync(fullPath)) {
      existing++;
    }
  }

  console.log(`\n\n总计: ${existing}/${total} 个文档存在`);
}

// 打印知识地图
function printKnowledgeMap() {
  console.log('\n=== Team Skill 知识地图 ===\n');

  console.log('快速开始:');
  console.log('  1. SKILL.md - 主文档和快速启动');
  console.log('  2. KNOWLEDGE-MAP.md - 本文档的完整版');
  console.log('  3. examples/first-team-task.md - 实战教程');

  console.log('\n核心概念:');
  console.log('  - personas/coordinator.md - 协调者角色');
  console.log('  - personas/supervisor.md - 监督者角色');
  console.log('  - references/roles.md - 所有角色定义');
  console.log('  - references/iron-laws.md - 核心规则');

  console.log('\n执行流程:');
  console.log('  - phases/ - 8 个 Phase 文件');
  console.log('  - references/saga-pattern.md - 事务管理');
  console.log('  - party-mode/party-mode.md - 讨论模式');

  console.log('\n可靠性:');
  console.log('  - hooks/health-check.js - 健康检查');
  console.log('  - references/resource-monitoring.md - 资源监控');
  console.log('  - references/reliability-framework.md - 可靠性设计');

  console.log('\n故障排查:');
  console.log('  - troubleshooting/health-check-issues.md');
  console.log('  - troubleshooting/message-issues.md');
  console.log('  - troubleshooting/performance.md');

  console.log('\n开发参考:');
  console.log('  - references/architecture.md - 架构设计');
  console.log('  - tests/README.md - 测试指南');
  console.log('  - rules/common/coding-style.md - 代码规范');
}

// 主函数
function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Team Skill 文档导航工具

用法:
  node doc-navigator.js [选项]

选项:
  --topic, -t <主题>    按主题查找文档
  --search, -s <关键词> 搜索文档
  --list, -l            列出所有文档
  --map, -m             显示知识地图
  --help, -h            显示帮助

示例:
  node doc-navigator.js --topic health-check
  node doc-navigator.js --search "message"
  node doc-navigator.js --list
  node doc-navigator.js --map
`);
    return;
  }

  const topicIndex = args.findIndex(arg => arg === '--topic' || arg === '-t');
  const searchIndex = args.findIndex(arg => arg === '--search' || arg === '-s');

  if (topicIndex !== -1 && args[topicIndex + 1]) {
    const topic = args[topicIndex + 1];
    const results = findByTopic(topic);
    printTopicResults(results, topic);
    return;
  }

  if (searchIndex !== -1 && args[searchIndex + 1]) {
    const query = args[searchIndex + 1];
    const results = searchDocs(query);
    printSearchResults(results, query);
    return;
  }

  if (args.includes('--list') || args.includes('-l')) {
    printAllDocs();
    return;
  }

  if (args.includes('--map') || args.includes('-m')) {
    printKnowledgeMap();
    return;
  }

  // 默认显示知识地图
  printKnowledgeMap();
}

main();
