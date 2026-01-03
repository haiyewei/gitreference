/**
 * --json 参数
 * 用于 JSON 格式输出
 */

import { Option } from "commander";

/**
 * --json 选项
 * 用于 list 等命令以 JSON 格式输出结果
 */
export const jsonOption = new Option("--json", "Output in JSON format");
