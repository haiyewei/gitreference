/**
 * --status 参数
 * 用于显示同步状态
 */

import { Option } from "commander";

/**
 * --status 选项
 * 用于 update 命令显示工作区与缓存之间的同步状态
 */
export const statusOption = new Option(
  "--status",
  "Show sync status between workspace and cache",
);
