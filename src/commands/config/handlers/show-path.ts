/**
 * config 命令 - 显示配置文件路径处理器
 */

import { ConfigContext } from "../types.js";
import { displayConfigPath } from "../display.js";

/**
 * 处理 --path 选项，显示配置文件路径
 * @param context 命令上下文
 * @returns 如果处理了该选项返回 true，否则返回 false
 */
export async function handleShowPath(context: ConfigContext): Promise<boolean> {
  if (!context.options.path) {
    return false;
  }

  displayConfigPath();
  return true;
}
