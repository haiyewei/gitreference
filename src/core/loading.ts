/**
 * loading.json 管理模块
 * 用于追踪已加载的参考代码仓库
 */

import * as fs from "fs/promises";
import * as path from "path";
import { randomUUID } from "crypto";
import type { LoadingEntry, LoadingConfig } from "../types/index.js";

/** loading.json 文件名 */
const LOADING_FILE_NAME = "loading.json";

/** .gitreference 目录名 */
const GITREFERENCE_DIR = ".gitreference";

/** 当前配置版本 */
const CONFIG_VERSION = "1.0.0";

/**
 * 获取 loading.json 文件路径
 * @param projectRoot 项目根目录，默认为当前工作目录
 * @returns loading.json 的绝对路径
 */
export function getLoadingFilePath(
  projectRoot: string = process.cwd(),
): string {
  return path.join(projectRoot, GITREFERENCE_DIR, LOADING_FILE_NAME);
}

/**
 * 读取 loading.json 配置
 * @param projectRoot 项目根目录
 * @returns 加载配置，如果文件不存在则返回空配置
 */
export async function readLoadingConfig(
  projectRoot: string = process.cwd(),
): Promise<LoadingConfig> {
  const filePath = getLoadingFilePath(projectRoot);

  try {
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as LoadingConfig;
  } catch (error) {
    // 文件不存在或解析失败，返回空配置
    return {
      version: CONFIG_VERSION,
      entries: [],
    };
  }
}

/**
 * 写入 loading.json 配置
 * @param config 加载配置
 * @param projectRoot 项目根目录
 */
export async function writeLoadingConfig(
  config: LoadingConfig,
  projectRoot: string = process.cwd(),
): Promise<void> {
  const filePath = getLoadingFilePath(projectRoot);
  const dirPath = path.dirname(filePath);

  // 确保目录存在
  await fs.mkdir(dirPath, { recursive: true });

  // 写入文件
  await fs.writeFile(filePath, JSON.stringify(config, null, 2), "utf-8");
}

/**
 * 添加加载条目
 * @param entry 加载条目（不含 id 和 loadedAt）
 * @param projectRoot 项目根目录
 * @returns 添加的完整条目
 */
export async function addEntry(
  entry: Omit<LoadingEntry, "id" | "loadedAt">,
  projectRoot: string = process.cwd(),
): Promise<LoadingEntry> {
  const config = await readLoadingConfig(projectRoot);

  const newEntry: LoadingEntry = {
    ...entry,
    id: randomUUID(),
    loadedAt: new Date().toISOString(),
  };

  config.entries.push(newEntry);
  await writeLoadingConfig(config, projectRoot);

  return newEntry;
}

/**
 * 获取所有加载条目
 * @param projectRoot 项目根目录
 * @returns 加载条目列表
 */
export async function getEntries(
  projectRoot: string = process.cwd(),
): Promise<LoadingEntry[]> {
  const config = await readLoadingConfig(projectRoot);
  return config.entries;
}

/**
 * 根据 ID 获取加载条目
 * @param id 条目 ID
 * @param projectRoot 项目根目录
 * @returns 加载条目，如果不存在则返回 undefined
 */
export async function getEntryById(
  id: string,
  projectRoot: string = process.cwd(),
): Promise<LoadingEntry | undefined> {
  const config = await readLoadingConfig(projectRoot);
  return config.entries.find((entry) => entry.id === id);
}

/**
 * 根据目标路径获取加载条目
 * @param targetPath 目标路径
 * @param projectRoot 项目根目录
 * @returns 加载条目，如果不存在则返回 undefined
 */
export async function getEntryByTargetPath(
  targetPath: string,
  projectRoot: string = process.cwd(),
): Promise<LoadingEntry | undefined> {
  const config = await readLoadingConfig(projectRoot);
  // 标准化路径进行比较
  const normalizedTarget = path.normalize(targetPath);
  return config.entries.find(
    (entry) => path.normalize(entry.targetPath) === normalizedTarget,
  );
}

/**
 * 根据仓库名称获取加载条目
 * @param repoName 仓库名称
 * @param projectRoot 项目根目录
 * @returns 匹配的加载条目列表
 */
export async function getEntriesByRepoName(
  repoName: string,
  projectRoot: string = process.cwd(),
): Promise<LoadingEntry[]> {
  const config = await readLoadingConfig(projectRoot);
  return config.entries.filter((entry) => entry.repoName.includes(repoName));
}

/**
 * 删除加载条目
 * @param id 条目 ID
 * @param projectRoot 项目根目录
 * @returns 是否成功删除
 */
export async function removeEntry(
  id: string,
  projectRoot: string = process.cwd(),
): Promise<boolean> {
  const config = await readLoadingConfig(projectRoot);
  const index = config.entries.findIndex((entry) => entry.id === id);

  if (index === -1) {
    return false;
  }

  config.entries.splice(index, 1);
  await writeLoadingConfig(config, projectRoot);

  return true;
}

/**
 * 根据目标路径删除加载条目
 * @param targetPath 目标路径
 * @param projectRoot 项目根目录
 * @returns 被删除的条目，如果不存在则返回 undefined
 */
export async function removeEntryByTargetPath(
  targetPath: string,
  projectRoot: string = process.cwd(),
): Promise<LoadingEntry | undefined> {
  const config = await readLoadingConfig(projectRoot);
  const normalizedTarget = path.normalize(targetPath);
  const index = config.entries.findIndex(
    (entry) => path.normalize(entry.targetPath) === normalizedTarget,
  );

  if (index === -1) {
    return undefined;
  }

  const [removed] = config.entries.splice(index, 1);
  await writeLoadingConfig(config, projectRoot);

  return removed;
}

/**
 * 清空所有加载条目
 * @param projectRoot 项目根目录
 */
export async function clearAllEntries(
  projectRoot: string = process.cwd(),
): Promise<void> {
  const config: LoadingConfig = {
    version: CONFIG_VERSION,
    entries: [],
  };
  await writeLoadingConfig(config, projectRoot);
}

/**
 * 更新加载条目
 * @param id 条目 ID
 * @param updates 要更新的字段
 * @param projectRoot 项目根目录
 * @returns 更新后的条目，如果不存在则返回 undefined
 */
export async function updateEntry(
  id: string,
  updates: Partial<Omit<LoadingEntry, "id" | "loadedAt">>,
  projectRoot: string = process.cwd(),
): Promise<LoadingEntry | undefined> {
  const config = await readLoadingConfig(projectRoot);
  const index = config.entries.findIndex((entry) => entry.id === id);

  if (index === -1) {
    return undefined;
  }

  config.entries[index] = {
    ...config.entries[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  await writeLoadingConfig(config, projectRoot);

  return config.entries[index];
}
