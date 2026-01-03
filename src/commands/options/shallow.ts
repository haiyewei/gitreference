/**
 * --shallow / --no-shallow 参数
 * 用于控制浅克隆
 */

import { Option } from "commander";

/**
 * --shallow 选项
 * 用于 add 命令启用浅克隆（默认）
 */
export const shallowOption = new Option(
  "--shallow",
  "Shallow clone (default)",
).default(true);

/**
 * --no-shallow 选项
 * 用于 add 命令禁用浅克隆，执行完整克隆
 */
export const noShallowOption = new Option("--no-shallow", "Full clone");
