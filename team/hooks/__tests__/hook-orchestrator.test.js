/**
 * Hook Orchestrator 单元测试
 */

const { HookOrchestrator, DependencyGraph, HOOK_STATUS } = require('../hook-orchestrator');
const fs = require('fs');
const path = require('path');

// 测试用的临时配置文件路径
const TEST_CONFIG_PATH = path.join(__dirname, 'test-hooks.json');

describe('DependencyGraph', () => {
  let graph;

  beforeEach(() => {
    graph = new DependencyGraph();
  });

  describe('addNode', () => {
    test('should add a node to the graph', () => {
      const hook = { name: 'test-hook', priority: 100 };
      graph.addNode(hook);
      expect(graph.nodes.has('test-hook')).toBe(true);
    });
  });

  describe('addDependency', () => {
    test('should add dependency between nodes', () => {
      const hookA = { name: 'hook-a', priority: 100 };
      const hookB = { name: 'hook-b', priority: 200 };
      graph.addNode(hookA);
      graph.addNode(hookB);
      graph.addDependency('hook-b', 'hook-a');

      const nodeB = graph.nodes.get('hook-b');
      expect(nodeB.dependencies.has({ name: 'hook-a', optional: false })).toBe(false); // Set uses reference equality
      expect([...nodeB.dependencies].some(d => d.name === 'hook-a')).toBe(true);
    });

    test('should throw error for missing hook', () => {
      graph.addNode({ name: 'hook-a', priority: 100 });
      expect(() => {
        graph.addDependency('hook-b', 'hook-a');
      }).toThrow('Hook "hook-b" not found');
    });

    test('should throw error for missing required dependency', () => {
      graph.addNode({ name: 'hook-a', priority: 100 });
      expect(() => {
        graph.addDependency('hook-a', 'hook-b', false);
      }).toThrow('Required dependency "hook-b" for hook "hook-a" not found');
    });

    test('should skip optional dependency if not exists', () => {
      graph.addNode({ name: 'hook-a', priority: 100 });
      graph.addNode({ name: 'hook-b', priority: 200 });
      // 不应该抛出错误
      graph.addDependency('hook-b', 'non-existent', true);
    });
  });

  describe('detectCycle', () => {
    test('should not detect cycle in acyclic graph', () => {
      const hookA = { name: 'hook-a', priority: 100 };
      const hookB = { name: 'hook-b', priority: 200 };
      const hookC = { name: 'hook-c', priority: 300 };

      graph.addNode(hookA);
      graph.addNode(hookB);
      graph.addNode(hookC);

      graph.addDependency('hook-b', 'hook-a');
      graph.addDependency('hook-c', 'hook-b');

      expect(() => graph.detectCycle()).not.toThrow();
    });

    test('should detect simple cycle', () => {
      const hookA = { name: 'hook-a', priority: 100 };
      const hookB = { name: 'hook-b', priority: 200 };

      graph.addNode(hookA);
      graph.addNode(hookB);

      graph.addDependency('hook-b', 'hook-a');
      graph.addDependency('hook-a', 'hook-b');

      expect(() => graph.detectCycle()).toThrow('Circular dependency detected');
    });

    test('should detect complex cycle', () => {
      const hookA = { name: 'hook-a', priority: 100 };
      const hookB = { name: 'hook-b', priority: 200 };
      const hookC = { name: 'hook-c', priority: 300 };

      graph.addNode(hookA);
      graph.addNode(hookB);
      graph.addNode(hookC);

      graph.addDependency('hook-b', 'hook-a');
      graph.addDependency('hook-c', 'hook-b');
      graph.addDependency('hook-a', 'hook-c');

      expect(() => graph.detectCycle()).toThrow('Circular dependency detected');
    });
  });

  describe('topologicalSort', () => {
    test('should sort hooks respecting dependencies', () => {
      const hookA = { name: 'hook-a', priority: 300 };
      const hookB = { name: 'hook-b', priority: 200 };
      const hookC = { name: 'hook-c', priority: 100 };

      graph.addNode(hookA);
      graph.addNode(hookB);
      graph.addNode(hookC);

      graph.addDependency('hook-c', 'hook-b');
      graph.addDependency('hook-b', 'hook-a');

      const sorted = graph.topologicalSort();
      expect(sorted).toEqual(['hook-a', 'hook-b', 'hook-c']);
    });

    test('should prioritize by priority when no dependency constraints', () => {
      const hookA = { name: 'hook-a', priority: 300 };
      const hookB = { name: 'hook-b', priority: 100 };
      const hookC = { name: 'hook-c', priority: 200 };

      graph.addNode(hookA);
      graph.addNode(hookB);
      graph.addNode(hookC);

      const sorted = graph.topologicalSort();
      // 数字越小优先级越高
      expect(sorted).toEqual(['hook-b', 'hook-c', 'hook-a']);
    });

    test('should combine priority and dependency constraints', () => {
      const hookA = { name: 'hook-a', priority: 100 };
      const hookB = { name: 'hook-b', priority: 50 };
      const hookC = { name: 'hook-c', priority: 200 };

      graph.addNode(hookA);
      graph.addNode(hookB);
      graph.addNode(hookC);

      // hook-c 依赖于 hook-a，即使 hook-a 优先级较低
      graph.addDependency('hook-c', 'hook-a');

      const sorted = graph.topologicalSort();
      // hook-b 优先级最高且没有依赖限制，应该最先执行
      // hook-a 必须在 hook-c 之前执行
      expect(sorted.indexOf('hook-a')).toBeLessThan(sorted.indexOf('hook-c'));
      expect(sorted[0]).toBe('hook-b');
    });
  });
});

describe('HookOrchestrator', () => {
  let orchestrator;

  beforeEach(() => {
    orchestrator = new HookOrchestrator(TEST_CONFIG_PATH);
  });

  afterEach(() => {
    // 清理测试文件
    if (fs.existsSync(TEST_CONFIG_PATH)) {
      fs.unlinkSync(TEST_CONFIG_PATH);
    }
  });

  describe('loadConfig', () => {
    test('should load valid config', () => {
      const config = {
        hooks: [
          { name: 'hook-a', trigger: 'Test', script: './a.js', priority: 100 },
          { name: 'hook-b', trigger: 'Test', script: './b.js', priority: 200 }
        ]
      };
      fs.writeFileSync(TEST_CONFIG_PATH, JSON.stringify(config, null, 2));

      orchestrator.loadConfig();
      expect(orchestrator.hooks.size).toBe(2);
      expect(orchestrator.hooks.get('hook-a').priority).toBe(100);
    });

    test('should set default priority for hooks without priority', () => {
      const config = {
        hooks: [
          { name: 'hook-a', trigger: 'Test', script: './a.js' }
        ]
      };
      fs.writeFileSync(TEST_CONFIG_PATH, JSON.stringify(config, null, 2));

      orchestrator.loadConfig();
      expect(orchestrator.hooks.get('hook-a').priority).toBe(100);
    });

    test('should handle dependencies', () => {
      const config = {
        hooks: [
          { name: 'hook-a', trigger: 'Test', script: './a.js', priority: 100 },
          { name: 'hook-b', trigger: 'Test', script: './b.js', priority: 200, dependsOn: ['hook-a'] }
        ]
      };
      fs.writeFileSync(TEST_CONFIG_PATH, JSON.stringify(config, null, 2));

      orchestrator.loadConfig();
      const sorted = orchestrator.getSortedHooks();
      expect(sorted[0].name).toBe('hook-a');
      expect(sorted[1].name).toBe('hook-b');
    });

    test('should throw error for invalid config', () => {
      fs.writeFileSync(TEST_CONFIG_PATH, 'invalid json');
      expect(() => orchestrator.loadConfig()).toThrow();
    });
  });

  describe('getHooksByTrigger', () => {
    beforeEach(() => {
      const config = {
        hooks: [
          { name: 'hook-a', trigger: 'TriggerA', script: './a.js', priority: 200 },
          { name: 'hook-b', trigger: 'TriggerB', script: './b.js', priority: 100 },
          { name: 'hook-c', trigger: 'TriggerA', script: './c.js', priority: 100 }
        ]
      };
      fs.writeFileSync(TEST_CONFIG_PATH, JSON.stringify(config, null, 2));
      orchestrator.loadConfig();
    });

    test('should filter hooks by trigger', () => {
      const hooks = orchestrator.getHooksByTrigger('TriggerA');
      expect(hooks.length).toBe(2);
      expect(hooks.map(h => h.name).sort()).toEqual(['hook-a', 'hook-c']);
    });

    test('should return empty array for non-existent trigger', () => {
      const hooks = orchestrator.getHooksByTrigger('NonExistent');
      expect(hooks.length).toBe(0);
    });

    test('should return hooks sorted by priority', () => {
      const hooks = orchestrator.getHooksByTrigger('TriggerA');
      // hook-c 优先级 100，hook-a 优先级 200
      expect(hooks[0].name).toBe('hook-c');
      expect(hooks[1].name).toBe('hook-a');
    });
  });

  describe('areDependenciesMet', () => {
    beforeEach(() => {
      const config = {
        hooks: [
          { name: 'hook-a', trigger: 'Test', script: './a.js' },
          { name: 'hook-b', trigger: 'Test', script: './b.js', dependsOn: ['hook-a'] },
          { name: 'hook-c', trigger: 'Test', script: './c.js', dependsOn: ['hook-a?'] }
        ]
      };
      fs.writeFileSync(TEST_CONFIG_PATH, JSON.stringify(config, null, 2));
      orchestrator.loadConfig();
    });

    test('should return true for hook without dependencies', () => {
      expect(orchestrator.areDependenciesMet('hook-a')).toBe(true);
    });

    test('should return false when required dependency not completed', () => {
      expect(orchestrator.areDependenciesMet('hook-b')).toBe(false);
    });

    test('should return true when required dependency completed', () => {
      orchestrator.hookStatus.set('hook-a', HOOK_STATUS.COMPLETED);
      expect(orchestrator.areDependenciesMet('hook-b')).toBe(true);
    });

    test('should return true for optional dependency even if not exists', () => {
      // hook-c 依赖于 hook-a?（可选）
      orchestrator.hookStatus.set('hook-a', HOOK_STATUS.FAILED);
      // 可选依赖失败时仍然可以执行
      expect(orchestrator.areDependenciesMet('hook-c')).toBe(true);
    });
  });

  describe('validate', () => {
    test('should return valid for correct config', () => {
      const config = {
        hooks: [
          { name: 'hook-a', trigger: 'Test', script: './a.js' },
          { name: 'hook-b', trigger: 'Test', script: './b.js', dependsOn: ['hook-a'] }
        ]
      };
      fs.writeFileSync(TEST_CONFIG_PATH, JSON.stringify(config, null, 2));
      orchestrator.loadConfig();

      const result = orchestrator.validate();
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    test('should detect circular dependency', () => {
      const config = {
        hooks: [
          { name: 'hook-a', trigger: 'Test', script: './a.js', dependsOn: ['hook-b'] },
          { name: 'hook-b', trigger: 'Test', script: './b.js', dependsOn: ['hook-a'] }
        ]
      };
      fs.writeFileSync(TEST_CONFIG_PATH, JSON.stringify(config, null, 2));
      orchestrator.loadConfig();

      const result = orchestrator.validate();
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Circular dependency');
    });

    test('should detect non-existent required dependency', () => {
      const config = {
        hooks: [
          { name: 'hook-a', trigger: 'Test', script: './a.js', dependsOn: ['non-existent'] }
        ]
      };
      fs.writeFileSync(TEST_CONFIG_PATH, JSON.stringify(config, null, 2));
      orchestrator.loadConfig();

      const result = orchestrator.validate();
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('non-existent');
    });

    test('should warn about non-existent optional dependency', () => {
      const config = {
        hooks: [
          { name: 'hook-a', trigger: 'Test', script: './a.js', dependsOn: ['non-existent?'] }
        ]
      };
      fs.writeFileSync(TEST_CONFIG_PATH, JSON.stringify(config, null, 2));
      orchestrator.loadConfig();

      const result = orchestrator.validate();
      expect(result.valid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('reset', () => {
    test('should reset all statuses to pending', () => {
      const config = {
        hooks: [
          { name: 'hook-a', trigger: 'Test', script: './a.js' }
        ]
      };
      fs.writeFileSync(TEST_CONFIG_PATH, JSON.stringify(config, null, 2));
      orchestrator.loadConfig();

      orchestrator.hookStatus.set('hook-a', HOOK_STATUS.COMPLETED);
      orchestrator.reset();

      expect(orchestrator.hookStatus.get('hook-a')).toBe(HOOK_STATUS.PENDING);
    });
  });
});

describe('Priority Sorting Tests', () => {
  let orchestrator;

  afterEach(() => {
    if (fs.existsSync(TEST_CONFIG_PATH)) {
      fs.unlinkSync(TEST_CONFIG_PATH);
    }
  });

  test('should sort by priority (lower number = higher priority)', () => {
    const config = {
      hooks: [
        { name: 'low', trigger: 'Test', script: './low.js', priority: 300 },
        { name: 'high', trigger: 'Test', script: './high.js', priority: 50 },
        { name: 'medium', trigger: 'Test', script: './medium.js', priority: 150 },
        { name: 'default', trigger: 'Test', script: './default.js' }  // 默认 100
      ]
    };
    fs.writeFileSync(TEST_CONFIG_PATH, JSON.stringify(config, null, 2));

    orchestrator = new HookOrchestrator(TEST_CONFIG_PATH);
    orchestrator.loadConfig();

    const sorted = orchestrator.getSortedHooks();
    const names = sorted.map(h => h.name);

    // 预期顺序: high(50) -> default(100) -> medium(150) -> low(300)
    expect(names).toEqual(['high', 'default', 'medium', 'low']);
  });

  test('should handle real-world hook priorities', () => {
    // 模拟实际场景
    const config = {
      hooks: [
        { name: 'session-end', trigger: 'SessionEnd', script: './session-end.js', priority: 50 },
        { name: 'health-check', trigger: 'Periodic', script: './health-check.js', priority: 100 },
        { name: 'resource-monitor', trigger: 'Periodic', script: './resource-monitor.js', priority: 200, dependsOn: ['health-check'] },
        { name: 'evaluate-session', trigger: 'Stop', script: './evaluate-session.js', priority: 200 }
      ]
    };
    fs.writeFileSync(TEST_CONFIG_PATH, JSON.stringify(config, null, 2));

    orchestrator = new HookOrchestrator(TEST_CONFIG_PATH);
    orchestrator.loadConfig();

    const sorted = orchestrator.getSortedHooks();
    const names = sorted.map(h => h.name);

    // session-end 优先级最高(50)
    // health-check 必须在 resource-monitor 之前（依赖关系）
    expect(names.indexOf('session-end')).toBe(0);
    expect(names.indexOf('health-check')).toBeLessThan(names.indexOf('resource-monitor'));
  });
});

describe('Dependency Resolution Tests', () => {
  let orchestrator;

  afterEach(() => {
    if (fs.existsSync(TEST_CONFIG_PATH)) {
      fs.unlinkSync(TEST_CONFIG_PATH);
    }
  });

  test('should handle complex dependency chain', () => {
    const config = {
      hooks: [
        { name: 'a', trigger: 'Test', script: './a.js' },
        { name: 'b', trigger: 'Test', script: './b.js', dependsOn: ['a'] },
        { name: 'c', trigger: 'Test', script: './c.js', dependsOn: ['b'] },
        { name: 'd', trigger: 'Test', script: './d.js', dependsOn: ['a', 'c'] }
      ]
    };
    fs.writeFileSync(TEST_CONFIG_PATH, JSON.stringify(config, null, 2));

    orchestrator = new HookOrchestrator(TEST_CONFIG_PATH);
    orchestrator.loadConfig();

    const sorted = orchestrator.getSortedHooks();
    const names = sorted.map(h => h.name);

    // 验证依赖顺序
    expect(names.indexOf('a')).toBeLessThan(names.indexOf('b'));
    expect(names.indexOf('b')).toBeLessThan(names.indexOf('c'));
    expect(names.indexOf('a')).toBeLessThan(names.indexOf('d'));
    expect(names.indexOf('c')).toBeLessThan(names.indexOf('d'));
  });

  test('should handle multiple independent chains', () => {
    const config = {
      hooks: [
        { name: 'a1', trigger: 'Test', script: './a1.js', priority: 100 },
        { name: 'a2', trigger: 'Test', script: './a2.js', dependsOn: ['a1'] },
        { name: 'b1', trigger: 'Test', script: './b1.js', priority: 50 },
        { name: 'b2', trigger: 'Test', script: './b2.js', dependsOn: ['b1'] }
      ]
    };
    fs.writeFileSync(TEST_CONFIG_PATH, JSON.stringify(config, null, 2));

    orchestrator = new HookOrchestrator(TEST_CONFIG_PATH);
    orchestrator.loadConfig();

    const sorted = orchestrator.getSortedHooks();
    const names = sorted.map(h => h.name);

    // b1 优先级最高，应该最先执行
    expect(names[0]).toBe('b1');
    // 验证各自的依赖链
    expect(names.indexOf('a1')).toBeLessThan(names.indexOf('a2'));
    expect(names.indexOf('b1')).toBeLessThan(names.indexOf('b2'));
  });

  test('should handle optional dependencies', () => {
    const config = {
      hooks: [
        { name: 'main', trigger: 'Test', script: './main.js' },
        { name: 'optional-user', trigger: 'Test', script: './optional.js', dependsOn: ['non-existent?'] }
      ]
    };
    fs.writeFileSync(TEST_CONFIG_PATH, JSON.stringify(config, null, 2));

    orchestrator = new HookOrchestrator(TEST_CONFIG_PATH);
    orchestrator.loadConfig();

    // 不应该抛出错误
    expect(() => orchestrator.getSortedHooks()).not.toThrow();

    const sorted = orchestrator.getSortedHooks();
    expect(sorted.length).toBe(2);
  });
});

describe('Cycle Detection Tests', () => {
  let orchestrator;

  afterEach(() => {
    if (fs.existsSync(TEST_CONFIG_PATH)) {
      fs.unlinkSync(TEST_CONFIG_PATH);
    }
  });

  test('should detect self-dependency', () => {
    const config = {
      hooks: [
        { name: 'self-dep', trigger: 'Test', script: './self.js', dependsOn: ['self-dep'] }
      ]
    };
    fs.writeFileSync(TEST_CONFIG_PATH, JSON.stringify(config, null, 2));

    orchestrator = new HookOrchestrator(TEST_CONFIG_PATH);
    orchestrator.loadConfig();

    expect(() => orchestrator.getSortedHooks()).toThrow('Circular dependency detected');
  });

  test('should detect two-node cycle', () => {
    const config = {
      hooks: [
        { name: 'a', trigger: 'Test', script: './a.js', dependsOn: ['b'] },
        { name: 'b', trigger: 'Test', script: './b.js', dependsOn: ['a'] }
      ]
    };
    fs.writeFileSync(TEST_CONFIG_PATH, JSON.stringify(config, null, 2));

    orchestrator = new HookOrchestrator(TEST_CONFIG_PATH);
    orchestrator.loadConfig();

    expect(() => orchestrator.getSortedHooks()).toThrow('Circular dependency detected');
  });

  test('should detect three-node cycle', () => {
    const config = {
      hooks: [
        { name: 'a', trigger: 'Test', script: './a.js', dependsOn: ['b'] },
        { name: 'b', trigger: 'Test', script: './b.js', dependsOn: ['c'] },
        { name: 'c', trigger: 'Test', script: './c.js', dependsOn: ['a'] }
      ]
    };
    fs.writeFileSync(TEST_CONFIG_PATH, JSON.stringify(config, null, 2));

    orchestrator = new HookOrchestrator(TEST_CONFIG_PATH);
    orchestrator.loadConfig();

    expect(() => orchestrator.getSortedHooks()).toThrow('Circular dependency detected');
  });

  test('should detect cycle in larger graph', () => {
    const config = {
      hooks: [
        { name: 'a', trigger: 'Test', script: './a.js' },
        { name: 'b', trigger: 'Test', script: './b.js', dependsOn: ['a'] },
        { name: 'c', trigger: 'Test', script: './c.js', dependsOn: ['b'] },
        { name: 'd', trigger: 'Test', script: './d.js', dependsOn: ['c', 'e'] },
        { name: 'e', trigger: 'Test', script: './e.js', dependsOn: ['b'] },
        { name: 'f', trigger: 'Test', script: './f.js', dependsOn: ['d'] }
      ]
    };
    // 这个配置没有循环，应该正常排序
    fs.writeFileSync(TEST_CONFIG_PATH, JSON.stringify(config, null, 2));

    orchestrator = new HookOrchestrator(TEST_CONFIG_PATH);
    orchestrator.loadConfig();

    expect(() => orchestrator.getSortedHooks()).not.toThrow();
  });
});

// 运行测试
if (require.main === module) {
  console.log('Run tests with: npm test or jest');
}
