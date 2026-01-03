/**
 * config 命令类型定义
 */

import type { GlobalConfig } from "../../types/index.js";

/** 有效的配置项列表 */
export const validKeys = [
  "defaultBranch",
  "shallowClone",
  "shallowDepth",
] as const;

/** 配置项名称类型 */
export type ConfigKey = (typeof validKeys)[number];

/**
 * config 命令选项
 */
export interface ConfigOptions {
  /** 显示配置文件路径 */
  path?: boolean;
  /** 显示所有配置 */
  list?: boolean;
}

/**
 * config 命令上下文
 */
export interface ConfigContext {
  /** 配置项名称 */
  key?: string;
  /** 配置值 */
  value?: string;
  /** 命令选项 */
  options: ConfigOptions;
  /** 全局配置（在处理过程中填充） */
  config?: GlobalConfig;
}
