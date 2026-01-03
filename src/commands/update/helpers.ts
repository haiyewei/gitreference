/**
 * update 命令辅助函数
 */

import * as git from "../../core/git.js";
import { readRepoMeta, writeRepoMeta } from "../../core/config.js";
import type { RepoInfo } from "../../core/repository.js";
import { UpdateResult } from "./types.js";

/**
 * 更新单个仓库
 * @param repoInfo 仓库信息
 * @param checkOnly 是否仅检查更新
 * @returns 更新结果
 */
export async function updateRepo(
  repoInfo: RepoInfo,
  checkOnly: boolean,
): Promise<UpdateResult> {
  const repoPath = repoInfo.path;
  const oldCommit = repoInfo.commitId;

  try {
    // 检查更新
    const hasUpdates = await git.hasUpdates(repoPath);

    if (!hasUpdates) {
      return { name: repoInfo.name, status: "up-to-date" };
    }

    if (checkOnly) {
      return { name: repoInfo.name, status: "has-updates" };
    }

    // 执行更新
    await git.pull(repoPath);

    // 更新元信息
    const newCommit = await git.getCurrentCommit(repoPath);
    const meta = await readRepoMeta(repoPath);
    if (meta) {
      meta.commitId = newCommit;
      meta.updatedAt = new Date().toISOString();
      await writeRepoMeta(repoPath, meta);
    }

    return {
      name: repoInfo.name,
      status: "updated",
      oldCommit,
      newCommit,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      name: repoInfo.name,
      status: "error",
      error: errorMessage,
    };
  }
}
