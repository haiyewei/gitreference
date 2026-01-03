/**
 * --list 参数
 * 用于列出项目
 */

import { Option } from "commander";

/**
 * --list 选项
 * 用于 unload, config 等命令列出相关项目
 */
export const listOption = new Option("-l, --list", "List all items");
