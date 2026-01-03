/**
 * Utils 模块统一导出
 * 提供工具函数和常量
 */

// 错误处理相关
export {
  handleError,
  getErrorMessage,
  createError,
  wrapAsync,
  assertCondition,
  assertNotNull,
  isGrfError,
  isErrorCode,
  type HandleErrorOptions,
} from "./error.js";

// 输入验证相关
export {
  validateRepoName,
  validateGitUrl,
  isGitUrl,
  validateBranchName,
  validatePath,
  validatePositiveInteger,
  validateConfigKey,
  combineValidations,
  createValidator,
  assertValid,
  type ValidationResult,
} from "./validation.js";

// 常量
export {
  DIR_NAMES,
  FILE_NAMES,
  DEFAULTS,
  TABLE_COLUMNS,
  COPY_EXCLUDES,
  GIT,
  TIMEOUTS,
  LIMITS,
  PATTERNS,
  MESSAGES,
  HINTS,
  APP_INFO,
} from "./constants.js";
