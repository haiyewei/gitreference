/**
 * 同步模块
 * 负责工作目录与全局缓存之间的同步操作
 */

import * as path from "path";
import * as loading from "./loading.js";
import * as repository from "./repository.js";
import * as filesystem from "./filesystem.js";
import * as git from "./git.js";
import type { LoadingEntry } from "../types/index.js";

// ============ 类型定义 ============

/**
 * 同步状态
 */
export interface SyncStatus {
  /** 条目 ID */
  entryId: string;
  /** 仓库名称 */
  repoName: string;
  /** 目标路径 */
  targetPath: string;
  /** loading.json 中记录的 commitId */
  loadedCommitId: string;
  /** 缓存仓库当前的 commitId */
  cacheCommitId: string;
  /** 是否需要同步 */
  needsSync: boolean;
  /** 缓存仓库是否存在 */
  cacheExists: boolean;
  /** 目标目录是否存在 */
  targetExists: boolean;
}

/**
 * 同步结果
 */
export interface SyncResult {
  /** 条目 ID */
  entryId: string;
  /** 仓库名称 */
  repoName: string;
  /** 是否成功 */
  success: boolean;
  /** 结果消息 */
  message: string;
  /** 旧的 commitId */
  oldCommitId?: string;
  /** 新的 commitId */
  newCommitId?: string;
}

// ============ 状态检测 ============

/**
 * 获取单个加载条目的同步状态
 * @param entry 加载条目
 * @param projectRoot 项目根目录
 * @returns 同步状态
 */
export async function getSyncStatus(
  entry: LoadingEntry,
  projectRoot: string = process.cwd(),
): Promise<SyncStatus> {
  const status: SyncStatus = {
    entryId: entry.id,
    repoName: entry.repoName,
    targetPath: entry.targetPath,
    loadedCommitId: entry.commitId,
    cacheCommitId: "",
    needsSync: false,
    cacheExists: false,
    targetExists: false,
  };

  // 检查目标目录是否存在
  const targetAbsPath = path.join(projectRoot, entry.targetPath);
  status.targetExists = await filesystem.exists(targetAbsPath);

  // 获取缓存仓库信息
  try {
    const repoInfo = await repository.get(entry.repoName);
    if (repoInfo) {
      status.cacheExists = true;
      // 获取缓存仓库当前的 commitId
      status.cacheCommitId = await git.getCurrentCommit(repoInfo.path);

      // 判断是否需要同步
      // 需要同步的情况：
      // 1. 目标目录不存在
      // 2. commitId 不一致
      if (!status.targetExists) {
        status.needsSync = true;
      } else if (status.loadedCommitId !== status.cacheCommitId) {
        status.needsSync = true;
      }
    } else {
      status.cacheExists = false;
      status.needsSync = false; // 缓存不存在，无法同步
    }
  } catch {
    // 获取仓库信息失败，标记缓存不存在
    status.cacheExists = false;
    status.needsSync = false;
  }

  return status;
}

/**
 * 获取所有已加载条目的同步状态
 * @param projectRoot 项目根目录
 * @returns 同步状态列表
 */
export async function getAllSyncStatus(
  projectRoot: string = process.cwd(),
): Promise<SyncStatus[]> {
  const entries = await loading.getEntries();
  const statusList: SyncStatus[] = [];

  for (const entry of entries) {
    const status = await getSyncStatus(entry, projectRoot);
    statusList.push(status);
  }

  return statusList;
}

// ============ 同步操作 ============

/**
 * 同步单个条目到工作目录
 * @param entry 加载条目
 * @param force 是否强制同步（忽略本地修改）
 * @param projectRoot 项目根目录
 * @returns 同步结果
 */
export async function syncEntry(
  entry: LoadingEntry,
  force = false,
  projectRoot: string = process.cwd(),
): Promise<SyncResult> {
  const result: SyncResult = {
    entryId: entry.id,
    repoName: entry.repoName,
    success: false,
    message: "",
    oldCommitId: entry.commitId,
  };

  try {
    // 获取缓存仓库信息
    const repoInfo = await repository.get(entry.repoName);
    if (!repoInfo) {
      result.message = `缓存仓库不存在: ${entry.repoName}`;
      return result;
    }

    // 获取缓存仓库当前的 commitId
    const cacheCommitId = await git.getCurrentCommit(repoInfo.path);
    result.newCommitId = cacheCommitId;

    // 检查是否需要同步
    const targetAbsPath = path.join(projectRoot, entry.targetPath);
    const targetExists = await filesystem.exists(targetAbsPath);

    if (targetExists && entry.commitId === cacheCommitId && !force) {
      result.success = true;
      result.message = "已是最新版本，无需同步";
      return result;
    }

    // 确定源路径（考虑 subdir）
    let sourcePath = repoInfo.path;
    if (entry.subdir) {
      sourcePath = path.join(repoInfo.path, entry.subdir);
      // 检查子目录是否存在
      if (!(await filesystem.exists(sourcePath))) {
        result.message = `子目录不存在: ${entry.subdir}`;
        return result;
      }
    }

    // 删除旧目录（如果存在）
    if (targetExists) {
      await filesystem.removeDir(targetAbsPath);
    }

    // 确保目标父目录存在
    const targetParentDir = path.dirname(targetAbsPath);
    await filesystem.ensureDir(targetParentDir);

    // 复制新内容（排除 .git 目录）
    await filesystem.copyDir(sourcePath, targetAbsPath, {
      exclude: [".git", ".gitreference-meta.json"],
      overwrite: true,
    });

    // 更新 loading.json 中的 commitId 和 updatedAt
    await loading.updateEntry(entry.id, {
      commitId: cacheCommitId,
    });

    result.success = true;
    result.message = `同步成功: ${entry.commitId.substring(0, 7)} → ${cacheCommitId.substring(0, 7)}`;

    return result;
  } catch (error) {
    const err = error as Error;
    result.message = `同步失败: ${err.message}`;
    return result;
  }
}

/**
 * 同步所有需要更新的条目
 * @param force 是否强制同步
 * @param projectRoot 项目根目录
 * @returns 同步结果列表
 */
export async function syncAll(
  force = false,
  projectRoot: string = process.cwd(),
): Promise<SyncResult[]> {
  const entries = await loading.getEntries();
  const results: SyncResult[] = [];

  for (const entry of entries) {
    // 获取同步状态
    const status = await getSyncStatus(entry, projectRoot);

    // 只同步需要同步的条目，或者强制同步所有
    if (status.needsSync || force) {
      if (!status.cacheExists) {
        // 缓存不存在，跳过
        results.push({
          entryId: entry.id,
          repoName: entry.repoName,
          success: false,
          message: `缓存仓库不存在: ${entry.repoName}`,
          oldCommitId: entry.commitId,
        });
        continue;
      }

      const result = await syncEntry(entry, force, projectRoot);
      results.push(result);
    } else {
      // 不需要同步
      results.push({
        entryId: entry.id,
        repoName: entry.repoName,
        success: true,
        message: "已是最新版本",
        oldCommitId: entry.commitId,
        newCommitId: entry.commitId,
      });
    }
  }

  return results;
}
