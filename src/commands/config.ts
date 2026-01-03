/**
 * config 命令
 * 管理全局配置
 */

import { Command } from "commander";
import chalk from "chalk";
import {
  readGlobalConfig,
  writeGlobalConfig,
  getConfigPath,
} from "../core/config.js";
import { GlobalConfig } from "../types/index.js";
import { shortenPath, StatusIcon } from "../ui/format.js";
import { handleError } from "../utils/error.js";

/**
 * 注册 config 命令
 * @param program Commander 程序实例
 */
export function registerConfigCommand(program: Command): void {
  program.addCommand(configCommand);
}

/** 有效的配置项列表 */
const validKeys = ["defaultBranch", "shallowClone", "shallowDepth"] as const;
type ConfigKey = (typeof validKeys)[number];

/**
 * 检查是否为有效的配置项
 * @param key 配置项名称
 * @returns 是否有效
 */
function isValidKey(key: string): key is ConfigKey {
  return validKeys.includes(key as ConfigKey);
}

/**
 * 解析配置值，根据配置项类型进行转换
 * @param key 配置项名称
 * @param value 配置值字符串
 * @returns 转换后的值
 */
function parseValue(key: ConfigKey, value: string): string | boolean | number {
  // shallowClone 应该是布尔值
  if (key === "shallowClone") {
    if (value === "true" || value === "1") {
      return true;
    }
    if (value === "false" || value === "0") {
      return false;
    }
    throw new Error(`Invalid value for ${key}: expected 'true' or 'false'`);
  }

  // shallowDepth 应该是数字
  if (key === "shallowDepth") {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) {
      throw new Error(`Invalid value for ${key}: expected a positive number`);
    }
    return num;
  }

  // 其他都是字符串
  return value;
}

/**
 * 格式化配置值用于显示
 * @param value 配置值
 * @returns 格式化后的字符串
 */
function formatValue(value: string | boolean | number | undefined): string {
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
function showAllConfig(config: GlobalConfig): void {
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
 * @param config 配置对象
 * @param key 配置项名称
 */
function showConfigValue(config: GlobalConfig, key: ConfigKey): void {
  const value = config[key];
  if (value === undefined) {
    console.log(chalk.gray("(not set)"));
  } else {
    console.log(String(value));
  }
}

export const configCommand = new Command("config")
  .description("Manage global configuration")
  .argument("[key]", "Configuration key")
  .argument("[value]", "Configuration value")
  .option("--list", "Show all configuration")
  .option("--path", "Show configuration file path")
  .action(
    async (
      key: string | undefined,
      value: string | undefined,
      options: { list?: boolean; path?: boolean },
    ) => {
      try {
        // --path: 显示配置文件路径
        if (options.path) {
          console.log(shortenPath(getConfigPath()));
          return;
        }

        const config = await readGlobalConfig();

        // --list 或无参数: 显示所有配置
        if (options.list || (!key && !value)) {
          showAllConfig(config);
          return;
        }

        // 验证配置项名称
        if (!isValidKey(key!)) {
          console.error(chalk.red(`Unknown configuration key: ${key}`));
          console.log();
          console.log(`Valid keys: ${validKeys.join(", ")}`);
          process.exit(1);
        }

        // 只有 key，没有 value: 显示配置项的值
        if (value === undefined) {
          showConfigValue(config, key);
          return;
        }

        // 有 key 和 value: 设置配置项
        const parsedValue = parseValue(key, value);

        // 更新配置
        (config as unknown as Record<string, unknown>)[key] = parsedValue;
        await writeGlobalConfig(config);

        console.log(
          StatusIcon.success +
            ` Configuration updated: ${chalk.white(key)} = ${formatValue(parsedValue)}`,
        );
      } catch (error) {
        handleError(error, { exit: true });
      }
    },
  );
