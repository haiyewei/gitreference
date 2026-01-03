/**
 * --name 参数
 * 用于指定自定义名称
 */

import { Option } from "commander";

/**
 * --name 选项
 * 用于 add 命令指定自定义仓库名称
 */
export const nameOption = new Option(
  "-n, --name <name>",
  "Custom repository name",
);
