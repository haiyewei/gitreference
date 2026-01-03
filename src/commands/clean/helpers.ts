/**
 * clean 命令辅助函数
 */

import * as repository from "../../core/repository.js";
import { RepoInfo } from "../../core/repository.js";

/**
 * 删除结果
 */
export interface RemoveResult {
  /** 成功删除的数量 */
  removedCount: number;
  /** 错误列表 */
  errors: string[];
}

/**
 * 删除所有仓库
 * @param repos 仓库列表
 * @returns 删除结果
 */
export async function removeAllRepos(repos: RepoInfo[]): Promise<RemoveResult> {
  let removedCount = 0;
  const errors: string[] = [];

  for (const repo of repos) {
    try {
      await repository.remove(repo.name);
      removedCount++;
    } catch (error) {
      if (error instanceof Error) {
        errors.push(`${repo.name}: ${error.message}`);
      }
    }
  }

  return { removedCount, errors };
}

/**
 * 删除单个仓库
 * @param name 仓库名称
 */
export async function removeSingleRepo(name: string): Promise<void> {
  await repository.remove(name);
}
