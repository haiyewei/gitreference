/**
 * config 命令 - 设置配置值处理器
 */

import { writeGlobalConfig } from "../../../core/config.js";
import { ConfigContext } from "../types.js";
import { isValidKey, parseValue } from "../helpers.js";
import { displayUpdateSuccess, displayInvalidKeyError } from "../display.js";

/**
 * 处理设置配置值
 * @param context 命令上下文
 * @returns 如果处理了该选项返回 true，否则返回 false
 */
export async function handleSetValue(context: ConfigContext): Promise<boolean> {
  // 有 key 和 value: 设置配置项
  if (!context.key || context.value === undefined) {
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

  const key = context.key;
  const parsedValue = parseValue(key, context.value);

  // 更新配置
  (context.config as unknown as Record<string, unknown>)[key] = parsedValue;
  await writeGlobalConfig(context.config);

  displayUpdateSuccess(key, parsedValue);
  return true;
}
