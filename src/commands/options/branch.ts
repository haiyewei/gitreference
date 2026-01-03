/**
 * --branch 参数
 * 用于指定 Git 分支
 */

import { Option } from "commander";

/**
 * --branch 选项
 * 用于 add, load 等命令指定 Git 分支
 */
export const branchOption = new Option(
  "-b, --branch <branch>",
  "Specify branch",
);
