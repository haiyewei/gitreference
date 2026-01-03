/**
 * --verbose 参数
 * 用于显示详细输出
 */

import { Option } from "commander";

/**
 * --verbose 选项
 * 用于 unload 等命令显示详细的操作进度
 */
export const verboseOption = new Option(
  "-v, --verbose",
  "Show detailed output",
);
