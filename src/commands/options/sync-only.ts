/**
 * --sync-only 参数
 * 用于仅同步工作区而不更新缓存
 */

import { Option } from "commander";

/**
 * --sync-only 选项
 * 用于 update 命令仅同步工作区，跳过缓存更新
 */
export const syncOnlyOption = new Option(
  "--sync-only",
  "Only sync to workspace (skip cache update)",
);
