/**
 * Hook Orchestrator - Hook优先级管理和依赖解析器
 *
 * 功能：
 * 1. 加载和解析 hooks.json
 * 2. 根据 priority 排序（数字越小优先级越高）
 * 3. 检测循环依赖
 * 4. 按顺序执行 Hook
 */

const fs = require('fs');
const path = require('path');

/**
 * Hook 状态枚举
 */
const HOOK_STATUS = {
  PENDING: 'pending',       // 等待执行
  RUNNING: 'running',       // 正在执行
  COMPLETED: 'completed',   // 执行成功
  FAILED: 'failed',         // 执行失败
  SKIPPED: 'skipped'        // 被跳过（依赖失败或不满足条件）
};

/**
 * 依赖图类 - 用于拓扑排序和循环依赖检测
 */
class DependencyGraph {
  constructor() {
    this.nodes = new Map(); // hook name -> { hook, dependencies: [], dependents: [] }
  }

  /**
   * 添加节点到依赖图
   * @param {Object} hook - Hook配置对象
   */
  addNode(hook) {
    const name = hook.name;
    if (!this.nodes.has(name)) {
      this.nodes.set(name, {
        hook,
        dependencies: new Set(),
        dependents: new Set(),
        visited: false,
        visiting: false
      });
    }
  }

  /**
   * 添加依赖关系
   * @param {string} from - 依赖方（后执行）
   * @param {string} to - 被依赖方（先执行）
   * @param {boolean} optional - 是否为可选依赖
   */
  addDependency(from, to, optional = false) {
    if (!this.nodes.has(from)) {
      throw new Error(`Hook "${from}" not found in dependency graph`);
    }

    const fromNode = this.nodes.get(from);

    // 如果被依赖的hook不存在，且不是可选依赖，则报错
    if (!this.nodes.has(to)) {
      if (!optional) {
        throw new Error(`Required dependency "${to}" for hook "${from}" not found`);
      }
      // 可选依赖不存在，跳过
      return;
    }

    const toNode = this.nodes.get(to);

    fromNode.dependencies.add({ name: to, optional });
    toNode.dependents.add(from);
  }

  /**
   * 检测循环依赖（使用DFS）
   * @returns {string[]} - 如果存在循环依赖，返回循环路径
   * @throws {Error} - 检测到循环依赖时抛出错误
   */
  detectCycle() {
    const path = [];
    const cycles = [];

    const visit = (name) => {
      const node = this.nodes.get(name);
      if (!node) return false;

      if (node.visiting) {
        // 发现循环
        const cycleStart = path.indexOf(name);
        cycles.push([...path.slice(cycleStart), name]);
        return true;
      }

      if (node.visited) return false;

      node.visiting = true;
      path.push(name);

      for (const dep of node.dependencies) {
        if (visit(dep.name)) {
          return true;
        }
      }

      path.pop();
      node.visiting = false;
      node.visited = true;
      return false;
    };

    // 重置所有节点的访问状态
    for (const node of this.nodes.values()) {
      node.visited = false;
      node.visiting = false;
    }

    for (const name of this.nodes.keys()) {
      if (!this.nodes.get(name).visited) {
        visit(name);
      }
    }

    if (cycles.length > 0) {
      const cycleStr = cycles.map(c => c.join(' -> ')).join('; ');
      throw new Error(`Circular dependency detected: ${cycleStr}`);
    }

    return null;
  }

  /**
   * 拓扑排序 - 返回按依赖顺序排列的hook名称列表
   * @returns {string[]} - 排序后的hook名称列表
   */
  topologicalSort() {
    // 首先检测循环依赖
    this.detectCycle();

    const result = [];
    const inDegree = new Map();

    // 计算每个节点的入度
    for (const [name, node] of this.nodes) {
      inDegree.set(name, node.dependencies.size);
    }

    // 找到所有入度为0的节点
    const queue = [];
    for (const [name, degree] of inDegree) {
      if (degree === 0) {
        queue.push(name);
      }
    }

    // Kahn算法
    while (queue.length > 0) {
      // 按优先级排序队列中的节点（数字越小优先级越高）
      queue.sort((a, b) => {
        const hookA = this.nodes.get(a).hook;
        const hookB = this.nodes.get(b).hook;
        const priorityA = hookA.priority ?? 100;
        const priorityB = hookB.priority ?? 100;
        return priorityA - priorityB;
      });

      const name = queue.shift();
      result.push(name);

      const node = this.nodes.get(name);
      for (const dependent of node.dependents) {
        const newDegree = inDegree.get(dependent) - 1;
        inDegree.set(dependent, newDegree);
        if (newDegree === 0) {
          queue.push(dependent);
        }
      }
    }

    if (result.length !== this.nodes.size) {
      throw new Error('Topological sort failed: graph may contain cycles');
    }

    return result;
  }

  /**
   * 获取hook的执行顺序（考虑优先级和依赖）
   * @returns {Object[]} - 排序后的hook对象数组
   */
  getExecutionOrder() {
    const sortedNames = this.topologicalSort();

    // 在依赖约束下，按优先级进行最终排序
    return sortedNames.map(name => this.nodes.get(name).hook);
  }
}

/**
 * Hook Orchestrator 类
 */
class HookOrchestrator {
  constructor(configPath) {
    this.configPath = configPath || path.join(__dirname, 'hooks.json');
    this.hooks = new Map();
    this.graph = new DependencyGraph();
    this.hookStatus = new Map();
    this.executionResults = new Map();
    this.defaultPriority = 100;
  }

  /**
   * 加载 hooks.json 配置
   */
  loadConfig() {
    try {
      const content = fs.readFileSync(this.configPath, 'utf-8');
      const config = JSON.parse(content);

      if (!config.hooks || !Array.isArray(config.hooks)) {
        throw new Error('Invalid hooks.json: "hooks" array not found');
      }

      // 清空现有数据
      this.hooks.clear();
      this.graph = new DependencyGraph();
      this.hookStatus.clear();

      // 添加所有hook到图和map
      for (const hook of config.hooks) {
        if (!hook.name) {
          console.warn('Skipping hook without name:', hook);
          continue;
        }

        // 设置默认优先级
        if (hook.priority === undefined) {
          hook.priority = this.defaultPriority;
        }

        this.hooks.set(hook.name, hook);
        this.graph.addNode(hook);
        this.hookStatus.set(hook.name, HOOK_STATUS.PENDING);
      }

      // 建立依赖关系
      for (const hook of config.hooks) {
        if (hook.dependsOn) {
          const dependencies = Array.isArray(hook.dependsOn)
            ? hook.dependsOn
            : [hook.dependsOn];

          for (const dep of dependencies) {
            // 支持可选依赖语法: "hookName?" 表示可选
            const isOptional = dep.endsWith('?');
            const depName = isOptional ? dep.slice(0, -1) : dep;

            // 只添加存在的依赖，不存在的非可选依赖会在validate中报告
            if (this.hooks.has(depName) || isOptional) {
              this.graph.addDependency(hook.name, depName, isOptional);
            } else {
              // 记录不存在的依赖，在validate中报告
              if (!this._missingDependencies) {
                this._missingDependencies = [];
              }
              this._missingDependencies.push({ hook: hook.name, dependency: depName });
            }
          }
        }
      }

      return this;
    } catch (error) {
      throw new Error(`Failed to load hooks config: ${error.message}`);
    }
  }

  /**
   * 获取按优先级和依赖排序的hook列表
   * @returns {Object[]} - 排序后的hook数组
   */
  getSortedHooks() {
    return this.graph.getExecutionOrder();
  }

  /**
   * 按触发器筛选hooks
   * @param {string} trigger - 触发器名称
   * @returns {Object[]} - 匹配的hook数组（已排序）
   */
  getHooksByTrigger(trigger) {
    const allHooks = this.getSortedHooks();
    return allHooks.filter(hook => hook.trigger === trigger);
  }

  /**
   * 检查hook的依赖是否都满足
   * @param {string} hookName - Hook名称
   * @returns {boolean}
   */
  areDependenciesMet(hookName) {
    const hook = this.hooks.get(hookName);
    if (!hook || !hook.dependsOn) return true;

    const dependencies = Array.isArray(hook.dependsOn)
      ? hook.dependsOn
      : [hook.dependsOn];

    for (const dep of dependencies) {
      const isOptional = dep.endsWith('?');
      const depName = isOptional ? dep.slice(0, -1) : dep;

      const depStatus = this.hookStatus.get(depName);

      if (!depStatus) {
        if (!isOptional) return false;
        continue;
      }

      if (depStatus !== HOOK_STATUS.COMPLETED) {
        if (!isOptional) return false;
      }
    }

    return true;
  }

  /**
   * 执行单个hook
   * @param {Object} hook - Hook配置
   * @param {Object} context - 执行上下文
   * @returns {Promise<Object>} - 执行结果
   */
  async executeHook(hook, context = {}) {
    const name = hook.name;

    // 检查依赖是否满足
    if (!this.areDependenciesMet(name)) {
      this.hookStatus.set(name, HOOK_STATUS.SKIPPED);
      return {
        name,
        status: HOOK_STATUS.SKIPPED,
        reason: 'Dependencies not met'
      };
    }

    // 检查matcher条件
    if (hook.matcher && context) {
      const matcherResult = this.evaluateMatcher(hook.matcher, context);
      if (!matcherResult) {
        this.hookStatus.set(name, HOOK_STATUS.SKIPPED);
        return {
          name,
          status: HOOK_STATUS.SKIPPED,
          reason: 'Matcher condition not met'
        };
      }
    }

    this.hookStatus.set(name, HOOK_STATUS.RUNNING);

    try {
      // 加载并执行hook脚本
      const scriptPath = path.resolve(path.dirname(this.configPath), hook.script);

      if (!fs.existsSync(scriptPath)) {
        throw new Error(`Hook script not found: ${scriptPath}`);
      }

      // 清除缓存以确保获取最新版本
      delete require.cache[require.resolve(scriptPath)];
      const hookModule = require(scriptPath);

      let result;
      if (typeof hookModule === 'function') {
        result = await hookModule(context);
      } else if (hookModule.default && typeof hookModule.default === 'function') {
        result = await hookModule.default(context);
      } else if (hookModule.execute && typeof hookModule.execute === 'function') {
        result = await hookModule.execute(context);
      } else {
        throw new Error(`Hook "${name}" does not export a valid handler function`);
      }

      this.hookStatus.set(name, HOOK_STATUS.COMPLETED);
      this.executionResults.set(name, result);

      return {
        name,
        status: HOOK_STATUS.COMPLETED,
        result
      };

    } catch (error) {
      this.hookStatus.set(name, HOOK_STATUS.FAILED);

      return {
        name,
        status: HOOK_STATUS.FAILED,
        error: error.message,
        stack: error.stack
      };
    }
  }

  /**
   * 评估matcher条件
   * @param {string} matcher - 匹配表达式
   * @param {Object} context - 上下文对象
   * @returns {boolean}
   */
  evaluateMatcher(matcher, context) {
    try {
      // 简单的表达式求值，支持常见的条件
      // 例如: tool == "Edit", trigger == "SessionStart"
      const sandbox = { ...context };
      const fn = new Function(...Object.keys(sandbox), `return ${matcher};`);
      return fn(...Object.values(sandbox));
    } catch (error) {
      console.warn(`Failed to evaluate matcher "${matcher}":`, error.message);
      return false;
    }
  }

  /**
   * 执行指定触发器的所有hooks
   * @param {string} trigger - 触发器名称
   * @param {Object} context - 执行上下文
   * @returns {Promise<Object[]>} - 执行结果数组
   */
  async executeByTrigger(trigger, context = {}) {
    const hooks = this.getHooksByTrigger(trigger);
    const results = [];

    for (const hook of hooks) {
      const result = await this.executeHook(hook, { ...context, trigger });
      results.push(result);

      // 如果hook执行失败且不是可选依赖，停止后续执行
      if (result.status === HOOK_STATUS.FAILED) {
        const failedHook = this.hooks.get(hook.name);
        if (failedHook.dependsOn && !failedHook.dependsOn.some(d => d.endsWith('?'))) {
          console.warn(`Hook "${hook.name}" failed, stopping execution chain`);
          break;
        }
      }
    }

    return results;
  }

  /**
   * 执行所有hooks（用于测试）
   * @param {Object} context - 执行上下文
   * @returns {Promise<Object[]>} - 执行结果数组
   */
  async executeAll(context = {}) {
    const hooks = this.getSortedHooks();
    const results = [];

    for (const hook of hooks) {
      const result = await this.executeHook(hook, context);
      results.push(result);
    }

    return results;
  }

  /**
   * 获取hook状态
   * @param {string} name - Hook名称
   * @returns {string} - 状态
   */
  getStatus(name) {
    return this.hookStatus.get(name);
  }

  /**
   * 获取所有hook状态
   * @returns {Map<string, string>}
   */
  getAllStatuses() {
    return new Map(this.hookStatus);
  }

  /**
   * 重置所有状态
   */
  reset() {
    for (const name of this.hookStatus.keys()) {
      this.hookStatus.set(name, HOOK_STATUS.PENDING);
    }
    this.executionResults.clear();
  }

  /**
   * 验证配置（检查循环依赖等）
   * @returns {Object} - 验证结果
   */
  validate() {
    const errors = [];
    const warnings = [];

    try {
      this.graph.detectCycle();
    } catch (error) {
      errors.push(error.message);
    }

    // 检查加载时记录的不存在的依赖
    if (this._missingDependencies) {
      for (const { hook, dependency } of this._missingDependencies) {
        errors.push(`Hook "${hook}" depends on non-existent hook "${dependency}"`);
      }
    }

    // 检查可选依赖警告
    for (const [name, hook] of this.hooks) {
      if (hook.dependsOn) {
        const deps = Array.isArray(hook.dependsOn) ? hook.dependsOn : [hook.dependsOn];
        for (const dep of deps) {
          if (dep.endsWith('?')) {
            const depName = dep.slice(0, -1);
            if (!this.hooks.has(depName)) {
              warnings.push(`Hook "${name}" has optional dependency "${depName}" which does not exist`);
            }
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

module.exports = {
  HookOrchestrator,
  DependencyGraph,
  HOOK_STATUS
};
