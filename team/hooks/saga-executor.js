#!/usr/bin/env node
/**
 * Team Skill - Saga Pattern Executor
 * v1.0 全局事务管理组件
 *
 * 功能：
 * 1. 支持多Agent协作的原子性操作
 * 2. 顺序执行steps，失败时触发补偿
 * 3. 完整的状态追踪和日志记录
 * 4. 与Phase 5执行阶段集成
 *
 * 使用方式：
 * const { SagaExecutor, SagaBuilder } = require('./saga-executor');
 *
 * const saga = new SagaBuilder()
 *   .step('create-db', createDB, rollbackDB)
 *   .step('deploy-api', deployAPI, rollbackAPI)
 *   .build();
 *
 * const executor = new SagaExecutor(saga);
 * const result = await executor.execute();
 */

const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

// ============================================================================
// 类型定义 (JSDoc)
// ============================================================================

/**
 * @typedef {string} SagaStatus
 * - 'pending': 等待执行
 * - 'running': 执行中
 * - 'succeeded': 全部成功
 * - 'failed': 执行失败
 * - 'compensating': 补偿中
 * - 'compensated': 补偿完成
 */

/**
 * @typedef {string} StepStatus
 * - 'pending': 等待执行
 * - 'running': 执行中
 * - 'succeeded': 执行成功
 * - 'failed': 执行失败
 * - 'compensating': 补偿中
 * - 'compensated': 补偿完成
 * - 'compensation_failed': 补偿失败
 */

/**
 * @typedef {Object} StepDefinition
 * @property {string} id - Step唯一标识
 * @property {string} name - Step名称
 * @property {Function} action - 执行函数 (context) => Promise<any>
 * @property {Function} compensate - 补偿函数 (context, actionResult, error) => Promise<any>
 * @property {number} [timeout=30000] - 执行超时(ms)
 * @property {number} [retryCount=0] - 重试次数
 * @property {number} [retryDelay=1000] - 重试延迟(ms)
 * @property {string[]} [dependsOn=[]] - 依赖的step IDs
 */

/**
 * @typedef {Object} SagaDefinition
 * @property {string} id - Saga唯一标识
 * @property {string} name - Saga名称
 * @property {StepDefinition[]} steps - Step定义列表
 * @property {Function} [onFailure] - 失败回调 (saga, failedStep, error) => void
 * @property {Function} [onSuccess] - 成功回调 (saga, results) => void
 * @property {boolean} [continueOnCompensationFailure=false] - 补偿失败时是否继续
 * @property {number} [compensationTimeout=60000] - 补偿超时(ms)
 * @property {Object} [metadata] - 元数据
 */

/**
 * @typedef {Object} StepExecutionRecord
 * @property {string} stepId
 * @property {StepStatus} status
 * @property {any} input
 * @property {any} output
 * @property {Error} [error]
 * @property {number} startTime
 * @property {number} endTime
 * @property {number} [compensationStartTime]
 * @property {number} [compensationEndTime]
 * @property {any} [compensationResult]
 * @property {Error} [compensationError]
 * @property {number} retryAttempts
 */

/**
 * @typedef {Object} SagaExecutionRecord
 * @property {string} sagaId
 * @property {SagaStatus} status
 * @property {StepExecutionRecord[]} stepRecords
 * @property {Object} context
 * @property {number} startTime
 * @property {number} [endTime]
 * @property {string} [failedStepId]
 * @property {Error} [error]
 */

// ============================================================================
// 常量定义
// ============================================================================

const SAGA_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  COMPENSATING: 'compensating',
  COMPENSATED: 'compensated',
};

const STEP_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCEEDED: 'succeeded',
  FAILED: 'failed',
  COMPENSATING: 'compensating',
  COMPENSATED: 'compensated',
  COMPENSATION_FAILED: 'compensation_failed',
};

const DEFAULT_CONFIG = {
  stepTimeout: 30000,           // 30秒
  compensationTimeout: 60000,   // 60秒
  retryCount: 0,
  retryDelay: 1000,
  continueOnCompensationFailure: false,
  persistState: true,
  stateDir: path.join(process.env.HOME || '.', '.claude', 'tasks', 'saga-states'),
};

// ============================================================================
// SagaExecutor 类
// ============================================================================

class SagaExecutor extends EventEmitter {
  /**
   * @param {SagaDefinition} sagaDefinition
   * @param {Object} [options]
   * @param {Object} [options.config] - 配置覆盖
   * @param {Object} [options.initialContext] - 初始上下文
   */
  constructor(sagaDefinition, options = {}) {
    super();

    this.saga = sagaDefinition;
    this.config = { ...DEFAULT_CONFIG, ...options.config };
    this.context = options.initialContext || {};

    // 执行状态
    this.status = SAGA_STATUS.PENDING;
    this.stepRecords = new Map();
    this.startTime = null;
    this.endTime = null;
    this.failedStepId = null;
    this.error = null;

    // 验证saga定义
    this._validateSaga();

    // 初始化step记录
    this._initializeStepRecords();
  }

  // ==========================================================================
  // 公共API
  // ==========================================================================

  /**
   * 执行Saga
   * @returns {Promise<SagaExecutionRecord>}
   */
  async execute() {
    if (this.status !== SAGA_STATUS.PENDING) {
      throw new Error(`Cannot execute saga in ${this.status} state`);
    }

    this.startTime = Date.now();
    this.status = SAGA_STATUS.RUNNING;

    this.emit('started', this._getExecutionRecord());

    try {
      // 检查依赖关系
      this._validateDependencies();

      // 按顺序执行steps
      for (const step of this.saga.steps) {
        const result = await this._executeStep(step);

        if (!result.success) {
          // 执行失败，触发补偿
          this.failedStepId = step.id;
          this.error = result.error;
          this.status = SAGA_STATUS.FAILED;

          this.emit('failed', this._getExecutionRecord());

          // 执行补偿
          await this._compensate();

          return this._getExecutionRecord();
        }
      }

      // 全部成功
      this.status = SAGA_STATUS.SUCCEEDED;
      this.endTime = Date.now();

      this.emit('succeeded', this._getExecutionRecord());

      if (this.saga.onSuccess) {
        await this.saga.onSuccess(this._getExecutionRecord(), this.context);
      }

      return this._getExecutionRecord();

    } catch (error) {
      this.status = SAGA_STATUS.FAILED;
      this.error = error;
      this.endTime = Date.now();

      this.emit('error', error, this._getExecutionRecord());

      // 执行补偿
      await this._compensate();

      return this._getExecutionRecord();
    } finally {
      if (this.config.persistState) {
        this._persistState();
      }
    }
  }

  /**
   * 获取当前执行状态
   * @returns {SagaExecutionRecord}
   */
  getStatus() {
    return this._getExecutionRecord();
  }

  /**
   * 获取指定step的状态
   * @param {string} stepId
   * @returns {StepExecutionRecord}
   */
  getStepStatus(stepId) {
    return this.stepRecords.get(stepId);
  }

  /**
   * 获取执行上下文
   * @returns {Object}
   */
  getContext() {
    return { ...this.context };
  }

  /**
   * 更新上下文
   * @param {Object} updates
   */
  updateContext(updates) {
    this.context = { ...this.context, ...updates };
  }

  // ==========================================================================
  // 私有方法 - 执行逻辑
  // ==========================================================================

  /**
   * 执行单个step
   * @param {StepDefinition} step
   * @returns {Promise<{success: boolean, error?: Error}>}
   */
  async _executeStep(step) {
    const record = this.stepRecords.get(step.id);
    record.status = STEP_STATUS.RUNNING;
    record.startTime = Date.now();

    this.emit('step-started', step.id, record);

    // 检查依赖是否完成
    if (step.dependsOn && step.dependsOn.length > 0) {
      for (const depId of step.dependsOn) {
        const depRecord = this.stepRecords.get(depId);
        if (!depRecord || depRecord.status !== STEP_STATUS.SUCCEEDED) {
          const error = new Error(`Dependency ${depId} not satisfied for step ${step.id}`);
          record.status = STEP_STATUS.FAILED;
          record.error = error;
          record.endTime = Date.now();
          this.emit('step-failed', step.id, error, record);
          return { success: false, error };
        }
      }
    }

    // 准备上下文
    const stepContext = {
      ...this.context,
      sagaId: this.saga.id,
      stepId: step.id,
      stepName: step.name,
      getPreviousStepResult: (stepId) => {
        const prevRecord = this.stepRecords.get(stepId);
        return prevRecord ? prevRecord.output : undefined;
      },
    };

    // 执行action（带重试）
    let lastError = null;
    const retryCount = step.retryCount || this.config.retryCount;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        const timeout = step.timeout || this.config.stepTimeout;
        const result = await this._executeWithTimeout(step.action, stepContext, timeout);

        record.status = STEP_STATUS.SUCCEEDED;
        record.output = result;
        record.endTime = Date.now();
        record.retryAttempts = attempt;

        // 将结果存入上下文
        this.context[`${step.id}Result`] = result;

        this.emit('step-succeeded', step.id, result, record);

        return { success: true };

      } catch (error) {
        lastError = error;
        record.retryAttempts = attempt + 1;

        if (attempt < retryCount) {
          const delay = step.retryDelay || this.config.retryDelay;
          this.emit('step-retry', step.id, attempt + 1, retryCount, error);
          await this._sleep(delay);
        }
      }
    }

    // 全部重试失败
    record.status = STEP_STATUS.FAILED;
    record.error = lastError;
    record.endTime = Date.now();

    this.emit('step-failed', step.id, lastError, record);

    return { success: false, error: lastError };
  }

  /**
   * 执行补偿
   */
  async _compensate() {
    this.status = SAGA_STATUS.COMPENSATING;
    this.emit('compensating', this._getExecutionRecord());

    // 获取已成功的steps，按逆序补偿
    const succeededSteps = this.saga.steps
      .filter(step => {
        const record = this.stepRecords.get(step.id);
        return record && record.status === STEP_STATUS.SUCCEEDED;
      })
      .reverse();

    const compensationResults = [];

    for (const step of succeededSteps) {
      const record = this.stepRecords.get(step.id);
      record.status = STEP_STATUS.COMPENSATING;
      record.compensationStartTime = Date.now();

      this.emit('compensating-step', step.id, record);

      try {
        const timeout = this.config.compensationTimeout;
        const compensationContext = {
          ...this.context,
          sagaId: this.saga.id,
          stepId: step.id,
          actionResult: record.output,
        };

        const result = await this._executeWithTimeout(
          step.compensate,
          compensationContext,
          timeout
        );

        record.status = STEP_STATUS.COMPENSATED;
        record.compensationResult = result;
        record.compensationEndTime = Date.now();

        this.emit('step-compensated', step.id, result, record);

        compensationResults.push({ stepId: step.id, success: true, result });

      } catch (error) {
        record.status = STEP_STATUS.COMPENSATION_FAILED;
        record.compensationError = error;
        record.compensationEndTime = Date.now();

        this.emit('compensation-failed', step.id, error, record);

        compensationResults.push({ stepId: step.id, success: false, error });

        if (!this.config.continueOnCompensationFailure) {
          break;
        }
      }
    }

    this.status = SAGA_STATUS.COMPENSATED;
    this.endTime = Date.now();

    this.emit('compensated', this._getExecutionRecord(), compensationResults);

    if (this.saga.onFailure) {
      await this.saga.onFailure(this._getExecutionRecord(), this.failedStepId, this.error);
    }
  }

  /**
   * 带超时的函数执行
   * @param {Function} fn
   * @param {Object} context
   * @param {number} timeout
   * @returns {Promise<any>}
   */
  _executeWithTimeout(fn, context, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Step execution timeout after ${timeout}ms`));
      }, timeout);

      Promise.resolve(fn(context))
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  // ==========================================================================
  // 私有方法 - 验证和初始化
  // ==========================================================================

  _validateSaga() {
    if (!this.saga.id) {
      throw new Error('Saga must have an id');
    }

    if (!Array.isArray(this.saga.steps) || this.saga.steps.length === 0) {
      throw new Error('Saga must have at least one step');
    }

    const stepIds = new Set();
    for (const step of this.saga.steps) {
      if (!step.id) {
        throw new Error('Step must have an id');
      }
      if (stepIds.has(step.id)) {
        throw new Error(`Duplicate step id: ${step.id}`);
      }
      stepIds.add(step.id);

      if (!step.action || typeof step.action !== 'function') {
        throw new Error(`Step ${step.id} must have an action function`);
      }

      if (!step.compensate || typeof step.compensate !== 'function') {
        throw new Error(`Step ${step.id} must have a compensate function`);
      }
    }
  }

  _validateDependencies() {
    const stepIds = new Set(this.saga.steps.map(s => s.id));

    for (const step of this.saga.steps) {
      if (step.dependsOn) {
        for (const depId of step.dependsOn) {
          if (!stepIds.has(depId)) {
            throw new Error(`Step ${step.id} depends on unknown step ${depId}`);
          }
        }
      }
    }
  }

  _initializeStepRecords() {
    for (const step of this.saga.steps) {
      this.stepRecords.set(step.id, {
        stepId: step.id,
        stepName: step.name,
        status: STEP_STATUS.PENDING,
        input: null,
        output: null,
        error: null,
        startTime: null,
        endTime: null,
        compensationStartTime: null,
        compensationEndTime: null,
        compensationResult: null,
        compensationError: null,
        retryAttempts: 0,
      });
    }
  }

  // ==========================================================================
  // 私有方法 - 状态管理
  // ==========================================================================

  _getExecutionRecord() {
    return {
      sagaId: this.saga.id,
      sagaName: this.saga.name,
      status: this.status,
      stepRecords: Array.from(this.stepRecords.values()),
      context: this.context,
      startTime: this.startTime,
      endTime: this.endTime,
      failedStepId: this.failedStepId,
      error: this.error,
    };
  }

  _persistState() {
    try {
      const stateDir = this.config.stateDir;
      if (!fs.existsSync(stateDir)) {
        fs.mkdirSync(stateDir, { recursive: true });
      }

      const statePath = path.join(stateDir, `${this.saga.id}.json`);
      fs.writeFileSync(statePath, JSON.stringify(this._getExecutionRecord(), null, 2));
    } catch (error) {
      console.error(`[SagaExecutor] Failed to persist state: ${error.message}`);
    }
  }

  // ==========================================================================
  // 工具函数
  // ==========================================================================

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// SagaBuilder 类
// ============================================================================

class SagaBuilder {
  constructor() {
    this.saga = {
      id: null,
      name: null,
      steps: [],
      onFailure: null,
      onSuccess: null,
      continueOnCompensationFailure: false,
      compensationTimeout: 60000,
      metadata: {},
    };
  }

  /**
   * 设置Saga ID
   * @param {string} id
   * @returns {SagaBuilder}
   */
  id(id) {
    this.saga.id = id;
    return this;
  }

  /**
   * 设置Saga名称
   * @param {string} name
   * @returns {SagaBuilder}
   */
  name(name) {
    this.saga.name = name;
    return this;
  }

  /**
   * 添加一个step
   * @param {string} stepId - Step ID
   * @param {Function} action - 执行函数
   * @param {Function} compensate - 补偿函数
   * @param {Object} [options]
 * @param {string} [options.name] - Step名称
   * @param {number} [options.timeout] - 超时时间(ms)
   * @param {number} [options.retryCount] - 重试次数
   * @param {number} [options.retryDelay] - 重试延迟(ms)
   * @param {string[]} [options.dependsOn] - 依赖的step IDs
   * @returns {SagaBuilder}
   */
  step(stepId, action, compensate, options = {}) {
    this.saga.steps.push({
      id: stepId,
      name: options.name || stepId,
      action,
      compensate,
      timeout: options.timeout,
      retryCount: options.retryCount,
      retryDelay: options.retryDelay,
      dependsOn: options.dependsOn || [],
    });
    return this;
  }

  /**
   * 设置失败回调
   * @param {Function} callback
   * @returns {SagaBuilder}
   */
  onFailure(callback) {
    this.saga.onFailure = callback;
    return this;
  }

  /**
   * 设置成功回调
   * @param {Function} callback
   * @returns {SagaBuilder}
   */
  onSuccess(callback) {
    this.saga.onSuccess = callback;
    return this;
  }

  /**
   * 设置补偿失败时是否继续
   * @param {boolean} continueOnFailure
   * @returns {SagaBuilder}
   */
  continueOnCompensationFailure(continueOnFailure) {
    this.saga.continueOnCompensationFailure = continueOnFailure;
    return this;
  }

  /**
   * 设置补偿超时
   * @param {number} timeout
   * @returns {SagaBuilder}
   */
  compensationTimeout(timeout) {
    this.saga.compensationTimeout = timeout;
    return this;
  }

  /**
   * 设置元数据
   * @param {Object} metadata
   * @returns {SagaBuilder}
   */
  metadata(metadata) {
    this.saga.metadata = { ...this.saga.metadata, ...metadata };
    return this;
  }

  /**
   * 构建Saga定义
   * @returns {SagaDefinition}
   */
  build() {
    if (!this.saga.id) {
      throw new Error('Saga must have an id');
    }
    if (this.saga.steps.length === 0) {
      throw new Error('Saga must have at least one step');
    }
    return { ...this.saga };
  }
}

// ============================================================================
// SagaOrchestrator 类 - 用于管理多个Saga
// ============================================================================

class SagaOrchestrator extends EventEmitter {
  constructor() {
    super();
    this.sagas = new Map();
    this.executors = new Map();
  }

  /**
   * 注册Saga定义
   * @param {SagaDefinition} saga
   */
  register(saga) {
    this.sagas.set(saga.id, saga);
  }

  /**
   * 执行Saga
   * @param {string} sagaId
   * @param {Object} [initialContext]
   * @param {Object} [config]
   * @returns {Promise<SagaExecutionRecord>}
   */
  async execute(sagaId, initialContext = {}, config = {}) {
    const saga = this.sagas.get(sagaId);
    if (!saga) {
      throw new Error(`Saga not found: ${sagaId}`);
    }

    const executor = new SagaExecutor(saga, { initialContext, config });
    this.executors.set(sagaId, executor);

    // 转发事件
    executor.on('started', (record) => this.emit('saga-started', sagaId, record));
    executor.on('succeeded', (record) => this.emit('saga-succeeded', sagaId, record));
    executor.on('failed', (record) => this.emit('saga-failed', sagaId, record));
    executor.on('compensating', (record) => this.emit('saga-compensating', sagaId, record));
    executor.on('compensated', (record, results) => this.emit('saga-compensated', sagaId, record, results));

    const result = await executor.execute();
    return result;
  }

  /**
   * 获取执行器
   * @param {string} sagaId
   * @returns {SagaExecutor}
   */
  getExecutor(sagaId) {
    return this.executors.get(sagaId);
  }

  /**
   * 获取所有执行中的Saga
   * @returns {Array<{sagaId: string, status: SagaStatus}>}
   */
  getActiveSagas() {
    const active = [];
    for (const [sagaId, executor] of this.executors) {
      const status = executor.getStatus();
      if (status.status === SAGA_STATUS.RUNNING ||
          status.status === SAGA_STATUS.COMPENSATING) {
        active.push({ sagaId, status: status.status });
      }
    }
    return active;
  }
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 创建简单的补偿函数（用于测试或简单场景）
 * @param {string} name - 补偿名称（用于日志）
 * @param {Function} [compensateFn] - 可选的自定义补偿逻辑
 * @returns {Function}
 */
function createCompensateFn(name, compensateFn) {
  return async (context, actionResult, error) => {
    console.log(`[Compensate] ${name} - Rolling back...`);
    if (compensateFn) {
      await compensateFn(context, actionResult, error);
    }
    console.log(`[Compensate] ${name} - Rolled back successfully`);
  };
}

/**
 * 从持久化存储加载Saga状态
 * @param {string} sagaId
 * @param {string} [stateDir]
 * @returns {SagaExecutionRecord|null}
 */
function loadSagaState(sagaId, stateDir = DEFAULT_CONFIG.stateDir) {
  try {
    const statePath = path.join(stateDir, `${sagaId}.json`);
    if (fs.existsSync(statePath)) {
      const data = fs.readFileSync(statePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`[SagaExecutor] Failed to load state: ${error.message}`);
  }
  return null;
}

/**
 * 列出所有持久化的Saga状态
 * @param {string} [stateDir]
 * @returns {Array<{sagaId: string, status: string, timestamp: number}>}
 */
function listSagaStates(stateDir = DEFAULT_CONFIG.stateDir) {
  try {
    if (!fs.existsSync(stateDir)) {
      return [];
    }

    const files = fs.readdirSync(stateDir);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const sagaId = f.replace('.json', '');
        const state = loadSagaState(sagaId, stateDir);
        return {
          sagaId,
          status: state?.status || 'unknown',
          timestamp: state?.startTime || 0,
        };
      });
  } catch (error) {
    console.error(`[SagaExecutor] Failed to list states: ${error.message}`);
    return [];
  }
}

// ============================================================================
// 导出
// ============================================================================

module.exports = {
  // 核心类
  SagaExecutor,
  SagaBuilder,
  SagaOrchestrator,

  // 常量
  SAGA_STATUS,
  STEP_STATUS,
  DEFAULT_CONFIG,

  // 工具函数
  createCompensateFn,
  loadSagaState,
  listSagaStates,
};
