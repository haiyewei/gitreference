/**
 * --subdir 参数
 * 用于指定只复制特定子目录
 */

import { Option } from "commander";

/**
 * --subdir 选项
 * 用于 load 命令只复制仓库的特定子目录
 */
export const subdirOption = new Option(
  "-s, --subdir <path>",
  "Copy only a specific subdirectory",
);
