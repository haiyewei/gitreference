/**
 * load 命令辅助函数
 */

import path from "path";
import * as repository from "../../core/repository.js";
import * as filesystem from "../../core/filesystem.js";
import * as loading from "../../core/loading.js";
import type { RepoInfo } from "../../core/repository.js";
import type { LoadContext } from "./types.js";

/**
 * 解析 Git URL 获取完整仓库名称
 * @param url Git URL
 * @returns 完整仓库名称 (host/owner/repo)
 */
export function parseGitUrlToFullName(url: string): string {
  const parsed = repository.parseRepoUrl(url);
  return `${parsed.host}/${parsed.owner}/${parsed.repo}`;
}

/**
 * 检查仓库是否存在
 * @param repoName 仓库名称
 * @returns 是否存在
 */
export async function checkRepoExists(repoName: string): Promise<boolean> {
  return await repository.exists(repoName);
}

/**
 * 添加仓库
 * @param url Git URL
 * @param branch 分支名称
 * @returns 仓库信息
 */
export async function addRepository(
  url: string,
  branch?: string,
): Promise<RepoInfo> {
  return await repository.add(url, {
    branch,
    shallow: true,
    depth: 1,
  });
}

/**
 * 获取仓库信息
 * @param repoName 仓库名称
 * @returns 仓库信息或 null
 */
export async function getRepoInfo(repoName: string): Promise<RepoInfo | null> {
  return await repository.get(repoName);
}

/**
 * 切换仓库分支
 * @param repoName 仓库名称
 * @param branch 目标分支
 * @returns 更新后的仓库信息
 */
export async function switchRepoBranch(
  repoName: string,
  branch: string,
): Promise<RepoInfo> {
  return await repository.switchBranch(repoName, branch);
}

/**
 * 解析仓库缓存路径
 * @param repoName 仓库名称
 * @returns 仓库缓存路径
 */
export async function resolveRepoPath(repoName: string): Promise<string> {
  return await repository.resolvePath(repoName);
}

/**
 * 确定源路径（考虑 subdir 选项）
 * @param repoPath 仓库缓存路径
 * @param subdir 子目录
 * @returns 源路径
 */
export function determineSourcePath(repoPath: string, subdir?: string): string {
  return subdir ? path.join(repoPath, subdir) : repoPath;
}

/**
 * 检查路径是否存在
 * @param pathToCheck 要检查的路径
 * @returns 是否存在
 */
export async function pathExists(pathToCheck: string): Promise<boolean> {
  return await filesystem.exists(pathToCheck);
}

/**
 * 确定最终目标路径
 * @param targetPath 用户指定的目标路径
 * @param repoName 仓库名称
 * @returns 最终目标路径（绝对路径）
 */
export function determineFinalTargetPath(
  targetPath: string | undefined,
  repoName: string,
): string {
  return targetPath
    ? path.resolve(process.cwd(), targetPath)
    : path.join(process.cwd(), ".gitreference", repoName);
}

/**
 * 复制仓库文件到目标路径
 * @param sourcePath 源路径
 * @param targetPath 目标路径
 */
export async function copyRepoFiles(
  sourcePath: string,
  targetPath: string,
): Promise<void> {
  // 确保目标目录的父目录存在
  await filesystem.ensureDir(path.dirname(targetPath));

  // 复制文件（排除 .git 和 meta.json）
  await filesystem.copyDir(sourcePath, targetPath, {
    exclude: [".git", "meta.json", ".grf-meta.json", ".gitreference-meta.json"],
    overwrite: true,
  });
}

/**
 * 更新 .gitignore 文件
 * @param targetPath 用户指定的目标路径
 * @param finalTargetPath 最终目标路径
 */
export async function updateGitignoreEntries(
  targetPath: string | undefined,
  finalTargetPath: string,
): Promise<void> {
  // 始终添加 .gitreference/ 条目（默认行为）
  await filesystem.updateGitignore(process.cwd(), ".gitreference/");

  // 如果用户指定了自定义路径，额外添加该路径
  if (targetPath) {
    // 计算相对于工作目录的路径
    const relativePath = path.relative(process.cwd(), finalTargetPath);
    // 确保路径使用正斜杠（跨平台兼容）并以 / 结尾（表示目录）
    const normalizedPath = relativePath.replace(/\\/g, "/");
    const gitignoreEntry = normalizedPath.endsWith("/")
      ? normalizedPath
      : normalizedPath + "/";

    // 避免重复添加（如果自定义路径在 .gitreference/ 下则跳过）
    if (!gitignoreEntry.startsWith(".gitreference/")) {
      await filesystem.updateGitignore(process.cwd(), gitignoreEntry);
    }
  }
}

/**
 * 记录加载信息到 loading.json
 * @param context 加载上下文
 */
export async function recordLoadingEntry(context: LoadContext): Promise<void> {
  if (!context.repoInfo || !context.finalTargetPath) {
    throw new Error("Missing required context for recording loading entry");
  }

  const relativeTargetPath = path
    .relative(process.cwd(), context.finalTargetPath)
    .replace(/\\/g, "/");

  await loading.addEntry({
    repoName: context.repoInfo.name,
    repoUrl: context.repoInfo.url,
    commitId: context.repoInfo.commitId,
    branch: context.repoInfo.branch,
    subdir: context.options.subdir,
    targetPath: relativeTargetPath,
    workingDirectory: process.cwd(),
  });
}
