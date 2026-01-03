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
  getLoadingState,
  markAsLoaded,
  markAsUnloaded,
  isRepoLoaded,
  type RepoLoadingState,
} from "./loading-state.js";

/** 当前配置版本 */
const CONFIG_VERSION = "1.0.0";

/**
 * 内部缓存：存储完整的 LoadingEntry 数据
 * 由于新的 loading-state.ts 只存储简化的状态，
 * 我们需要在内存中维护完整的条目信息
 */
let entriesCache: LoadingEntry[] | null = null;

/**
 * 从 RepoLoadingState 和仓库名称构建 LoadingEntry
 * @param repoName 仓库名称
 * @param state 加载状态
 * @returns LoadingEntry 对象
 */
function buildEntryFromState(
  repoName: string,
  state: RepoLoadingState,
): LoadingEntry {
  return {
    id: randomUUID(), // 每次构建时生成新 ID（兼容层限制）
    repoName,
    repoUrl: "", // 新模块不存储此信息
    commitId: "", // 新模块不存储此信息
    branch: state.branch,
    targetPath: state.targetPath,
    loadedAt: state.loadedAt,
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
  const entries: LoadingEntry[] = Object.entries(states).map(
    ([repoName, state]) => buildEntryFromState(repoName, state),
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
    await markAsLoaded(entry.repoName, entry.targetPath, entry.branch);
  }

  // 更新缓存
  entriesCache = config.entries;
}

/**
 * 添加加载条目
 * @param entry 加载条目（不含 id 和 loadedAt）
 * @returns 添加的完整条目
 */
export async function addEntry(
  entry: Omit<LoadingEntry, "id" | "loadedAt">,
): Promise<LoadingEntry> {
  const loadedAt = new Date().toISOString();

  // 使用新模块标记为已加载
  await markAsLoaded(entry.repoName, entry.targetPath, entry.branch);

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
  for (const [repoName, state] of Object.entries(states)) {
    if (path.normalize(state.targetPath) === normalizedTarget) {
      return buildEntryFromState(repoName, state);
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

  // 查找包含指定名称的仓库
  for (const [name, state] of Object.entries(states)) {
    if (name.includes(repoName)) {
      results.push(buildEntryFromState(name, state));
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
  // 新模块不支持按 ID 删除，需要先找到对应的仓库名称
  const entries = await getEntries();
  const entry = entries.find((e) => e.id === id);

  if (!entry) {
    return false;
  }

  // 使用仓库名称删除
  return markAsUnloaded(entry.repoName);
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
  for (const [repoName, state] of Object.entries(states)) {
    if (path.normalize(state.targetPath) === normalizedTarget) {
      const entry = buildEntryFromState(repoName, state);
      await markAsUnloaded(repoName);
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
  entriesCache = null;
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
  // 新模块不支持按 ID 更新，需要先找到对应的仓库名称
  const entries = await getEntries();
  const entry = entries.find((e) => e.id === id);

  if (!entry) {
    return undefined;
  }

  // 更新加载状态
  const newRepoName = updates.repoName ?? entry.repoName;
  const newTargetPath = updates.targetPath ?? entry.targetPath;
  const newBranch = updates.branch ?? entry.branch;

  // 如果仓库名称变了，需要先删除旧的
  if (updates.repoName && updates.repoName !== entry.repoName) {
    await markAsUnloaded(entry.repoName);
  }

  // 设置新的状态
  await markAsLoaded(newRepoName, newTargetPath, newBranch);

  // 返回更新后的条目
  return {
    ...entry,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
}
