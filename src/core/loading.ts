/**
 * loading.json 管理模块（兼容层）
 * 用于追踪已加载的参考代码仓库
 *
 * 此模块现在作为兼容层，内部使用 loading-state.ts 模块
 * 保持原有 API 不变，确保向后兼容
 */

import * as path from "path";
import { randomUUID } from "crypto";
import type { LoadingEntry, LoadingConfig } from "../types/index.js";
import { getLoadingStatePath } from "./paths.js";
import {
  loadingState,
  getAllLoadingStates,
  markAsLoaded,
  markAsUnloaded,
  type RepoLoadingState,
} from "./loading-state.js";

/** 当前配置版本 */
const CONFIG_VERSION = "1.0.0";

/**
 * 从 RepoLoadingState 和键构建 LoadingEntry
 * @param key 唯一键 (workingDirectory::targetPath)
 * @param state 加载状态
 * @returns LoadingEntry 对象
 */
function buildEntryFromState(
  key: string,
  state: RepoLoadingState,
): LoadingEntry {
  // 从 targetPath 中提取 repoName（用于显示）
  // targetPath 格式通常为 .gitreference/owner/repo 或自定义路径
  const pathParts = state.targetPath.split("/");
  const repoName =
    pathParts.length >= 3
      ? `${pathParts[pathParts.length - 2]}/${pathParts[pathParts.length - 1]}`
      : pathParts[pathParts.length - 1] || state.targetPath;

  return {
    id: randomUUID(), // 每次构建时生成新 ID（兼容层限制）
    repoName,
    repoUrl: "", // 新模块不存储此信息
    commitId: "", // 新模块不存储此信息
    branch: state.branch,
    targetPath: state.targetPath,
    loadedAt: state.loadedAt,
    workingDirectory: state.workingDirectory,
  };
}

/**
 * 获取 loading.json 文件路径
 * @returns loading.json 的绝对路径（位于用户主目录下）
 */
export function getLoadingFilePath(): string {
  // 使用新的路径管理模块
  return getLoadingStatePath();
}

/**
 * 读取 loading.json 配置
 * @returns 加载配置，如果文件不存在则返回空配置
 */
export async function readLoadingConfig(): Promise<LoadingConfig> {
  // 从新模块获取所有加载状态
  const states = await getAllLoadingStates();

  // 转换为 LoadingEntry 格式
  const entries: LoadingEntry[] = Object.entries(states).map(([key, state]) =>
    buildEntryFromState(key, state),
  );

  return {
    version: CONFIG_VERSION,
    entries,
  };
}

/**
 * 写入 loading.json 配置
 * @param config 加载配置
 * @deprecated 此函数保留用于兼容，但建议使用 addEntry/removeEntry 等函数
 */
export async function writeLoadingConfig(config: LoadingConfig): Promise<void> {
  // 清空现有状态
  await loadingState.clear();

  // 逐个添加条目
  for (const entry of config.entries) {
    // 兼容层：旧的 LoadingEntry 没有 workingDirectory，使用空字符串作为占位
    const workingDir = entry.workingDirectory || "";
    await markAsLoaded(entry.targetPath, workingDir, entry.branch);
  }
}

/**
 * 添加加载条目
 * @param entry 加载条目（不含 id 和 loadedAt），必须包含 workingDirectory
 * @returns 添加的完整条目
 */
export async function addEntry(
  entry: Omit<LoadingEntry, "id" | "loadedAt"> & { workingDirectory: string },
): Promise<LoadingEntry> {
  const loadedAt = new Date().toISOString();

  // 使用新模块标记为已加载（使用 workingDirectory + targetPath 作为唯一键）
  await markAsLoaded(entry.targetPath, entry.workingDirectory, entry.branch);

  // 构建完整的条目
  const newEntry: LoadingEntry = {
    ...entry,
    id: randomUUID(),
    loadedAt,
  };

  return newEntry;
}

/**
 * 获取所有加载条目
 * @returns 加载条目列表
 */
export async function getEntries(): Promise<LoadingEntry[]> {
  const config = await readLoadingConfig();
  return config.entries;
}

/**
 * 根据 ID 获取加载条目
 * @param id 条目 ID
 * @returns 加载条目，如果不存在则返回 undefined
 * @deprecated 新模块不支持按 ID 查询，此函数功能受限
 */
export async function getEntryById(
  id: string,
): Promise<LoadingEntry | undefined> {
  // 新模块不支持按 ID 查询，遍历所有条目
  const entries = await getEntries();
  return entries.find((entry) => entry.id === id);
}

/**
 * 根据目标路径获取加载条目
 * @param targetPath 目标路径
 * @returns 加载条目，如果不存在则返回 undefined
 */
export async function getEntryByTargetPath(
  targetPath: string,
): Promise<LoadingEntry | undefined> {
  const states = await getAllLoadingStates();
  const normalizedTarget = path.normalize(targetPath);

  // 查找匹配的条目
  for (const [key, state] of Object.entries(states)) {
    if (path.normalize(state.targetPath) === normalizedTarget) {
      return buildEntryFromState(key, state);
    }
  }

  return undefined;
}

/**
 * 根据仓库名称获取加载条目
 * @param repoName 仓库名称
 * @returns 匹配的加载条目列表
 */
export async function getEntriesByRepoName(
  repoName: string,
): Promise<LoadingEntry[]> {
  const states = await getAllLoadingStates();
  const results: LoadingEntry[] = [];

  // 查找包含指定名称的仓库（在 targetPath 中搜索）
  for (const [key, state] of Object.entries(states)) {
    if (state.targetPath.includes(repoName)) {
      results.push(buildEntryFromState(key, state));
    }
  }

  return results;
}

/**
 * 删除加载条目
 * @param id 条目 ID
 * @returns 是否成功删除
 * @deprecated 新模块不支持按 ID 删除，此函数功能受限
 */
export async function removeEntry(id: string): Promise<boolean> {
  // 新模块不支持按 ID 删除，需要先找到对应的条目
  const entries = await getEntries();
  const entry = entries.find((e) => e.id === id);

  if (!entry) {
    return false;
  }

  // 使用 workingDirectory + targetPath 删除
  return markAsUnloaded(entry.workingDirectory || "", entry.targetPath);
}

/**
 * 根据目标路径删除加载条目
 * @param targetPath 目标路径
 * @returns 被删除的条目，如果不存在则返回 undefined
 */
export async function removeEntryByTargetPath(
  targetPath: string,
): Promise<LoadingEntry | undefined> {
  const states = await getAllLoadingStates();
  const normalizedTarget = path.normalize(targetPath);

  // 查找匹配的条目
  for (const [key, state] of Object.entries(states)) {
    if (path.normalize(state.targetPath) === normalizedTarget) {
      const entry = buildEntryFromState(key, state);
      await markAsUnloaded(state.workingDirectory, state.targetPath);
      return entry;
    }
  }

  return undefined;
}

/**
 * 清空所有加载条目
 */
export async function clearAllEntries(): Promise<void> {
  await loadingState.clear();
}

/**
 * 更新加载条目
 * @param id 条目 ID
 * @param updates 要更新的字段
 * @returns 更新后的条目，如果不存在则返回 undefined
 * @deprecated 新模块不支持按 ID 更新，此函数功能受限
 */
export async function updateEntry(
  id: string,
  updates: Partial<Omit<LoadingEntry, "id" | "loadedAt">>,
): Promise<LoadingEntry | undefined> {
  // 新模块不支持按 ID 更新，需要先找到对应的条目
  const entries = await getEntries();
  const entry = entries.find((e) => e.id === id);

  if (!entry) {
    return undefined;
  }

  // 更新加载状态
  const oldWorkingDir = entry.workingDirectory || "";
  const oldTargetPath = entry.targetPath;
  const newTargetPath = updates.targetPath ?? entry.targetPath;
  const newWorkingDir = updates.workingDirectory ?? oldWorkingDir;
  const newBranch = updates.branch ?? entry.branch;

  // 如果路径变了，需要先删除旧的
  if (updates.targetPath && updates.targetPath !== entry.targetPath) {
    await markAsUnloaded(oldWorkingDir, oldTargetPath);
  }

  // 设置新的状态
  await markAsLoaded(newTargetPath, newWorkingDir, newBranch);

  // 返回更新后的条目
  return {
    ...entry,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
}
