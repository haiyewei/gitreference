/**
 * --clean-empty 参数
 * 用于清理空目录结构
 */

import { Option } from "commander";

/**
 * --clean-empty 选项
 * 用于 unload 命令清理 .gitreference/ 中的空目录结构
 */
export const cleanEmptyOption = new Option(
  "--clean-empty",
  "Clean empty directory structures in .gitreference/",
);
