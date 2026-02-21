/**
 * User Type Detector 测试套件
 * 测试检测算法的准确率
 */

const { detectUserType, getDetailedAnalysis, batchDetect } = require('../user-type-detector');

// 测试用例定义
const TEST_CASES = {
  technical: [
    {
      input: '我需要实现一个REST API，使用Node.js和Express框架，数据库用PostgreSQL，还要做JWT认证',
      expected: 'technical',
      description: '后端技术栈'
    },
    {
      input: '帮我优化这个React组件的渲染性能，考虑使用useMemo和React.memo',
      expected: 'technical',
      description: '前端性能优化'
    },
    {
      input: 'docker-compose.yml配置有问题，service启动失败，日志显示端口冲突',
      expected: 'technical',
      description: 'Docker配置问题'
    },
    {
      input: 'npm install 失败，提示peer dependency冲突，怎么解决？',
      expected: 'technical',
      description: 'NPM依赖问题'
    },
    {
      input: '我想用Kubernetes部署微服务，需要配置service mesh和ingress controller',
      expected: 'technical',
      description: 'K8s微服务架构'
    },
    {
      input: '这个SQL查询太慢了，已经加了index但还是慢，需要优化查询计划',
      expected: 'technical',
      description: '数据库优化'
    },
    {
      input: 'CI/CD pipeline需要集成SonarQube做代码质量检查，还要跑单元测试',
      expected: 'technical',
      description: 'DevOps流程'
    },
    {
      input: 'GraphQL schema设计有什么最佳实践？需要考虑N+1查询问题吗？',
      expected: 'technical',
      description: 'GraphQL设计'
    },
    {
      input: '我想用Redis做缓存，但是担心缓存穿透和雪崩问题',
      expected: 'technical',
      description: '缓存策略'
    },
    {
      input: 'WebSocket连接不稳定，需要实现心跳机制和重连逻辑',
      expected: 'technical',
      description: 'WebSocket实现'
    }
  ],

  nonTechnical: [
    {
      input: '我想做一个网站，可以卖我的手工产品',
      expected: 'non-technical',
      description: '简单电商需求'
    },
    {
      input: '请帮我解释一下什么是云计算，用简单的话',
      expected: 'non-technical',
      description: '概念解释请求'
    },
    {
      input: '我不懂技术，但是想要一个手机App来管理我的店铺',
      expected: 'non-technical',
      description: '明确非技术用户'
    },
    {
      input: '我想做一个像美团那样的外卖平台，需要多少钱？',
      expected: 'non-technical',
      description: '成本咨询'
    },
    {
      input: '我们公司想要数字化转型，不知道从哪里开始',
      expected: 'non-technical',
      description: '业务转型咨询'
    },
    {
      input: '请用通俗易懂的方式解释人工智能是什么',
      expected: 'non-technical',
      description: '通俗解释请求'
    },
    {
      input: '我想做一个在线教育平台，让学生可以上网课',
      expected: 'non-technical',
      description: '教育平台需求'
    },
    {
      input: '我是做餐饮的，想要一个点餐系统',
      expected: 'non-technical',
      description: '餐饮系统需求'
    },
    {
      input: '能给我讲讲什么是区块链吗？完全不懂技术',
      expected: 'non-technical',
      description: '零基础概念'
    },
    {
      input: '我想开发一个社交App，像微信那样的',
      expected: 'non-technical',
      description: '社交App需求'
    }
  ],

  mixed: [
    {
      input: '我想做一个电商平台，需要用户注册登录功能，用什么技术比较好？',
      expected: 'mixed',
      description: '业务需求+技术咨询'
    },
    {
      input: '我们的系统太慢了，听说可以用Redis缓存，能解释一下吗？',
      expected: 'mixed',
      description: '性能问题+技术概念'
    },
    {
      input: '我想用AI来自动回复客户消息，但是不知道怎么开始',
      expected: 'mixed',
      description: 'AI应用+入门咨询'
    },
    {
      input: '听说微服务架构很好，我的项目适合用吗？',
      expected: 'mixed',
      description: '架构咨询'
    },
    {
      input: '我想用React做前端，但是后端用什么还没想好',
      expected: 'mixed',
      description: '部分技术决策'
    },
    {
      input: '数据库是用SQL还是NoSQL好？我的数据关系比较复杂',
      expected: 'mixed',
      description: '数据库选型'
    },
    {
      input: '我想做一个实时聊天功能，WebSocket和轮询哪个好？',
      expected: 'mixed',
      description: '技术选型咨询'
    },
    {
      input: 'Serverless架构适合小型项目吗？成本如何？',
      expected: 'mixed',
      description: '架构+成本咨询'
    },
    {
      input: '我想学习编程，从Python开始好吗？',
      expected: 'mixed',
      description: '学习路径咨询'
    },
    {
      input: 'Docker和虚拟机有什么区别？我应该用哪个？',
      expected: 'mixed',
      description: '技术对比咨询'
    }
  ]
};

// 运行测试
function runTests() {
  console.log('=== User Type Detector Test Suite ===\n');

  let totalTests = 0;
  let passedTests = 0;
  const results = {
    technical: { total: 0, passed: 0, failed: [] },
    'non-technical': { total: 0, passed: 0, failed: [] },
    mixed: { total: 0, passed: 0, failed: [] }
  };

  // 测试技术用户用例
  console.log('--- Technical User Tests ---\n');
  TEST_CASES.technical.forEach((testCase, index) => {
    totalTests++;
    results.technical.total++;

    const result = detectUserType(testCase.input);
    const passed = result === testCase.expected;

    if (passed) {
      passedTests++;
      results.technical.passed++;
      console.log(`✓ Test ${index + 1} PASSED`);
    } else {
      results.technical.failed.push({
        index: index + 1,
        input: testCase.input,
        expected: testCase.expected,
        actual: result
      });
      console.log(`✗ Test ${index + 1} FAILED`);
    }

    console.log(`  Description: ${testCase.description}`);
    console.log(`  Input: ${testCase.input.substring(0, 60)}...`);
    console.log(`  Expected: ${testCase.expected}, Actual: ${result}\n`);
  });

  // 测试非技术用户用例
  console.log('--- Non-Technical User Tests ---\n');
  TEST_CASES.nonTechnical.forEach((testCase, index) => {
    totalTests++;
    results['non-technical'].total++;

    const result = detectUserType(testCase.input);
    const passed = result === testCase.expected;

    if (passed) {
      passedTests++;
      results['non-technical'].passed++;
      console.log(`✓ Test ${index + 1} PASSED`);
    } else {
      results['non-technical'].failed.push({
        index: index + 1,
        input: testCase.input,
        expected: testCase.expected,
        actual: result
      });
      console.log(`✗ Test ${index + 1} FAILED`);
    }

    console.log(`  Description: ${testCase.description}`);
    console.log(`  Input: ${testCase.input.substring(0, 60)}...`);
    console.log(`  Expected: ${testCase.expected}, Actual: ${result}\n`);
  });

  // 测试混合用户用例
  console.log('--- Mixed User Tests ---\n');
  TEST_CASES.mixed.forEach((testCase, index) => {
    totalTests++;
    results.mixed.total++;

    const result = detectUserType(testCase.input);
    const passed = result === testCase.expected;

    if (passed) {
      passedTests++;
      results.mixed.passed++;
      console.log(`✓ Test ${index + 1} PASSED`);
    } else {
      results.mixed.failed.push({
        index: index + 1,
        input: testCase.input,
        expected: testCase.expected,
        actual: result
      });
      console.log(`✗ Test ${index + 1} FAILED`);
    }

    console.log(`  Description: ${testCase.description}`);
    console.log(`  Input: ${testCase.input.substring(0, 60)}...`);
    console.log(`  Expected: ${testCase.expected}, Actual: ${result}\n`);
  });

  // 统计报告
  console.log('=== Test Summary ===\n');
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${totalTests - passedTests}`);
  console.log(`Accuracy: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

  console.log('Breakdown by Category:');
  console.log(`  Technical: ${results.technical.passed}/${results.technical.total} (${((results.technical.passed / results.technical.total) * 100).toFixed(1)}%)`);
  console.log(`  Non-Technical: ${results['non-technical'].passed}/${results['non-technical'].total} (${((results['non-technical'].passed / results['non-technical'].total) * 100).toFixed(1)}%)`);
  console.log(`  Mixed: ${results.mixed.passed}/${results.mixed.total} (${((results.mixed.passed / results.mixed.total) * 100).toFixed(1)}%)\n`);

  // 显示失败详情
  const allFailed = [
    ...results.technical.failed.map(f => ({ ...f, category: 'Technical' })),
    ...results['non-technical'].failed.map(f => ({ ...f, category: 'Non-Technical' })),
    ...results.mixed.failed.map(f => ({ ...f, category: 'Mixed' }))
  ];

  if (allFailed.length > 0) {
    console.log('=== Failed Tests Details ===\n');
    allFailed.forEach(fail => {
      console.log(`${fail.category} Test ${fail.index}:`);
      console.log(`  Input: ${fail.input}`);
      console.log(`  Expected: ${fail.expected}, Actual: ${fail.actual}\n`);
    });
  }

  return {
    total: totalTests,
    passed: passedTests,
    failed: totalTests - passedTests,
    accuracy: passedTests / totalTests,
    results
  };
}

// 测试详细分析功能
function testDetailedAnalysis() {
  console.log('\n=== Detailed Analysis Test ===\n');

  const testInput = '我需要用React和Node.js做一个电商平台，数据库用MongoDB，还要做Redis缓存';
  const analysis = getDetailedAnalysis(testInput);

  console.log('Input:', testInput);
  console.log('User Type:', analysis.userType);
  console.log('Confidence:', (analysis.confidence * 100).toFixed(1) + '%');
  console.log('Matched Terms:', analysis.matchedTerms.join(', '));
  console.log('Density:', (analysis.density * 100).toFixed(1) + '%');
  console.log('Indicators:', JSON.stringify(analysis.indicators, null, 2));
}

// 测试批量检测
function testBatchDetect() {
  console.log('\n=== Batch Detection Test ===\n');

  const inputs = [
    '帮我写一个Python脚本处理Excel数据',
    '我想做一个卖蛋糕的网站',
    '听说GraphQL比REST好，我应该用吗？'
  ];

  const results = batchDetect(inputs);

  results.forEach((result, index) => {
    console.log(`Batch ${index + 1}:`);
    console.log(`  Input: ${result.input}`);
    console.log(`  Type: ${result.userType}`);
    console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log(`  Terms: ${result.matchedTerms.length}`);
    console.log('');
  });
}

// 边界情况测试
function testEdgeCases() {
  console.log('\n=== Edge Cases Test ===\n');

  const edgeCases = [
    { input: '', expected: 'non-technical', description: 'Empty string' },
    { input: null, expected: 'non-technical', description: 'Null input' },
    { input: undefined, expected: 'non-technical', description: 'Undefined input' },
    { input: 'API', expected: 'non-technical', description: 'Single technical term' },
    { input: 'a b c d e f g h i j', expected: 'non-technical', description: 'No technical terms' },
    { input: 'API REST GraphQL SQL NoSQL', expected: 'mixed', description: 'Multiple short terms' }
  ];

  edgeCases.forEach((testCase, index) => {
    const result = detectUserType(testCase.input);
    const passed = result === testCase.expected;

    console.log(`${passed ? '✓' : '✗'} ${testCase.description}`);
    console.log(`  Input: ${JSON.stringify(testCase.input)}`);
    console.log(`  Expected: ${testCase.expected}, Actual: ${result}\n`);
  });
}

// 运行所有测试
if (require.main === module) {
  const testResults = runTests();
  testDetailedAnalysis();
  testBatchDetect();
  testEdgeCases();

  console.log('\n=== Final Report ===');
  console.log(`Overall Accuracy: ${(testResults.accuracy * 100).toFixed(1)}%`);
  console.log(`Target: >80%`);
  console.log(`Status: ${testResults.accuracy >= 0.8 ? 'PASSED ✓' : 'FAILED ✗'}`);

  process.exit(testResults.accuracy >= 0.8 ? 0 : 1);
}

module.exports = {
  TEST_CASES,
  runTests
};
