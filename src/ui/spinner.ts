/**
 * Spinner 封装模块
 * 提供统一的加载指示器接口
 */

import ora, { type Ora, type Options as OraOptions } from "ora";
import chalk from "chalk";

/**
 * Spinner 配置选项
 */
export interface SpinnerOptions {
  /** 初始文本 */
  text?: string;
  /** 是否立即启动 */
  start?: boolean;
  /** 颜色 */
  color?: OraOptions["color"];
  /** 前缀文本 */
  prefixText?: string;
}

/**
 * Spinner 实例类型
 */
export type Spinner = Ora;

/**
 * 创建一个新的 spinner 实例
 * @param textOrOptions 文本或配置选项
 * @returns Spinner 实例
 *
 * @example
 * ```typescript
 * // 简单用法
 * const spinner = createSpinner("Loading...");
 * spinner.start();
 * // ... 执行操作
 * spinner.succeed("Done!");
 *
 * // 使用选项
 * const spinner = createSpinner({
 *   text: "Processing...",
 *   color: "cyan",
 *   start: true
 * });
 * ```
 */
export function createSpinner(
  textOrOptions?: string | SpinnerOptions,
): Spinner {
  if (typeof textOrOptions === "string") {
    return ora(textOrOptions);
  }

  const options = textOrOptions ?? {};
  const spinner = ora({
    text: options.text,
    color: options.color,
    prefixText: options.prefixText,
  });

  if (options.start) {
    spinner.start();
  }

  return spinner;
}

/**
 * 创建并立即启动一个 spinner
 * @param text 显示文本
 * @returns 已启动的 Spinner 实例
 *
 * @example
 * ```typescript
 * const spinner = startSpinner("Cloning repository...");
 * // ... 执行操作
 * spinner.succeed("Repository cloned!");
 * ```
 */
export function startSpinner(text: string): Spinner {
  return ora(text).start();
}

/**
 * 带有成功/失败回调的 spinner 包装器
 * @param text 初始文本
 * @param task 要执行的异步任务
 * @returns 任务结果
 *
 * @example
 * ```typescript
 * const result = await withSpinner("Fetching data...", async (spinner) => {
 *   const data = await fetchData();
 *   spinner.text = "Processing data...";
 *   return processData(data);
 * });
 * ```
 */
export async function withSpinner<T>(
  text: string,
  task: (spinner: Spinner) => Promise<T>,
): Promise<T> {
  const spinner = ora(text).start();

  try {
    const result = await task(spinner);
    spinner.succeed();
    return result;
  } catch (error) {
    spinner.fail();
    throw error;
  }
}

/**
 * 带有自定义成功/失败消息的 spinner 包装器
 * @param options 配置选项
 * @param task 要执行的异步任务
 * @returns 任务结果
 *
 * @example
 * ```typescript
 * const result = await withSpinnerMessages(
 *   {
 *     start: "Cloning repository...",
 *     success: "Repository cloned successfully!",
 *     fail: "Failed to clone repository"
 *   },
 *   async () => {
 *     return await cloneRepo(url);
 *   }
 * );
 * ```
 */
export async function withSpinnerMessages<T>(
  options: {
    start: string;
    success?: string;
    fail?: string;
  },
  task: (spinner: Spinner) => Promise<T>,
): Promise<T> {
  const spinner = ora(options.start).start();

  try {
    const result = await task(spinner);
    if (options.success) {
      spinner.succeed(chalk.green(options.success));
    } else {
      spinner.succeed();
    }
    return result;
  } catch (error) {
    if (options.fail) {
      spinner.fail(chalk.red(options.fail));
    } else {
      spinner.fail();
    }
    throw error;
  }
}
