/**
 * Adaptive Flow 测试套件
 * 测试自适应流程配置
 */

const {
  getAdaptiveConfig,
  getInterviewConfig,
  getProductOwnerConfig,
  getOutputConfig,
  createAdaptiveContext,
  USER_TYPE_CONFIG
} = require('../adaptive-flow');

describe('Adaptive Flow Tests', () => {

  describe('Technical User Flow', () => {
    const technicalInput = '我需要实现一个微服务架构，使用Kubernetes部署，数据库用PostgreSQL和Redis缓存';

    test('should detect technical user type', () => {
      const config = getAdaptiveConfig(technicalInput);
      expect(config.userType).toBe('technical');
      expect(config.confidence).toBeGreaterThan(0.6);
    });

    test('should skip basic concepts for technical users', () => {
      const interview = getInterviewConfig(technicalInput);
      expect(interview.phase2Config.skipConcepts).toBe(true);
    });

    test('should use technical personas', () => {
      const config = getAdaptiveConfig(technicalInput);
      expect(config.config.personas.productOwner).toContain('technical');
      expect(config.config.personas.techLead).toContain('tech-lead');
    });

    test('should include technical outputs', () => {
      const config = getAdaptiveConfig(technicalInput);
      expect(config.config.output.includeTechnicalDocs).toBe(true);
      expect(config.config.output.includeCodeExamples).toBe(true);
      expect(config.config.output.simplifyLanguage).toBe(false);
    });

    test('should use technical communication style', () => {
      const poConfig = getProductOwnerConfig('technical');
      expect(poConfig.style).toBe('technical');
      expect(poConfig.useTechnicalTerms).toBe(true);
      expect(poConfig.skipLaymanExplanations).toBe(true);
    });
  });

  describe('Non-Technical User Flow', () => {
    const nonTechnicalInput = '我想做一个卖手工产品的网站，不知道怎么开始';

    test('should detect non-technical user type', () => {
      const config = getAdaptiveConfig(nonTechnicalInput);
      expect(config.userType).toBe('non-technical');
      expect(config.confidence).toBeGreaterThan(0.6);
    });

    test('should not skip basic concepts for non-technical users', () => {
      const interview = getInterviewConfig(nonTechnicalInput);
      expect(interview.phase2Config.skipConcepts).toBe(false);
    });

    test('should use business personas', () => {
      const config = getAdaptiveConfig(nonTechnicalInput);
      expect(config.config.personas.productOwner).toContain('business');
      expect(config.config.personas.userTranslator).toBeDefined();
    });

    test('should enable user translator', () => {
      const context = createAdaptiveContext(nonTechnicalInput);
      expect(context.shouldUseTranslator()).toBe(true);
    });

    test('should simplify language for non-technical users', () => {
      const config = getAdaptiveConfig(nonTechnicalInput);
      expect(config.config.output.simplifyLanguage).toBe(true);
      expect(config.config.output.includeTechnicalDocs).toBe(false);
      expect(config.config.output.includeCodeExamples).toBe(false);
    });

    test('should use business communication style', () => {
      const poConfig = getProductOwnerConfig('non-technical');
      expect(poConfig.style).toBe('business');
      expect(poConfig.useTechnicalTerms).toBe(false);
      expect(poConfig.useAnalogies).toBe(true);
    });
  });

  describe('Mixed User Flow', () => {
    const mixedInput = '我想做一个电商平台，需要用户注册登录功能，用什么技术比较好？';

    test('should detect mixed user type', () => {
      const config = getAdaptiveConfig(mixedInput);
      expect(config.userType).toBe('mixed');
    });

    test('should enable dual output for mixed users', () => {
      const config = getAdaptiveConfig(mixedInput);
      expect(config.config.output.dualOutput).toBe(true);
    });

    test('should ask depth preference', () => {
      const config = getAdaptiveConfig(mixedInput);
      expect(config.config.communication.askDepthPreference).toBe(true);
    });

    test('should use adaptive personas', () => {
      const config = getAdaptiveConfig(mixedInput);
      expect(config.config.personas.productOwner).toContain('adaptive');
    });

    test('should provide both technical and layman explanations', () => {
      const poConfig = getProductOwnerConfig('mixed');
      expect(poConfig.useTechnicalTerms).toBe(true);
      expect(poConfig.explainTechnicalTerms).toBe(true);
    });

    test('should enable dual output mode', () => {
      const context = createAdaptiveContext(mixedInput);
      expect(context.shouldProvideDualOutput()).toBe(true);
    });
  });

  describe('Context Creation', () => {
    test('should create complete context for technical user', () => {
      const input = '帮我优化React性能';
      const context = createAdaptiveContext(input);

      expect(context.userType).toBeDefined();
      expect(context.confidence).toBeDefined();
      expect(context.config).toBeDefined();
      expect(context.phase2).toBeDefined();
      expect(context.productOwner).toBeDefined();
      expect(context.output).toBeDefined();
      expect(context.recommendations).toBeDefined();
      expect(typeof context.shouldSkipConcepts).toBe('function');
      expect(typeof context.shouldUseTranslator).toBe('function');
      expect(typeof context.getPersona).toBe('function');
    });

    test('should provide immediate actions', () => {
      const input = '我想做一个网站';
      const context = createAdaptiveContext(input);

      expect(context.recommendations.immediateActions).toBeDefined();
      expect(context.recommendations.immediateActions.length).toBeGreaterThan(0);
    });

    test('should provide persona adjustments', () => {
      const input = '我想做一个网站';
      const context = createAdaptiveContext(input);

      expect(context.recommendations.personaAdjustments).toBeDefined();
    });

    test('should provide interview questions', () => {
      const input = '我想做一个网站';
      const context = createAdaptiveContext(input);

      expect(context.recommendations.interviewQuestions).toBeDefined();
      expect(context.recommendations.interviewQuestions.length).toBeGreaterThan(0);
    });
  });

  describe('Interview Configuration', () => {
    test('should provide question templates', () => {
      const input = '帮我写一个API';
      const interview = getInterviewConfig(input);

      expect(interview.phase2Config.questionTemplates).toBeDefined();
      expect(interview.phase2Config.questionTemplates.opening).toBeDefined();
      expect(interview.phase2Config.questionTemplates.requirement).toBeDefined();
    });

    test('should have different templates for different user types', () => {
      const technical = getInterviewConfig('帮我写代码');
      const nonTechnical = getInterviewConfig('我想做网站');

      expect(technical.phase2Config.questionTemplates.opening)
        .not.toBe(nonTechnical.phase2Config.questionTemplates.opening);
    });
  });

  describe('Output Configuration', () => {
    test('should provide output templates', () => {
      const output = getOutputConfig('帮我写代码');
      expect(output.templates).toBeDefined();
    });

    test('technical users should get technical templates', () => {
      const output = getOutputConfig('帮我优化React组件');
      expect(output.templates.summary).toContain('技术方案');
    });

    test('non-technical users should get business templates', () => {
      const output = getOutputConfig('我想做电商网站');
      expect(output.templates.summary).toContain('方案概述');
    });
  });

  describe('Configuration Constants', () => {
    test('should have all user type configs', () => {
      expect(USER_TYPE_CONFIG.technical).toBeDefined();
      expect(USER_TYPE_CONFIG['non-technical']).toBeDefined();
      expect(USER_TYPE_CONFIG.mixed).toBeDefined();
    });

    test('each config should have required sections', () => {
      Object.values(USER_TYPE_CONFIG).forEach(config => {
        expect(config.name).toBeDefined();
        expect(config.displayName).toBeDefined();
        expect(config.interview).toBeDefined();
        expect(config.personas).toBeDefined();
        expect(config.output).toBeDefined();
        expect(config.communication).toBeDefined();
      });
    });
  });

});

// 手动测试运行器（不使用Jest时）
function runTests() {
  console.log('=== Adaptive Flow Test Suite ===\n');

  const tests = [];

  function test(name, fn) {
    tests.push({ name, fn });
  }

  function expect(value) {
    return {
      toBe(expected) {
        if (value !== expected) {
          throw new Error(`Expected ${expected} but got ${value}`);
        }
      },
      toBeDefined() {
        if (value === undefined) {
          throw new Error(`Expected value to be defined but got undefined`);
        }
      },
      toBeGreaterThan(min) {
        if (!(value > min)) {
          throw new Error(`Expected value to be greater than ${min} but got ${value}`);
        }
      },
      toBeTruthy() {
        if (!value) {
          throw new Error(`Expected value to be truthy but got ${value}`);
        }
      },
      toContain(substring) {
        if (!value.includes(substring)) {
          throw new Error(`Expected "${value}" to contain "${substring}"`);
        }
      }
    };
  }

  // 运行所有测试
  describe('Adaptive Flow Tests', () => {

    describe('Technical User Flow', () => {
      const technicalInput = '我需要实现一个微服务架构，使用Kubernetes部署';

      test('should detect technical user type', () => {
        const config = getAdaptiveConfig(technicalInput);
        expect(config.userType).toBe('technical');
      });

      test('should skip basic concepts', () => {
        const interview = getInterviewConfig(technicalInput);
        expect(interview.phase2Config.skipConcepts).toBe(true);
      });
    });

    describe('Non-Technical User Flow', () => {
      const nonTechnicalInput = '我想做一个卖手工产品的网站';

      test('should detect non-technical user type', () => {
        const config = getAdaptiveConfig(nonTechnicalInput);
        expect(config.userType).toBe('non-technical');
      });

      test('should enable user translator', () => {
        const context = createAdaptiveContext(nonTechnicalInput);
        expect(context.shouldUseTranslator()).toBe(true);
      });
    });

    describe('Mixed User Flow', () => {
      const mixedInput = '我想做一个电商平台，用什么技术比较好？';

      test('should detect mixed user type', () => {
        const config = getAdaptiveConfig(mixedInput);
        expect(config.userType).toBe('mixed');
      });

      test('should enable dual output', () => {
        const context = createAdaptiveContext(mixedInput);
        expect(context.shouldProvideDualOutput()).toBe(true);
      });
    });

  });

  // 执行测试
  let passed = 0;
  let failed = 0;

  tests.forEach(({ name, fn }) => {
    try {
      fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (error) {
      console.log(`✗ ${name}`);
      console.log(`  Error: ${error.message}`);
      failed++;
    }
  });

  console.log(`\n=== Summary ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total: ${passed + failed}`);

  return { passed, failed, total: passed + failed };
}

// 如果直接运行此文件
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
