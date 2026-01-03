/**
 * config 命令 - 显示所有配置处理器
 */

import { ConfigContext } from "../types.js";
import { displayAllConfig } from "../display.js";

/**
 * 处理 --list 或无参数时显示所有配置
 * @param context 命令上下文
 * @returns 如果处理了该选项返回 true，否则返回 false
 */
export async function handleShowAll(context: ConfigContext): Promise<boolean> {
  // --list 或无参数: 显示所有配置
  if (!context.options.list && (context.key || context.value)) {
    return false;
  }

  if (!context.config) {
    return false;
  }

  displayAllConfig(context.config);
  return true;
}
