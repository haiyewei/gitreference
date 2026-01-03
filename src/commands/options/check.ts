/**
 * --check 参数
 * 用于仅检查更新而不执行
 */

import { Option } from "commander";

/**
 * --check 选项
 * 用于 update 命令仅检查更新，不实际拉取
 */
export const checkOption = new Option(
  "--check",
  "Only check for updates, do not pull",
);
