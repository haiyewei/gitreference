/**
 * 命令注册中心
 * 统一导出所有命令的注册函数
 */

import { Command } from "commander";

// 导入所有命令模块的注册函数
import { registerAddCommand } from "./add.js";
import { registerCleanCommand } from "./clean.js";
import { registerConfigCommand } from "./config.js";
import { registerListCommand } from "./list.js";
import { registerLoadCommand } from "./load.js";
import { registerUnloadCommand } from "./unload.js";
import { registerUpdateCommand } from "./update.js";

/**
 * 命令注册函数类型
 */
export type CommandRegister = (program: Command) => void;

/**
 * 所有命令注册函数列表
 * 按字母顺序排列，便于维护
 */
export const commands: CommandRegister[] = [
  registerAddCommand,
  registerCleanCommand,
  registerConfigCommand,
  registerListCommand,
  registerLoadCommand,
  registerUnloadCommand,
  registerUpdateCommand,
];

/**
 * 批量注册所有命令
 * @param program Commander 程序实例
 */
export function registerAllCommands(program: Command): void {
  commands.forEach((register) => register(program));
}

// 单独导出各命令的注册函数，方便按需使用
export { registerAddCommand } from "./add.js";
export { registerCleanCommand } from "./clean.js";
export { registerConfigCommand } from "./config.js";
export { registerListCommand } from "./list.js";
export { registerLoadCommand } from "./load.js";
export { registerUnloadCommand } from "./unload.js";
export { registerUpdateCommand } from "./update.js";
