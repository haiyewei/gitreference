/**
 * --dry-run 参数
 * 用于预览操作而不实际执行
 */

import { Option } from "commander";

/**
 * --dry-run 选项
 * 用于 unload, update 等命令预览将要执行的操作
 */
export const dryRunOption = new Option(
  "--dry-run",
  "Show what would be done without actually doing it",
);
