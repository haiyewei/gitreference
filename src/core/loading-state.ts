/**
 * 加载状态管理模块
 * 管理仓库的加载状态，存储到独立的 loading.json 文件中
 */

import fs from "fs-extra";
import { getLoadingStatePath, ensureGrfDirs } from "./paths.js";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 单个仓库的加载状态
 */
export interface RepoLoadingState {
  /** 加载到的目标路径 */
  targetPath: string;
  /** 加载时间 (ISO 8601) */
  loadedAt: string;
  /** 加载的分支 */
  branch?: string;
}

/**
 * 加载状态文件结构
 */
export interface LoadingStateIndex {
  loadedRepos: Record<string, RepoLoadingState>;
}

// ============================================================================
// 加载状态管理类
// ============================================================================

/**
 * 加载状态管理器
 * 提供对仓库加载状态的 CRUD 操作
 */
export class LoadingStateManager {
  private cache: LoadingStateIndex | null = null;

  /**
   * 读取加载状态文件
   * @returns 加载状态索引
   */
  private async read(): Promise<LoadingStateIndex> {
    // 如果有缓存，直接返回
    if (this.cache !== null) {
      return this.cache;
    }

    const filePath = getLoadingStatePath();

    try {
      const content = await fs.readFile(filePath, "utf-8");
      const parsed = JSON.parse(content);

      // 验证数据格式，确保 loadedRepos 字段存在
      // 兼容旧格式文件（可能包含 version 和 entries 而不是 loadedRepos）
      if (!parsed.loadedRepos || typeof parsed.loadedRepos !== "object") {
        this.cache = { loadedRepos: {} };
      } else {
        this.cache = parsed as LoadingStateIndex;
      }
      return this.cache;
    } catch (error) {
      // 文件不存在或解析失败，返回空结构
      this.cache = { loadedRepos: {} };
      return this.cache;
    }
  }

  /**
   * 写入加载状态文件
   * @param data 加载状态索引
   */
  private async write(data: LoadingStateIndex): Promise<void> {
    await ensureGrfDirs();
    const filePath = getLoadingStatePath();
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
    this.cache = data;
  }

  /**
   * 获取所有加载状态
   * @returns 所有仓库的加载状态记录
   */
  async getAll(): Promise<Record<string, RepoLoadingState>> {
    const data = await this.read();
    return data.loadedRepos;
  }

  /**
   * 获取单个仓库的加载状态
   * @param repoName 仓库名称
   * @returns 仓库的加载状态，如果不存在则返回 undefined
   */
  async get(repoName: string): Promise<RepoLoadingState | undefined> {
    const data = await this.read();
    return data.loadedRepos[repoName];
  }

  /**
   * 设置仓库的加载状态
   * @param repoName 仓库名称
   * @param state 加载状态
   */
  async set(repoName: string, state: RepoLoadingState): Promise<void> {
    const data = await this.read();
    data.loadedRepos[repoName] = state;
    await this.write(data);
  }

  /**
   * 移除仓库的加载状态
   * @param repoName 仓库名称
   * @returns 是否成功移除（如果仓库不存在则返回 false）
   */
  async remove(repoName: string): Promise<boolean> {
    const data = await this.read();
    if (!(repoName in data.loadedRepos)) {
      return false;
    }
    delete data.loadedRepos[repoName];
    await this.write(data);
    return true;
  }

  /**
   * 检查仓库是否已加载
   * @param repoName 仓库名称
   * @returns 是否已加载
   */
  async isLoaded(repoName: string): Promise<boolean> {
    const data = await this.read();
    return repoName in data.loadedRepos;
  }

  /**
   * 获取已加载的仓库数量
   * @returns 已加载的仓库数量
   */
  async count(): Promise<number> {
    const data = await this.read();
    return Object.keys(data.loadedRepos).length;
  }

  /**
   * 获取所有已加载的仓库名称
   * @returns 已加载的仓库名称列表
   */
  async names(): Promise<string[]> {
    const data = await this.read();
    return Object.keys(data.loadedRepos);
  }

  /**
   * 清空所有加载状态
   */
  async clear(): Promise<void> {
    await this.write({ loadedRepos: {} });
  }

  /**
   * 批量设置加载状态（用于迁移）
   * @param states 加载状态记录
   */
  async setAll(states: Record<string, RepoLoadingState>): Promise<void> {
    await this.write({ loadedRepos: states });
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache = null;
  }
}

// ============================================================================
// 单例实例
// ============================================================================

/**
 * 加载状态管理器单例实例
 */
export const loadingState = new LoadingStateManager();

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 获取所有加载状态
 * @returns 所有仓库的加载状态记录
 */
export async function getAllLoadingStates(): Promise<
  Record<string, RepoLoadingState>
> {
  return loadingState.getAll();
}

/**
 * 获取单个仓库的加载状态
 * @param repoName 仓库名称
 * @returns 仓库的加载状态，如果不存在则返回 undefined
 */
export async function getLoadingState(
  repoName: string,
): Promise<RepoLoadingState | undefined> {
  return loadingState.get(repoName);
}

/**
 * 标记仓库为已加载
 * @param repoName 仓库名称
 * @param targetPath 加载到的目标路径
 * @param branch 加载的分支（可选）
 */
export async function markAsLoaded(
  repoName: string,
  targetPath: string,
  branch?: string,
): Promise<void> {
  const state: RepoLoadingState = {
    targetPath,
    loadedAt: new Date().toISOString(),
  };
  if (branch !== undefined) {
    state.branch = branch;
  }
  await loadingState.set(repoName, state);
}

/**
 * 标记仓库为已卸载
 * @param repoName 仓库名称
 * @returns 是否成功移除（如果仓库不存在则返回 false）
 */
export async function markAsUnloaded(repoName: string): Promise<boolean> {
  return loadingState.remove(repoName);
}

/**
 * 检查仓库是否已加载
 * @param repoName 仓库名称
 * @returns 是否已加载
 */
export async function isRepoLoaded(repoName: string): Promise<boolean> {
  return loadingState.isLoaded(repoName);
}
