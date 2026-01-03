/**
 * --keep-empty 参数
 * 用于保留空的 .gitreference 目录
 */

import { Option } from "commander";

/**
 * --keep-empty 选项
 * 用于 unload 命令在移除后保留空的 .gitreference/ 目录
 */
export const keepEmptyOption = new Option(
  "--keep-empty",
  "Keep empty .gitreference/ directory after removal",
);
