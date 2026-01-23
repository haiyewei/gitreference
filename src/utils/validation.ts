/**
 * 输入验证模块
 * 提供各种输入验证工具函数
 */

/**
 * 验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误消息（如果无效） */
  message?: string;
}

/**
 * 验证仓库名称
 * @param name 仓库名称
 * @returns 验证结果
 *
 * @example
 * ```typescript
 * const result = validateRepoName("my-repo");
 * if (!result.valid) {
 *   console.error(result.message);
 * }
 * ```
 */
export function validateRepoName(name: string): ValidationResult {
  if (!name || name.trim() === "") {
    return { valid: false, message: "Repository name cannot be empty" };
  }

  // 检查是否包含非法字符
  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  if (invalidChars.test(name)) {
    return {
      valid: false,
      message: "Repository name contains invalid characters",
    };
  }

  // 检查长度
  if (name.length > 255) {
    return {
      valid: false,
      message: "Repository name is too long (max 255 characters)",
    };
  }

  return { valid: true };
}

/**
 * 验证 Git URL
 * @param url URL 字符串
 * @returns 验证结果
 *
 * @example
 * ```typescript
 * const result = validateGitUrl("https://github.com/user/repo.git");
 * if (!result.valid) {
 *   console.error(result.message);
 * }
 * ```
 */
export function validateGitUrl(url: string): ValidationResult {
  if (!url || url.trim() === "") {
    return { valid: false, message: "URL cannot be empty" };
  }

  // HTTPS 格式: https://github.com/user/repo.git
  const httpsRegex = /^https?:\/\/[^/]+\/[^/]+\/[^/]+/;
  // SSH 格式: git@github.com:user/repo.git
  const sshRegex = /^git@[^:]+:[^/]+\/[^/]+/;

  if (!httpsRegex.test(url) && !sshRegex.test(url)) {
    return {
      valid: false,
      message:
        "Invalid Git URL format. Expected HTTPS (https://...) or SSH (git@...) format",
    };
  }

  return { valid: true };
}

/**
 * 检查字符串是否为 Git URL
 * @param str 字符串
 * @returns 是否为 Git URL
 *
 * @example
 * ```typescript
 * if (isGitUrl(input)) {
 *   // 处理 URL
 * } else {
 *   // 处理仓库名称
 * }
 * ```
 */
export function isGitUrl(str: string): boolean {
  // HTTPS 格式: https://github.com/user/repo.git
  const httpsRegex = /^https?:\/\/[^/]+\/[^/]+\/[^/]+/;
  // SSH 格式: git@github.com:user/repo.git
  const sshRegex = /^git@[^:]+:[^/]+\/[^/]+/;

  return httpsRegex.test(str) || sshRegex.test(str);
}

/**
 * 验证分支名称
 * @param branch 分支名称
 * @returns 验证结果
 */
export function validateBranchName(branch: string): ValidationResult {
  if (!branch || branch.trim() === "") {
    return { valid: false, message: "Branch name cannot be empty" };
  }

  // Git 分支名称规则
  // 不能以 . 开头
  if (branch.startsWith(".")) {
    return { valid: false, message: "Branch name cannot start with '.'" };
  }

  // 不能包含连续的 ..
  if (branch.includes("..")) {
    return { valid: false, message: "Branch name cannot contain '..'" };
  }

  // 不能包含特殊字符
  const invalidChars = /[\s~^:?*[\]\\@{}\x00-\x1f\x7f]/;
  if (invalidChars.test(branch)) {
    return { valid: false, message: "Branch name contains invalid characters" };
  }

  // 不能以 / 结尾
  if (branch.endsWith("/")) {
    return { valid: false, message: "Branch name cannot end with '/'" };
  }

  // 不能以 .lock 结尾
  if (branch.endsWith(".lock")) {
    return { valid: false, message: "Branch name cannot end with '.lock'" };
  }

  return { valid: true };
}

/**
 * 验证路径
 * @param path 路径字符串
 * @returns 验证结果
 */
export function validatePath(path: string): ValidationResult {
  if (!path || path.trim() === "") {
    return { valid: false, message: "Path cannot be empty" };
  }

  // 检查是否包含非法字符（Windows）
  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  if (invalidChars.test(path)) {
    return { valid: false, message: "Path contains invalid characters" };
  }

  // 检查路径长度
  if (path.length > 260) {
    return { valid: false, message: "Path is too long (max 260 characters)" };
  }

  return { valid: true };
}

/**
 * 验证正整数
 * @param value 值
 * @param options 选项
 * @returns 验证结果
 */
export function validatePositiveInteger(
  value: string | number,
  options: { min?: number; max?: number; fieldName?: string } = {},
): ValidationResult {
  const {
    min = 1,
    max = Number.MAX_SAFE_INTEGER,
    fieldName = "Value",
  } = options;

  const num = typeof value === "string" ? parseInt(value, 10) : value;

  if (isNaN(num)) {
    return { valid: false, message: `${fieldName} must be a number` };
  }

  if (!Number.isInteger(num)) {
    return { valid: false, message: `${fieldName} must be an integer` };
  }

  if (num < min) {
    return { valid: false, message: `${fieldName} must be at least ${min}` };
  }

  if (num > max) {
    return { valid: false, message: `${fieldName} must be at most ${max}` };
  }

  return { valid: true };
}

/**
 * 验证配置键名
 * @param key 键名
 * @param validKeys 有效的键名列表
 * @returns 验证结果
 */
export function validateConfigKey(
  key: string,
  validKeys: readonly string[],
): ValidationResult {
  if (!key || key.trim() === "") {
    return { valid: false, message: "Configuration key cannot be empty" };
  }

  if (!validKeys.includes(key)) {
    return {
      valid: false,
      message: `Unknown configuration key: ${key}. Valid keys: ${validKeys.join(", ")}`,
    };
  }

  return { valid: true };
}

/**
 * 组合多个验证器
 * @param validators 验证器数组
 * @returns 组合后的验证结果
 *
 * @example
 * ```typescript
 * const result = combineValidations([
 *   validateRepoName(name),
 *   validatePath(path)
 * ]);
 * ```
 */
export function combineValidations(
  validators: ValidationResult[],
): ValidationResult {
  for (const result of validators) {
    if (!result.valid) {
      return result;
    }
  }
  return { valid: true };
}

/**
 * 创建自定义验证器
 * @param predicate 验证函数
 * @param message 错误消息
 * @returns 验证函数
 *
 * @example
 * ```typescript
 * const validateEmail = createValidator(
 *   (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
 *   "Invalid email format"
 * );
 * ```
 */
export function createValidator(
  predicate: (value: string) => boolean,
  message: string,
): (value: string) => ValidationResult {
  return (value: string) => {
    if (predicate(value)) {
      return { valid: true };
    }
    return { valid: false, message };
  };
}

/**
 * 验证并抛出错误（如果无效）
 * @param result 验证结果
 * @throws Error 如果验证失败
 */
export function assertValid(result: ValidationResult): void {
  if (!result.valid) {
    throw new Error(result.message);
  }
}
