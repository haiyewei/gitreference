/**
 * config 命令辅助函数
 */

import { validKeys, ConfigKey } from "./types.js";

/**
 * 检查是否为有效的配置项
 * @param key 配置项名称
 * @returns 是否有效
 */
export function isValidKey(key: string): key is ConfigKey {
  return validKeys.includes(key as ConfigKey);
}

/**
 * 解析配置值，根据配置项类型进行转换
 * @param key 配置项名称
 * @param value 配置值字符串
 * @returns 转换后的值
 */
export function parseValue(
  key: ConfigKey,
  value: string,
): string | boolean | number {
  // shallowClone 应该是布尔值
  if (key === "shallowClone") {
    if (value === "true" || value === "1") {
      return true;
    }
    if (value === "false" || value === "0") {
      return false;
    }
    throw new Error(`Invalid value for ${key}: expected 'true' or 'false'`);
  }

  // shallowDepth 应该是数字
  if (key === "shallowDepth") {
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1) {
      throw new Error(`Invalid value for ${key}: expected a positive number`);
    }
    return num;
  }

  // 其他都是字符串
  return value;
}

/**
 * 获取有效配置项列表
 * @returns 有效配置项数组
 */
export function getValidKeys(): readonly string[] {
  return validKeys;
}
