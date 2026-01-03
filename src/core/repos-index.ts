/**
 * grf 仓库索引管理模块
 * 管理仓库列表，存储在独立的 repos.json 文件中
 */

import fs from "fs-extra";
import { getReposIndexPath, ensureGrfDirs } from "./paths";
import { RepoEntry } from "../types";

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 仓库配置类型（RepoEntry 的别名）
 * 用于保持 API 一致性
 */
export type RepoConfig = RepoEntry;

/**
 * 仓库索引文件结构
 */
export interface ReposIndex {
  repos: Record<string, RepoConfig>;
}

// ============================================================================
// 仓库索引管理类
// ============================================================================

/**
 * 仓库索引管理器
 * 管理 repos.json 文件中的仓库列表
 */
export class ReposIndexManager {
  private cache: ReposIndex | null = null;

  /**
   * 读取仓库索引文件
   * 如果文件不存在，返回空的仓库索引
   * @returns 仓库索引对象
   */
  private async read(): Promise<ReposIndex> {
    // 如果有缓存，直接返回
    if (this.cache !== null) {
      return this.cache;
    }

    try {
      const filePath = getReposIndexPath();
      const fileExists = await fs.pathExists(filePath);

      if (!fileExists) {
        // 文件不存在，返回空索引
        const emptyIndex: ReposIndex = { repos: {} };
        this.cache = emptyIndex;
        return emptyIndex;
      }

      // 读取并解析文件
      const content = (await fs.readJson(filePath)) as ReposIndex;

      // 确保 repos 字段存在
      if (!content.repos) {
        content.repos = {};
      }

      // 更新缓存
      this.cache = content;

      return content;
    } catch {
      // 文件读取或解析失败，返回空索引
      const emptyIndex: ReposIndex = { repos: {} };
      this.cache = emptyIndex;
      return emptyIndex;
    }
  }

  /**
   * 写入仓库索引文件
   * @param index 要写入的仓库索引
   */
  private async write(index: ReposIndex): Promise<void> {
    // 确保目录存在
    await ensureGrfDirs();

    const filePath = getReposIndexPath();

    // 写入文件
    await fs.writeJson(filePath, index, { spaces: 2 });

    // 更新缓存
    this.cache = index;
  }

  /**
   * 获取所有仓库
   * @returns 仓库名称到配置的映射
   */
  async getAll(): Promise<Record<string, RepoConfig>> {
    const index = await this.read();
    return index.repos;
  }

  /**
   * 获取单个仓库
   * @param name 仓库名称
   * @returns 仓库配置，如果不存在则返回 undefined
   */
  async get(name: string): Promise<RepoConfig | undefined> {
    const index = await this.read();
    return index.repos[name];
  }

  /**
   * 添加或更新仓库
   * @param name 仓库名称
   * @param config 仓库配置
   */
  async set(name: string, config: RepoConfig): Promise<void> {
    const index = await this.read();
    index.repos[name] = config;
    await this.write(index);
  }

  /**
   * 删除仓库
   * @param name 仓库名称
   * @returns 是否成功删除（仓库存在则返回 true）
   */
  async remove(name: string): Promise<boolean> {
    const index = await this.read();

    if (!(name in index.repos)) {
      return false;
    }

    delete index.repos[name];
    await this.write(index);
    return true;
  }

  /**
   * 检查仓库是否存在
   * @param name 仓库名称
   * @returns 仓库是否存在
   */
  async has(name: string): Promise<boolean> {
    const index = await this.read();
    return name in index.repos;
  }

  /**
   * 获取仓库数量
   * @returns 仓库数量
   */
  async count(): Promise<number> {
    const index = await this.read();
    return Object.keys(index.repos).length;
  }

  /**
   * 获取所有仓库名称
   * @returns 仓库名称数组
   */
  async names(): Promise<string[]> {
    const index = await this.read();
    return Object.keys(index.repos);
  }

  /**
   * 清空所有仓库
   */
  async clear(): Promise<void> {
    const emptyIndex: ReposIndex = { repos: {} };
    await this.write(emptyIndex);
  }

  /**
   * 批量设置仓库（用于迁移）
   * @param repos 仓库名称到配置的映射
   */
  async setAll(repos: Record<string, RepoConfig>): Promise<void> {
    const index: ReposIndex = { repos };
    await this.write(index);
  }

  /**
   * 清除缓存
   * 下次调用读取方法时会重新从文件读取
   */
  clearCache(): void {
    this.cache = null;
  }
}

// ============================================================================
// 单例实例
// ============================================================================

/** 仓库索引管理器单例 */
export const reposIndex = new ReposIndexManager();

// ============================================================================
// 便捷函数（保持与旧 API 兼容）
// ============================================================================

/**
 * 获取所有仓库配置
 * @returns 仓库名称到配置的映射
 */
export async function getAllRepos(): Promise<Record<string, RepoConfig>> {
  return reposIndex.getAll();
}

/**
 * 获取单个仓库配置
 * @param name 仓库名称
 * @returns 仓库配置，如果不存在则返回 undefined
 */
export async function getRepo(name: string): Promise<RepoConfig | undefined> {
  return reposIndex.get(name);
}

/**
 * 保存仓库配置
 * @param name 仓库名称
 * @param config 仓库配置
 */
export async function saveRepo(
  name: string,
  config: RepoConfig,
): Promise<void> {
  return reposIndex.set(name, config);
}

/**
 * 删除仓库配置
 * @param name 仓库名称
 * @returns 是否成功删除
 */
export async function removeRepo(name: string): Promise<boolean> {
  return reposIndex.remove(name);
}
