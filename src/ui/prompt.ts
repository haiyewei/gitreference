/**
 * 用户交互提示模块
 * 封装确认提示和用户输入功能
 */

import * as readline from "readline";
import chalk from "chalk";

/**
 * 确认提示选项
 */
export interface ConfirmOptions {
  /** 默认值（用户直接按回车时的选择） */
  defaultValue?: boolean;
  /** 提示后缀，默认为 "(y/N)" 或 "(Y/n)" */
  suffix?: string;
}

/**
 * 显示确认提示，等待用户输入 y/n
 * @param message 提示消息
 * @param options 配置选项
 * @returns 用户是否确认
 *
 * @example
 * ```typescript
 * // 默认为 No
 * const confirmed = await confirm("Are you sure?");
 *
 * // 默认为 Yes
 * const confirmed = await confirm("Continue?", { defaultValue: true });
 * ```
 */
export async function confirm(
  message: string,
  options: ConfirmOptions = {},
): Promise<boolean> {
  const { defaultValue = false, suffix } = options;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // 根据默认值确定提示后缀
  const promptSuffix = suffix ?? (defaultValue ? "(Y/n)" : "(y/N)");

  return new Promise((resolve) => {
    rl.question(`${message} ${promptSuffix} `, (answer) => {
      rl.close();

      const trimmedAnswer = answer.trim().toLowerCase();

      // 如果用户直接按回车，使用默认值
      if (trimmedAnswer === "") {
        resolve(defaultValue);
        return;
      }

      // 检查是否为肯定回答
      resolve(trimmedAnswer === "y" || trimmedAnswer === "yes");
    });
  });
}

/**
 * 输入提示选项
 */
export interface PromptOptions {
  /** 默认值 */
  defaultValue?: string;
  /** 是否允许空输入 */
  allowEmpty?: boolean;
  /** 输入验证函数 */
  validate?: (input: string) => boolean | string;
}

/**
 * 显示输入提示，等待用户输入
 * @param message 提示消息
 * @param options 配置选项
 * @returns 用户输入的内容
 *
 * @example
 * ```typescript
 * const name = await prompt("Enter repository name:");
 *
 * const name = await prompt("Enter name:", {
 *   defaultValue: "default-name",
 *   validate: (input) => input.length > 0 || "Name cannot be empty"
 * });
 * ```
 */
export async function prompt(
  message: string,
  options: PromptOptions = {},
): Promise<string> {
  const { defaultValue, allowEmpty = false, validate } = options;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // 构建提示消息
  let promptMessage = message;
  if (defaultValue) {
    promptMessage += chalk.gray(` (${defaultValue})`);
  }
  promptMessage += " ";

  return new Promise((resolve) => {
    const askQuestion = () => {
      rl.question(promptMessage, (answer) => {
        const trimmedAnswer = answer.trim();

        // 如果用户直接按回车且有默认值，使用默认值
        if (trimmedAnswer === "" && defaultValue !== undefined) {
          rl.close();
          resolve(defaultValue);
          return;
        }

        // 检查是否允许空输入
        if (trimmedAnswer === "" && !allowEmpty) {
          console.log(chalk.red("Input cannot be empty. Please try again."));
          askQuestion();
          return;
        }

        // 执行验证
        if (validate) {
          const validationResult = validate(trimmedAnswer);
          if (validationResult !== true) {
            const errorMessage =
              typeof validationResult === "string"
                ? validationResult
                : "Invalid input. Please try again.";
            console.log(chalk.red(errorMessage));
            askQuestion();
            return;
          }
        }

        rl.close();
        resolve(trimmedAnswer);
      });
    };

    askQuestion();
  });
}

/**
 * 显示带有选项的选择提示
 * @param message 提示消息
 * @param choices 选项列表
 * @returns 用户选择的选项索引
 *
 * @example
 * ```typescript
 * const index = await select("Choose an option:", [
 *   "Option 1",
 *   "Option 2",
 *   "Option 3"
 * ]);
 * ```
 */
export async function selectByNumber(
  message: string,
  choices: string[],
): Promise<number> {
  console.log(message);
  console.log();

  // 显示选项
  choices.forEach((choice, index) => {
    console.log(`  ${chalk.cyan(index + 1)}. ${choice}`);
  });
  console.log();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const askQuestion = () => {
      rl.question(`Enter number (1-${choices.length}): `, (answer) => {
        const num = parseInt(answer.trim(), 10);

        if (isNaN(num) || num < 1 || num > choices.length) {
          console.log(
            chalk.red(`Please enter a number between 1 and ${choices.length}.`),
          );
          askQuestion();
          return;
        }

        rl.close();
        resolve(num - 1);
      });
    };

    askQuestion();
  });
}

/**
 * 显示操作取消消息
 * @param message 可选的自定义消息
 */
export function showCancelled(message?: string): void {
  console.log(chalk.yellow(message ?? "Operation cancelled."));
}

/**
 * 显示警告消息
 * @param message 警告消息
 */
export function showWarning(message: string): void {
  console.log(chalk.yellow(`⚠️  ${message}`));
}

/**
 * 显示信息消息
 * @param message 信息消息
 */
export function showInfo(message: string): void {
  console.log(chalk.blue(`ℹ️  ${message}`));
}

/**
 * 显示成功消息
 * @param message 成功消息
 */
export function showSuccess(message: string): void {
  console.log(chalk.green(`✓ ${message}`));
}
