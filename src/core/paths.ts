/**
 * grf 路径管理模块
 * 集中管理所有配置文件路径
 */

import fs from "fs-extra";
import os from "os";
import path from "path";

// ============================================================================
// 基础路径常量
// ============================================================================

/** grf 配置目录名称 */
export const GRF_DIR_NAME = ".gitreference";

/** 配置子目录名称 */
export const CONFIG_DIR_NAME = "config";

// ============================================================================
// 配置文件名常量
// ============================================================================

/** 各配置项的文件名 */
export const CONFIG_FILES = {
  VERSION: "version.json",
  DEFAULT_BRANCH: "default-branch.json",
  SHALLOW_CLONE: "shallow-clone.json",
  SHALLOW_DEPTH: "shallow-depth.json",
} as const;

/** 仓库索引文件名 */
export const REPOS_INDEX_FILE = "repos.json";

/** 加载状态文件名 */
export const LOADING_STATE_FILE = "loading.json";

/** 旧版配置文件名（用于迁移） */
export const LEGACY_CONFIG_FILE = "config.json";

// ============================================================================
// 路径获取函数
// ============================================================================

/**
 * 获取 .gitreference 根目录路径
 * @returns grf 根目录的绝对路径 (~/.gitreference/)
 */
export function getGrfRoot(): string {
  return path.join(os.homedir(), GRF_DIR_NAME);
}

/**
 * 获取 config 子目录路径
 * @returns 配置子目录的绝对路径 (~/.gitreference/config/)
 */
export function getConfigDir(): string {
  return path.join(getGrfRoot(), CONFIG_DIR_NAME);
}

/**
 * 获取特定配置文件路径
 * @param configName 配置文件名（如 'version.json'）
 * @returns 配置文件的绝对路径 (~/.gitreference/config/{configName})
 */
export function getConfigFilePath(configName: string): string {
  return path.join(getConfigDir(), configName);
}

/**
 * 获取仓库索引文件路径
 * @returns 仓库索引文件的绝对路径 (~/.gitreference/repos.json)
 */
export function getReposIndexPath(): string {
  return path.join(getGrfRoot(), REPOS_INDEX_FILE);
}

/**
 * 获取加载状态文件路径
 * @returns 加载状态文件的绝对路径 (~/.gitreference/loading.json)
 */
export function getLoadingStatePath(): string {
  return path.join(getGrfRoot(), LOADING_STATE_FILE);
}

/**
 * 获取旧版配置文件路径（用于迁移）
 * @returns 旧版配置文件的绝对路径 (~/.gitreference/config.json)
 */
export function getLegacyConfigPath(): string {
  return path.join(getGrfRoot(), LEGACY_CONFIG_FILE);
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 确保 grf 相关目录存在
 * 如果目录不存在则创建
 */
export async function ensureGrfDirs(): Promise<void> {
  const grfRoot = getGrfRoot();
  const configDir = getConfigDir();

  await fs.ensureDir(grfRoot);
  await fs.ensureDir(configDir);
}
