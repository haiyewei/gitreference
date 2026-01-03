/**
 * 错误处理模块
 * 提供统一的错误处理工具
 */

import chalk from "chalk";
import { GrfError, ErrorCode } from "../types/index.js";

/**
 * 错误处理选项
 */
export interface HandleErrorOptions {
  /** 是否退出进程 */
  exit?: boolean;
  /** 退出码 */
  exitCode?: number;
  /** 是否显示详细信息 */
  verbose?: boolean;
  /** 额外的提示信息 */
  hints?: string[];
}

/**
 * 统一处理错误并输出到控制台
 * @param error 错误对象
 * @param options 处理选项
 *
 * @example
 * ```typescript
 * try {
 *   await someOperation();
 * } catch (error) {
 *   handleError(error, { exit: true });
 * }
 * ```
 */
export function handleError(
  error: unknown,
  options: HandleErrorOptions = {},
): void {
  const { exit = false, exitCode = 1, verbose = false, hints = [] } = options;

  // 格式化并输出错误消息
  const message = getErrorMessage(error);
  console.error(chalk.red(`${chalk.bold("✗")} ${message}`));

  // 如果是 GrfError，提供更具体的错误提示
  if (error instanceof GrfError) {
    const errorHints = getErrorHints(error);
    for (const hint of errorHints) {
      console.error(chalk.gray(`  ${hint}`));
    }
  }

  // 显示额外的提示信息
  for (const hint of hints) {
    console.error(chalk.gray(`  ${hint}`));
  }

  // 在详细模式下显示堆栈信息
  if (verbose && error instanceof Error && error.stack) {
    console.error();
    console.error(chalk.gray("Stack trace:"));
    console.error(chalk.gray(error.stack));
  }

  // 退出进程
  if (exit) {
    process.exit(exitCode);
  }
}

/**
 * 获取错误消息
 * @param error 错误对象
 * @returns 错误消息字符串
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof GrfError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unknown error occurred";
}

/**
 * 根据错误码获取提示信息
 * @param error GrfError 实例
 * @returns 提示信息数组
 */
function getErrorHints(error: GrfError): string[] {
  const hints: string[] = [];

  switch (error.code) {
    case ErrorCode.REPO_NOT_FOUND:
      hints.push(
        `Use ${chalk.cyan("grf add <url>")} to add a repository first.`,
      );
      hints.push(
        `Or use ${chalk.cyan("grf list")} to see all cached repositories.`,
      );
      break;

    case ErrorCode.REPO_ALREADY_EXISTS:
      hints.push(
        `Use ${chalk.cyan("grf update <name>")} to update the existing repository.`,
      );
      hints.push(
        `Or use ${chalk.cyan("grf clean <name>")} to remove it first.`,
      );
      break;

    case ErrorCode.FS_PATH_NOT_FOUND:
      hints.push(
        "The source path does not exist. Please check the repository or subdirectory.",
      );
      break;

    case ErrorCode.FS_PERMISSION_DENIED:
      hints.push("Permission denied. Please check your file permissions.");
      break;

    case ErrorCode.GIT_CLONE_FAILED:
      hints.push(
        "Failed to clone repository. Please check the URL and your network connection.",
      );
      hints.push("Please check your network connection and try again.");
      break;

    case ErrorCode.GIT_CHECKOUT_FAILED:
      hints.push(
        `The branch may not exist. Use ${chalk.cyan("git branch -r")} to list available branches.`,
      );
      break;

    case ErrorCode.CONFIG_PARSE_ERROR:
      hints.push(
        "The configuration file may be corrupted. Try deleting it and reconfiguring.",
      );
      break;

    case ErrorCode.GIT_PULL_FAILED:
      hints.push("Please check your network connection and try again.");
      break;
  }

  return hints;
}

/**
 * 创建一个 GrfError 实例
 * @param code 错误码
 * @param message 错误消息
 * @returns GrfError 实例
 *
 * @example
 * ```typescript
 * throw createError(ErrorCode.REPO_NOT_FOUND, "Repository 'my-repo' not found");
 * ```
 */
export function createError(code: ErrorCode, message: string): GrfError {
  return new GrfError(code, message);
}

/**
 * 包装异步操作，统一处理错误
 * @param operation 异步操作
 * @param options 错误处理选项
 * @returns 操作结果或 undefined（如果发生错误且不退出）
 *
 * @example
 * ```typescript
 * const result = await wrapAsync(
 *   async () => await fetchData(),
 *   { exit: true }
 * );
 * ```
 */
export async function wrapAsync<T>(
  operation: () => Promise<T>,
  options: HandleErrorOptions = {},
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    handleError(error, options);
    if (!options.exit) {
      return undefined;
    }
    // 如果设置了 exit，handleError 会调用 process.exit，不会到达这里
    throw error;
  }
}

/**
 * 断言条件为真，否则抛出错误
 * @param condition 条件
 * @param code 错误码
 * @param message 错误消息
 *
 * @example
 * ```typescript
 * assertCondition(repo !== null, ErrorCode.REPO_NOT_FOUND, "Repository not found");
 * ```
 */
export function assertCondition(
  condition: boolean,
  code: ErrorCode,
  message: string,
): asserts condition {
  if (!condition) {
    throw createError(code, message);
  }
}

/**
 * 断言值不为 null 或 undefined
 * @param value 要检查的值
 * @param code 错误码
 * @param message 错误消息
 * @returns 非空值
 *
 * @example
 * ```typescript
 * const repo = assertNotNull(
 *   await repository.get(name),
 *   ErrorCode.REPO_NOT_FOUND,
 *   `Repository '${name}' not found`
 * );
 * ```
 */
export function assertNotNull<T>(
  value: T | null | undefined,
  code: ErrorCode,
  message: string,
): T {
  if (value === null || value === undefined) {
    throw createError(code, message);
  }
  return value;
}

/**
 * 检查是否为 GrfError
 * @param error 错误对象
 * @returns 是否为 GrfError
 */
export function isGrfError(error: unknown): error is GrfError {
  return error instanceof GrfError;
}

/**
 * 检查错误是否为特定错误码
 * @param error 错误对象
 * @param code 错误码
 * @returns 是否匹配
 */
export function isErrorCode(error: unknown, code: ErrorCode): boolean {
  return error instanceof GrfError && error.code === code;
}
