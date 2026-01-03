/**
 * --path 参数
 * 用于显示配置文件路径
 */

import { Option } from "commander";

/**
 * --path 选项
 * 用于 config 命令显示配置文件路径
 */
export const pathOption = new Option("--path", "Show configuration file path");
