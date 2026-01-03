/**
 * config 命令 - 显示单个配置值处理器
 */

import { ConfigContext } from "../types.js";
import { isValidKey } from "../helpers.js";
import { displayConfigValue, displayInvalidKeyError } from "../display.js";

/**
 * 处理显示单个配置值
 * @param context 命令上下文
 * @returns 如果处理了该选项返回 true，否则返回 false
 */
export async function handleShowValue(
  context: ConfigContext,
): Promise<boolean> {
  // 只有 key，没有 value: 显示配置项的值
  if (!context.key || context.value !== undefined) {
    return false;
  }

  // 验证配置项名称
  if (!isValidKey(context.key)) {
    displayInvalidKeyError(context.key);
    process.exit(1);
  }

  if (!context.config) {
    return false;
  }

  const value = context.config[context.key];
  displayConfigValue(value);
  return true;
}
