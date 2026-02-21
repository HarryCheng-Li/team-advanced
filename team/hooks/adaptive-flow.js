/**
 * Adaptive Flow - 自适应流程控制器
 * 根据用户类型调整Team Skill的工作流程
 */

const { detectUserType, getDetailedAnalysis } = require('./user-type-detector');

/**
 * 用户类型配置
 */
const USER_TYPE_CONFIG = {
  technical: {
    name: 'technical',
    displayName: '技术用户',
    description: '具备技术背景的用户，熟悉编程和系统架构',

    // Interview 配置
    interview: {
      skipBasicConcepts: true,
      depth: 'technical',
      askArchitectureQuestions: true,
      askImplementationDetails: true,
      skipExplanations: ['基础概念', '什么是', '简单解释']
    },

    // Persona 配置
    personas: {
      productOwner: 'technical-product-owner',
      techLead: 'senior-tech-lead',
      developer: 'senior-developer'
    },

    // 输出配置
    output: {
      includeTechnicalDocs: true,
      includeArchitectureDiagrams: true,
      includeCodeExamples: true,
      includeApiSpecs: true,
      simplifyLanguage: false,
      useVisualizations: ['architecture', 'flowchart', 'sequence']
    },

    // 沟通风格
    communication: {
      useTechnicalTerms: true,
      provideDetailedSpecs: true,
      skipLaymanExplanations: true,
      codeFirst: true
    }
  },

  'non-technical': {
    name: 'non-technical',
    displayName: '非技术用户',
    description: '不具备技术背景的业务用户或决策者',

    // Interview 配置
    interview: {
      skipBasicConcepts: false,
      depth: 'business',
      askArchitectureQuestions: false,
      askImplementationDetails: false,
      focusOn: ['业务目标', '用户需求', '预算', '时间线']
    },

    // Persona 配置
    personas: {
      productOwner: 'business-product-owner',
      techLead: 'communicative-tech-lead',
      developer: 'patient-developer',
      userTranslator: 'user-translator' // 自动启用
    },

    // 输出配置
    output: {
      includeTechnicalDocs: false,
      includeArchitectureDiagrams: false,
      includeCodeExamples: false,
      includeApiSpecs: false,
      simplifyLanguage: true,
      useVisualizations: ['wireframe', 'mockup', 'user-flow'],
      generateBusinessReport: true
    },

    // 沟通风格
    communication: {
      useTechnicalTerms: false,
      provideDetailedSpecs: false,
      skipLaymanExplanations: false,
      codeFirst: false,
      businessFirst: true,
      useAnalogies: true
    }
  },

  mixed: {
    name: 'mixed',
    displayName: '混合用户',
    description: '具备一定技术知识但需要通俗解释的用户',

    // Interview 配置
    interview: {
      skipBasicConcepts: false,
      depth: 'adaptive',
      askArchitectureQuestions: true,
      askImplementationDetails: false,
      askUserPreference: true
    },

    // Persona 配置
    personas: {
      productOwner: 'adaptive-product-owner',
      techLead: 'balanced-tech-lead',
      developer: 'helpful-developer'
    },

    // 输出配置
    output: {
      includeTechnicalDocs: true,
      includeArchitectureDiagrams: true,
      includeCodeExamples: false,
      includeApiSpecs: false,
      simplifyLanguage: true,
      useVisualizations: ['architecture', 'user-flow'],
      dualOutput: true // 技术+通俗双重输出
    },

    // 沟通风格
    communication: {
      useTechnicalTerms: true,
      explainTechnicalTerms: true,
      provideDetailedSpecs: false,
      skipLaymanExplanations: false,
      askDepthPreference: true
    }
  }
};

/**
 * 根据用户输入获取自适应配置
 * @param {string} userInput - 用户输入
 * @returns {object} - 完整的配置对象
 */
function getAdaptiveConfig(userInput) {
  const userType = detectUserType(userInput);
  const analysis = getDetailedAnalysis(userInput);
  const config = USER_TYPE_CONFIG[userType];

  return {
    userType,
    confidence: analysis.confidence,
    config,
    recommendations: generateRecommendations(userType, analysis)
  };
}

/**
 * 生成针对用户类型的建议
 * @param {string} userType - 用户类型
 * @param {object} analysis - 详细分析结果
 * @returns {object} - 建议配置
 */
function generateRecommendations(userType, analysis) {
  const recommendations = {
    immediateActions: [],
    personaAdjustments: {},
    outputAdjustments: {},
    interviewQuestions: []
  };

  switch (userType) {
    case 'technical':
      recommendations.immediateActions = [
        '跳过基础技术概念解释',
        '直接进入技术架构讨论',
        '提供详细的技术方案选项',
        '生成技术文档和代码示例'
      ];
      recommendations.personaAdjustments = {
        productOwner: '使用技术术语，讨论架构权衡',
        techLead: '深入技术细节，提供实现建议'
      };
      recommendations.outputAdjustments = {
        include: ['技术规格书', '架构图', 'API文档', '代码示例'],
        exclude: ['通俗解释', '业务报告']
      };
      recommendations.interviewQuestions = [
        '您倾向使用什么技术栈？',
        '对系统性能有什么具体要求？',
        '是否需要考虑特定的架构模式？'
      ];
      break;

    case 'non-technical':
      recommendations.immediateActions = [
        '启用user-translator角色',
        '简化所有技术术语',
        '提供更多可视化输出',
        '生成通俗易懂的业务报告'
      ];
      recommendations.personaAdjustments = {
        productOwner: '使用业务语言，避免技术术语',
        userTranslator: '自动加入团队，翻译技术概念'
      };
      recommendations.outputAdjustments = {
        include: ['业务报告', '线框图', '用户流程图', '成本估算'],
        exclude: ['技术规格书', '代码', 'API文档']
      };
      recommendations.interviewQuestions = [
        '您希望解决什么业务问题？',
        '目标用户是谁？',
        '预算和时间线如何？',
        '有什么参考的竞品吗？'
      ];
      break;

    case 'mixed':
      recommendations.immediateActions = [
        '提供技术+通俗双重输出',
        '让用户选择深度',
        '解释技术术语但保持技术讨论',
        '提供可选的详细技术文档'
      ];
      recommendations.personaAdjustments = {
        productOwner: '平衡技术和业务语言',
        techLead: '提供技术选项并解释权衡'
      };
      recommendations.outputAdjustments = {
        include: ['概要文档', '技术选项', '通俗解释'],
        optional: ['详细技术文档', '代码示例']
      };
      recommendations.interviewQuestions = [
        '您希望了解技术实现细节吗？',
        '对技术选型有什么偏好吗？',
        '需要多详细的技术文档？'
      ];
      break;
  }

  return recommendations;
}

/**
 * 调整Phase 2 Interview流程
 * @param {string} userInput - 用户输入
 * @returns {object} - Interview配置
 */
function getInterviewConfig(userInput) {
  const { userType, config } = getAdaptiveConfig(userInput);

  return {
    userType,
    phase2Config: {
      // 是否跳过基础概念
      skipConcepts: config.interview.skipBasicConcepts,

      // Interview深度
      depth: config.interview.depth,

      // 问题模板
      questionTemplates: getQuestionTemplates(userType),

      // 追问策略
      followUpStrategy: config.interview,

      // 沟通风格
      communicationStyle: config.communication
    }
  };
}

/**
 * 获取问题模板
 * @param {string} userType - 用户类型
 * @returns {object} - 问题模板
 */
function getQuestionTemplates(userType) {
  const templates = {
    technical: {
      opening: '我理解您需要{task}。让我们深入讨论技术实现细节。',
      requirement: '关于{topic}，您有什么具体的技术要求？比如{examples}',
      constraint: '有什么技术约束需要考虑吗？例如性能、兼容性、扩展性？',
      preference: '您倾向使用什么技术栈？有偏好的框架或工具吗？',
      clarification: '您提到的{term}，具体是指{technical_meaning}吗？'
    },

    'non-technical': {
      opening: '很高兴帮您{task}！让我们从您的业务需求开始。',
      requirement: '关于{topic}，您希望达到什么效果？比如{examples}',
      constraint: '有什么限制条件吗？比如预算、时间、资源？',
      preference: '您有参考的类似产品或网站吗？喜欢它们的什么特点？',
      clarification: '让我用简单的话解释一下：{simple_explanation}'
    },

    mixed: {
      opening: '好的，您需要{task}。我们可以根据您的需求调整讨论深度。',
      requirement: '关于{topic}，您希望了解技术实现吗？还是先看业务方案？',
      constraint: '有什么需要考虑的限制吗？技术和业务方面都可以。',
      preference: '您对技术实现有什么偏好吗？或者更关注最终效果？',
      clarification: '{term}的意思是{explanation}。需要更详细的技术解释吗？'
    }
  };

  return templates[userType];
}

/**
 * 获取Product Owner的沟通风格配置
 * @param {string} userType - 用户类型
 * @returns {object} - PO配置
 */
function getProductOwnerConfig(userType) {
  const configs = {
    technical: {
      style: 'technical',
      vocabulary: 'technical',
      explanationDepth: 'detailed',
      codeExamples: true,
      skipBasics: true
    },

    'non-technical': {
      style: 'business',
      vocabulary: 'simple',
      explanationDepth: 'high-level',
      codeExamples: false,
      useAnalogies: true,
      focusOnValue: true
    },

    mixed: {
      style: 'adaptive',
      vocabulary: 'balanced',
      explanationDepth: 'moderate',
      codeExamples: 'on-demand',
      askPreference: true
    }
  };

  return configs[userType];
}

/**
 * 生成输出格式配置
 * @param {string} userInput - 用户输入
 * @returns {object} - 输出配置
 */
function getOutputConfig(userInput) {
  const { userType, config } = getAdaptiveConfig(userInput);

  return {
    userType,
    formats: config.output,
    templates: getOutputTemplates(userType)
  };
}

/**
 * 获取输出模板
 * @param {string} userType - 用户类型
 * @returns {object} - 输出模板
 */
function getOutputTemplates(userType) {
  const templates = {
    technical: {
      summary: '## 技术方案\n\n{technical_solution}\n\n### 架构图\n{architecture_diagram}\n\n### 实现步骤\n{implementation_steps}\n\n### 代码示例\n{code_examples}',
      detail: '## 详细技术规格\n\n{technical_specs}\n\n### API设计\n{api_design}\n\n### 数据库设计\n{db_design}'
    },

    'non-technical': {
      summary: '## 方案概述\n\n{solution_summary}\n\n### 功能说明\n{feature_description}\n\n### 预期效果\n{expected_outcome}\n\n### 时间和成本\n{timeline_and_cost}',
      detail: '## 详细说明\n\n{detailed_description}\n\n### 用户流程\n{user_flow}\n\n### 视觉参考\n{visual_references}'
    },

    mixed: {
      summary: '## 方案概述\n\n{solution_summary}\n\n<details>\n<summary>技术详情（可选）</summary>\n\n{technical_details}\n</details>',
      detail: '## 通俗说明\n\n{layman_explanation}\n\n---\n\n## 技术说明\n\n{technical_explanation}\n\n需要更详细的技术文档吗？'
    }
  };

  return templates[userType];
}

/**
 * 创建自适应上下文
 * @param {string} userInput - 用户输入
 * @returns {object} - 完整的自适应上下文
 */
function createAdaptiveContext(userInput) {
  const detection = getAdaptiveConfig(userInput);
  const interviewConfig = getInterviewConfig(userInput);
  const poConfig = getProductOwnerConfig(detection.userType);
  const outputConfig = getOutputConfig(userInput);

  return {
    userType: detection.userType,
    confidence: detection.confidence,
    config: detection.config,

    phase2: interviewConfig.phase2Config,
    productOwner: poConfig,
    output: outputConfig,

    recommendations: detection.recommendations,

    // 快捷方法
    shouldSkipConcepts: () => detection.config.interview.skipBasicConcepts,
    shouldUseTranslator: () => detection.userType === 'non-technical',
    shouldProvideDualOutput: () => detection.userType === 'mixed',
    getPersona: (role) => detection.config.personas[role] || role
  };
}

// 导出模块
module.exports = {
  USER_TYPE_CONFIG,
  getAdaptiveConfig,
  getInterviewConfig,
  getProductOwnerConfig,
  getOutputConfig,
  createAdaptiveContext,
  generateRecommendations,
  getQuestionTemplates,
  getOutputTemplates
};

// 如果直接运行此文件，执行演示
if (require.main === module) {
  console.log('=== Adaptive Flow Demo ===\n');

  const testInputs = [
    '我需要实现一个微服务架构，使用Kubernetes部署，数据库用PostgreSQL和Redis缓存',
    '我想做一个卖手工产品的网站，不知道怎么开始',
    '我想做一个App，听说可以用React Native，能给我讲讲吗？'
  ];

  testInputs.forEach((input, index) => {
    console.log(`\n--- Test Case ${index + 1} ---`);
    console.log(`Input: ${input.substring(0, 50)}...`);

    const context = createAdaptiveContext(input);

    console.log(`\nDetected Type: ${context.userType} (confidence: ${(context.confidence * 100).toFixed(1)}%)`);
    console.log(`\nImmediate Actions:`);
    context.recommendations.immediateActions.forEach(action => {
      console.log(`  - ${action}`);
    });

    console.log(`\nPersonas:`);
    Object.entries(context.config.personas).forEach(([role, persona]) => {
      console.log(`  ${role}: ${persona}`);
    });

    console.log(`\nOutput Formats:`);
    Object.entries(context.config.output)
      .filter(([_, value]) => value === true || Array.isArray(value))
      .forEach(([key, value]) => {
        console.log(`  ${key}: ${Array.isArray(value) ? value.join(', ') : 'enabled'}`);
      });

    console.log('');
  });
}
