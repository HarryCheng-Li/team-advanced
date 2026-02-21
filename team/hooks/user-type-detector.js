/**
 * User Type Detector
 * 自动检测用户类型：技术/非技术/混合
 */

// 技术术语词典
const TECHNICAL_TERMS = [
  // 编程相关
  'API', 'database', 'schema', 'endpoint', 'REST', 'GraphQL',
  'function', 'class', 'module', 'dependency', 'import', 'export',
  'variable', 'constant', 'async', 'await', 'promise', 'callback',
  'interface', 'type', 'generic', 'namespace', 'package', 'library',
  'framework', 'runtime', 'compiler', 'interpreter', 'debugger',

  // 架构相关
  'microservice', 'monolith', 'serverless', 'container', 'docker', 'kubernetes',
  'k8s', 'orchestration', 'load balancer', 'gateway', 'service mesh',
  'event-driven', 'CQRS', 'event sourcing', 'DDD', 'domain-driven',
  '架构', '微服务', '单体', '无服务器',

  // 前端相关
  'react', 'vue', 'angular', 'component', 'state', 'props', 'hook',
  'redux', 'mobx', 'vuex', 'jsx', 'tsx', 'webpack', 'vite', 'rollup',
  'bundler', 'transpiler', 'babel', 'typescript', 'javascript', 'css',
  'sass', 'less', 'tailwind', 'bootstrap', 'dom', 'virtual dom',
  'useMemo', 'React.memo', 'useEffect', 'useState', 'useCallback',
  '前端', '组件', '渲染', '虚拟DOM',

  // 后端相关
  'server', 'middleware', 'authentication', 'authorization', 'jwt', 'oauth',
  'session', 'cookie', 'cors', 'csrf', 'xss', 'sql injection',
  'node.js', 'nodejs', 'express', 'koa', 'fastify', 'nest', 'django',
  'flask', 'spring', 'spring boot', 'laravel', 'rails', 'gin',
  '后端', '中间件', '认证', '授权', '登录', '注册',

  // 数据库相关
  'SQL', 'NoSQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'index',
  'query', 'transaction', 'ACID', 'CAP', 'sharding', 'replication',
  'ORM', 'ODM', 'migration', 'seed', 'backup', 'restore',
  '数据库', '查询', '索引', '事务', '分片', '备份',

  // DevOps相关
  'CI/CD', 'pipeline', 'deployment', 'github actions', 'jenkins',
  'gitlab', 'travis', 'circleci', 'terraform', 'ansible', 'puppet',
  'chef', 'vagrant', 'helm', 'argo', 'prometheus', 'grafana',
  '部署', '流水线', '持续集成', '持续部署',

  // 云服务相关
  'AWS', 'Azure', 'GCP', 'cloud', 'lambda', 'ec2', 's3', 'rds',
  'cloudfront', 'route53', 'elb', 'ecs', 'eks', 'fargate',
  '阿里云', '腾讯云', '华为云', '云计算',

  // 其他技术
  'AI', 'ML', 'machine learning', 'deep learning', 'neural network',
  'blockchain', 'web3', 'ethereum', 'smart contract', 'defi', 'nft',
  'git', 'github', 'gitlab', 'version control', 'branch', 'merge',
  'pull request', 'commit', 'repository', 'clone', 'fork',
  '人工智能', '机器学习', '深度学习', '区块链', '智能合约',

  // 测试相关
  'unit test', 'integration test', 'e2e test', 'jest', 'mocha',
  'cypress', 'playwright', 'selenium', 'TDD', 'BDD', 'mock', 'stub',
  '单元测试', '集成测试', '测试',

  // 安全相关
  'encryption', 'hash', 'ssl', 'tls', 'https', 'firewall', 'vpn',
  'penetration test', 'vulnerability', 'exploit', 'sandbox',
  '加密', '哈希', '防火墙', '安全',

  // 性能相关
  'cache', 'caching', 'CDN', 'lazy loading', 'code splitting',
  'bundle size', 'memory leak', 'garbage collection', 'profiler',
  '缓存', '缓存穿透', '缓存雪崩', '性能', '优化', '内存泄漏',

  // 协议相关
  'HTTP', 'HTTPS', 'TCP', 'UDP', 'WebSocket', 'gRPC', 'protobuf',
  'JSON', 'XML', 'YAML', 'toml', 'protobuf', 'thrift',
  '协议', '心跳机制', '重连逻辑',

  // 操作系统相关
  'linux', 'unix', 'bash', 'shell', 'cron', 'systemd', 'dockerfile',
  'docker-compose', 'image', 'container', 'volume', 'network',
  '容器', '镜像', '网络', '卷',

  // 编程语言
  'python', 'java', 'go', 'golang', 'rust', 'c++', 'cpp', 'c#', 'csharp',
  'php', 'ruby', 'swift', 'kotlin', 'scala', 'r', 'matlab',
  '编程', '代码', '脚本'
];

// 非技术术语词典（用于辅助判断）
const NON_TECHNICAL_INDICATORS = [
  '简单', '通俗', '易懂', '不懂', '不会', '新手', '入门',
  'explain', 'simple', 'easy', 'beginner', 'newbie', 'layman',
  'non-technical', 'business', 'manager', 'executive', 'stakeholder'
];

// 混合用户指标（有一定技术知识但需要指导）
const MIXED_USER_INDICATORS = [
  // 咨询语气
  '用什么', '怎么', '如何', '好吗', '怎么样', '可以吗',
  '应该', '推荐', '建议', '选择', '选型', '对比', '区别',
  '适合', '合适', '更好', '优势', '劣势', '优缺点',

  // 学习语气
  '讲讲', '解释', '说明', '介绍一下', '科普',
  '听说', '了解到', '想知道', '想了解一下',
  '刚开始', '准备学', '入门', '基础',

  // 部分技术决策
  '前端', '后端', '数据库', '服务器', '框架',
  '技术', '方案', '架构', '选型'
];

/**
 * 检测用户类型
 * @param {string} userInput - 用户输入文本
 * @returns {string} - 'technical' | 'non-technical' | 'mixed'
 */
function detectUserType(userInput) {
  if (!userInput || typeof userInput !== 'string') {
    return 'non-technical';
  }

  const normalizedInput = userInput.toLowerCase();

  // 改进的词数统计（支持中英文）
  // 中文按字符计数，英文按单词计数
  const chineseChars = (userInput.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (userInput.match(/[a-zA-Z]+/g) || []).length;
  const wordCount = chineseChars + englishWords;

  if (wordCount === 0) {
    return 'non-technical';
  }

  // 统计匹配的技术术语
  // 英文术语使用单词边界匹配，中文术语使用包含匹配
  const matchedTerms = TECHNICAL_TERMS.filter(term => {
    const lowerTerm = term.toLowerCase();
    // 中文术语（包含中文字符）使用包含匹配
    if (/[\u4e00-\u9fa5]/.test(term)) {
      return normalizedInput.includes(lowerTerm);
    }
    // 英文术语使用单词边界匹配
    // 特殊处理带点或特殊字符的术语
    const escapedTerm = lowerTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedTerm}\\b`, 'i');
    return regex.test(userInput);
  });
  const termCount = matchedTerms.length;

  // 统计非技术指标
  const nonTechCount = NON_TECHNICAL_INDICATORS.filter(indicator =>
    normalizedInput.includes(indicator.toLowerCase())
  ).length;

  // 统计混合用户指标
  const mixedIndicators = MIXED_USER_INDICATORS.filter(indicator =>
    normalizedInput.includes(indicator.toLowerCase())
  ).length;

  // 计算技术术语密度
  const density = termCount / wordCount;

  // 检测代码片段（包含特殊符号）
  const hasCodeSnippet = /[{};<>]=|`[^`]+`|\([^)]*\)/.test(userInput);

  // 检测文件扩展名
  const hasFileExtension = /\.(js|ts|jsx|tsx|py|java|go|rs|cpp|c|h|php|rb|sql|yaml|yml|json|xml|html|css|scss|sass|less)$/i.test(userInput);

  // 检测命令行指令
  const hasCommandLine = /^(npm|yarn|pip|gem|cargo|go\s+get|docker|kubectl|git|curl|wget)\s/i.test(userInput);

  // 检测问题语气（问号、咨询词）
  const hasQuestionMark = userInput.includes('?') || userInput.includes('？');
  const hasConsultationTone = /(怎么|如何|什么|哪个|好吗|可以吗|建议|推荐)/.test(normalizedInput);

  // 综合评分
  let technicalScore = termCount + (hasCodeSnippet ? 3 : 0) + (hasFileExtension ? 2 : 0) + (hasCommandLine ? 2 : 0);
  let nonTechnicalScore = nonTechCount;
  let mixedScore = mixedIndicators + (hasQuestionMark ? 1 : 0) + (hasConsultationTone ? 1 : 0);

  // 检测技术动作词（表示用户知道自己在做什么）
  const technicalActions = /(优化|修复|解决|实现|部署|配置|开发|写|编写|调试|重构|集成)/.test(normalizedInput);
  const technicalProblemSolving = /(失败|错误|问题|bug|冲突|太慢|不稳定|异常)/.test(normalizedInput);

  // 检测明确的咨询语气（表示用户需要建议）
  const askingForAdvice = /(用什么|怎么|如何|好吗|怎么样|可以吗|应该|推荐|建议|适合|合适)/.test(normalizedInput);
  const askingForExplanation = /(讲讲|解释|说明|介绍一下|科普|了解)/.test(normalizedInput);

  // ===== 判断逻辑 =====

  // 1. 强技术信号 -> technical
  // - 5+ 技术术语
  // - 密度 > 20%
  // - 有代码片段且2+术语
  // - 有文件扩展名或命令行
  if (technicalScore >= 5 || density > 0.2 || (hasCodeSnippet && termCount >= 2) ||
      (hasFileExtension && termCount >= 1) || (hasCommandLine && termCount >= 1)) {
    return 'technical';
  }

  // 2. 特定技术概念 + 实现意图 -> technical（优先判定）
  const specificTechTerms = /(useMemo|React\.memo|心跳机制|重连逻辑|缓存穿透|雪崩|WebSocket|Redis|SQL|GraphQL|index|query|pipeline)/i.test(userInput);
  if (specificTechTerms && termCount >= 2 && !askingForExplanation) {
    return 'technical';
  }

  // 3. 技术动作 + 技术问题 -> technical（用户在解决技术问题）
  if (termCount >= 2 && (technicalActions || technicalProblemSolving) && !askingForAdvice) {
    return 'technical';
  }

  // 4. 无技术术语 -> non-technical
  if (termCount === 0) {
    return 'non-technical';
  }

  // 5. 1-2个技术术语 + 咨询语气 -> mixed
  if (termCount >= 1 && termCount <= 2 && (askingForAdvice || askingForExplanation)) {
    return 'mixed';
  }

  // 6. 学习路径咨询（编程相关）-> mixed
  const learningProgramming = /(学习编程|学编程|学Python|学Java|学JavaScript|学React)/.test(normalizedInput);
  if (learningProgramming) {
    return 'mixed';
  }

  // 7. 3-4个技术术语 + 强咨询语气 + 低密度 -> mixed
  if (termCount >= 3 && termCount <= 4 && mixedScore >= 2 && askingForAdvice && density < 0.15) {
    return 'mixed';
  }

  // 8. 架构咨询（特定模式）-> mixed
  const architectureConsultation = /(架构.*适合|适合.*项目|架构.*好|技术.*比较好)/.test(normalizedInput);
  if (architectureConsultation && termCount >= 1 && termCount <= 2) {
    return 'mixed';
  }

  // 6. 明确非技术指标 -> non-technical
  if (nonTechnicalScore > 0 && termCount < 2) {
    return 'non-technical';
  }

  // 7. 默认：有技术术语但没有强技术信号
  if (termCount >= 3) {
    return 'technical';
  } else if (termCount >= 1) {
    return 'mixed';
  } else {
    return 'non-technical';
  }
}

/**
 * 获取详细的检测结果
 * @param {string} userInput - 用户输入文本
 * @returns {object} - 详细的检测信息
 */
function getDetailedAnalysis(userInput) {
  if (!userInput || typeof userInput !== 'string') {
    return {
      userType: 'non-technical',
      confidence: 0,
      matchedTerms: [],
      density: 0,
      indicators: {}
    };
  }

  const normalizedInput = userInput.toLowerCase();

  // 改进的词数统计（支持中英文）
  const chineseChars = (userInput.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (userInput.match(/[a-zA-Z]+/g) || []).length;
  const wordCount = chineseChars + englishWords;

  // 使用与detectUserType相同的匹配逻辑
  const matchedTerms = TECHNICAL_TERMS.filter(term => {
    const lowerTerm = term.toLowerCase();
    if (/[\u4e00-\u9fa5]/.test(term)) {
      return normalizedInput.includes(lowerTerm);
    }
    const escapedTerm = lowerTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedTerm}\\b`, 'i');
    return regex.test(userInput);
  });

  const hasCodeSnippet = /[{};<>]=|`[^`]+`|\([^)]*\)/.test(userInput);
  const hasFileExtension = /\.(js|ts|jsx|tsx|py|java|go|rs|cpp|c|h|php|rb|sql|yaml|yml|json|xml|html|css|scss|sass|less)$/i.test(userInput);
  const hasCommandLine = /^(npm|yarn|pip|gem|cargo|go\s+get|docker|kubectl|git|curl|wget)\s/i.test(userInput);
  const hasQuestionMark = userInput.includes('?') || userInput.includes('？');
  const hasConsultationTone = /(怎么|如何|什么|哪个|好吗|可以吗|建议|推荐)/.test(normalizedInput);
  const mixedIndicators = MIXED_USER_INDICATORS.filter(indicator =>
    normalizedInput.includes(indicator.toLowerCase())
  ).length;

  const userType = detectUserType(userInput);

  // 计算置信度
  let confidence;
  if (userType === 'technical') {
    confidence = Math.min(0.95, 0.6 + (matchedTerms.length * 0.05));
  } else if (userType === 'non-technical') {
    confidence = Math.min(0.95, 0.7 + (matchedTerms.length === 0 ? 0.2 : 0));
  } else {
    confidence = 0.6;
  }

  return {
    userType,
    confidence,
    matchedTerms,
    density: wordCount > 0 ? matchedTerms.length / wordCount : 0,
    indicators: {
      hasCodeSnippet,
      hasFileExtension,
      hasCommandLine,
      hasQuestionMark,
      hasConsultationTone,
      mixedIndicators,
      termCount: matchedTerms.length,
      wordCount
    }
  };
}

/**
 * 批量检测多个输入
 * @param {string[]} inputs - 用户输入数组
 * @returns {object[]} - 每个输入的检测结果
 */
function batchDetect(inputs) {
  return inputs.map((input, index) => ({
    index,
    input: input.substring(0, 100) + (input.length > 100 ? '...' : ''),
    ...getDetailedAnalysis(input)
  }));
}

// 导出模块
module.exports = {
  detectUserType,
  getDetailedAnalysis,
  batchDetect,
  TECHNICAL_TERMS,
  NON_TECHNICAL_INDICATORS,
  MIXED_USER_INDICATORS
};

// 如果直接运行此文件，执行测试
if (require.main === module) {
  console.log('=== User Type Detector Test ===\n');

  const testCases = [
    // 技术用户
    '我需要实现一个REST API，使用Node.js和Express框架，数据库用PostgreSQL，还要做JWT认证',
    '帮我优化这个React组件的渲染性能，考虑使用useMemo和React.memo',
    'docker-compose.yml配置有问题，service启动失败，日志显示端口冲突',

    // 非技术用户
    '我想做一个网站，可以卖我的手工产品',
    '请帮我解释一下什么是云计算，用简单的话',
    '我不懂技术，但是想要一个手机App来管理我的店铺',

    // 混合用户
    '我想做一个电商平台，需要用户注册登录功能，用什么技术比较好？',
    '我们的系统太慢了，听说可以用Redis缓存，能解释一下吗？',
    '我想用AI来自动回复客户消息，但是不知道怎么开始'
  ];

  testCases.forEach((test, index) => {
    const result = getDetailedAnalysis(test);
    console.log(`Test ${index + 1}: ${result.userType.toUpperCase()}`);
    console.log(`  Input: ${test.substring(0, 60)}...`);
    console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`  Matched Terms: ${result.matchedTerms.slice(0, 5).join(', ')}${result.matchedTerms.length > 5 ? '...' : ''}`);
    console.log(`  Density: ${(result.density * 100).toFixed(1)}%`);
    console.log('');
  });
}
