/**
 * --force 参数
 * 用于跳过确认提示
 */

import { Option } from "commander";

/**
 * --force 选项
 * 用于 clean, unload, update 等命令跳过确认提示
 */
export const forceOption = new Option(
  "-f, --force",
  "Skip confirmation prompt",
);
