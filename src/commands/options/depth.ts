/**
 * --depth 参数
 * 用于指定浅克隆深度
 */

import { Option } from "commander";

/**
 * --depth 选项
 * 用于 add 命令指定浅克隆的深度
 */
export const depthOption = new Option(
  "--depth <n>",
  "Shallow clone depth",
).default("1");
