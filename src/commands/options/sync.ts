/**
 * --sync 参数
 * 用于更新后同步到工作区
 */

import { Option } from "commander";

/**
 * --sync 选项
 * 用于 update 命令在更新缓存后同步到工作区
 */
export const syncOption = new Option(
  "-s, --sync",
  "Sync to workspace after updating cache",
);
