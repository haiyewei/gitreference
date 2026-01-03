/**
 * 命令注册中心
 * 统一导出所有命令的注册函数
 */

import { Command } from "commander";

// 导入所有命令模块的注册函数
import { registerAddCommand } from "./add/index.js";
import { registerCleanCommand } from "./clean/index.js";
import { registerConfigCommand } from "./config/index.js";
import { registerListCommand } from "./list/index.js";
import { registerLoadCommand } from "./load/index.js";
import { registerUnloadCommand } from "./unload/index.js";
import { registerUpdateCommand } from "./update/index.js";

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
export { registerAddCommand } from "./add/index.js";
export { registerCleanCommand } from "./clean/index.js";
export { registerConfigCommand } from "./config/index.js";
export { registerListCommand } from "./list/index.js";
export { registerLoadCommand } from "./load/index.js";
export { registerUnloadCommand } from "./unload/index.js";
export { registerUpdateCommand } from "./update/index.js";
