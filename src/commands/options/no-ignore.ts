/**
 * --no-ignore 参数
 * 用于禁止更新 .gitignore
 */

import { Option } from "commander";

/**
 * --no-ignore 选项
 * 用于 load 命令禁止自动更新 .gitignore 文件
 */
export const noIgnoreOption = new Option(
  "--no-ignore",
  "Do not update .gitignore",
);
