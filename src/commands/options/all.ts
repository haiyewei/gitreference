/**
 * --all 参数
 * 用于批量操作所有项目
 */

import { Option } from "commander";

/**
 * --all 选项
 * 用于 clean, unload 等命令执行批量操作
 */
export const allOption = new Option(
  "-a, --all",
  "Apply operation to all items",
);
