/**
 * config 命令显示/格式化逻辑
 */

import chalk from "chalk";
import { GlobalConfig } from "../../types/index.js";
import { shortenPath } from "../../ui/format.js";
import { getConfigPath } from "../../core/config.js";
import { validKeys } from "./types.js";

/**
 * 格式化配置值用于显示
 * @param value 配置值
 * @returns 格式化后的字符串
 */
export function formatValue(
  value: string | boolean | number | undefined,
): string {
  if (value === undefined) {
    return chalk.gray("(not set)");
  }
  if (typeof value === "boolean") {
    return value ? chalk.green("true") : chalk.yellow("false");
  }
  if (typeof value === "number") {
    return chalk.cyan(String(value));
  }
  return chalk.cyan(value);
}

/**
 * 显示所有配置
 * @param config 配置对象
 */
export function displayAllConfig(config: GlobalConfig): void {
  console.log(chalk.bold("Configuration:"));
  console.log();

  for (const key of validKeys) {
    const value = config[key];
    console.log(`  ${chalk.white(key + ":")}  ${formatValue(value)}`);
  }

  console.log();
  console.log(chalk.gray(`Config file: ${shortenPath(getConfigPath())}`));
}

/**
 * 显示单个配置项的值
 * @param value 配置值
 */
export function displayConfigValue(
  value: string | boolean | number | undefined,
): void {
  if (value === undefined) {
    console.log(chalk.gray("(not set)"));
  } else {
    console.log(String(value));
  }
}

/**
 * 显示配置更新成功信息
 * @param key 配置项名称
 * @param value 配置值
 */
export function displayUpdateSuccess(
  key: string,
  value: string | boolean | number,
): void {
  console.log(
    chalk.green("✓") +
      ` Configuration updated: ${chalk.white(key)} = ${formatValue(value)}`,
  );
}

/**
 * 显示无效配置项错误
 * @param key 无效的配置项名称
 */
export function displayInvalidKeyError(key: string): void {
  console.error(chalk.red(`Unknown configuration key: ${key}`));
  console.log();
  console.log(`Valid keys: ${validKeys.join(", ")}`);
}

/**
 * 显示配置文件路径
 */
export function displayConfigPath(): void {
  console.log(shortenPath(getConfigPath()));
}
