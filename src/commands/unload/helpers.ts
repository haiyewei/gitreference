/**
 * unload 命令辅助函数
 */

import path from "path";
import chalk from "chalk";
import * as filesystem from "../../core/filesystem.js";
import * as loading from "../../core/loading.js";
import { LoadingEntry } from "../../types/index.js";
import { EmptyDir } from "./types.js";
import { DIR_NAMES } from "../../utils/constants.js";

/** .gitreference 目录名（使用共享常量） */
const GITREFERENCE_DIR = DIR_NAMES.GITREFERENCE;

/**
 * 从 loading.json 获取所有已加载的仓库条目
 * @returns 加载条目列表
 */
export async function getLoadedEntries(): Promise<LoadingEntry[]> {
  return await loading.getEntries();
}

/**
 * 递归扫描 .gitreference 目录以获取空目录列表
 * @param baseDir .gitreference 目录的绝对路径
 * @param currentPath 当前正在扫描的相对路径
 * @param loadedPaths 已加载路径列表（用于排除）
 * @returns 空目录列表
 */
export async function scanEmptyDirs(
  baseDir: string,
  currentPath = "",
  loadedPaths = new Set<string>(),
): Promise<EmptyDir[]> {
  const emptyDirs: EmptyDir[] = [];
  const fullCurrentPath = path.join(baseDir, currentPath);

  try {
    const entries = await filesystem.readDir(fullCurrentPath);

    // 如果目录为空，标记为空目录
    if (entries.length === 0 && currentPath) {
      emptyDirs.push({
        fullPath: currentPath,
        absolutePath: fullCurrentPath,
      });
      return emptyDirs;
    }

    // 检查当前目录是否包含非目录文件
    let hasFiles = false;
    const subdirs: string[] = [];

    for (const entry of entries) {
      const entryPath = path.join(fullCurrentPath, entry);
      try {
        const isDir = await filesystem.isDirectory(entryPath);
        if (isDir) {
          subdirs.push(entry);
        } else {
          hasFiles = true;
        }
      } catch {
        // 忽略无法访问的条目
      }
    }

    // 如果当前目录没有文件，继续递归扫描子目录
    if (!hasFiles) {
      for (const subdir of subdirs) {
        const subPath = currentPath ? path.join(currentPath, subdir) : subdir;
        const subEmptyDirs = await scanEmptyDirs(baseDir, subPath, loadedPaths);
        emptyDirs.push(...subEmptyDirs);
      }
    }
  } catch {
    // 目录不存在或无法访问
  }

  return emptyDirs;
}

/**
 * 匹配仓库条目
 * @param entries 加载条目列表
 * @param name 要匹配的名称（可以是 repoName、targetPath 或部分路径）
 * @returns 匹配的条目列表
 */
export function matchEntries(
  entries: LoadingEntry[],
  name: string,
): LoadingEntry[] {
  const normalizedName = name.replace(/\\/g, "/");

  return entries.filter((entry) => {
    const repoName = entry.repoName.replace(/\\/g, "/");
    const targetPath = entry.targetPath.replace(/\\/g, "/");

    // 完整仓库名称匹配: github.com/facebook/react
    if (repoName === normalizedName) {
      return true;
    }

    // 完整目标路径匹配
    if (targetPath === normalizedName) {
      return true;
    }

    // 短仓库名称匹配: react -> 匹配所有名为 react 的仓库
    const shortName = path.basename(repoName);
    if (shortName === normalizedName) {
      return true;
    }

    // 部分路径匹配: facebook/react -> 匹配 */facebook/react
    if (repoName.endsWith("/" + normalizedName)) {
      return true;
    }

    // 目标路径部分匹配
    if (targetPath.endsWith("/" + normalizedName)) {
      return true;
    }

    return false;
  });
}

/**
 * 递归删除空的父目录
 * @param dirPath 起始目录路径
 * @param stopAt 停止的目录（不会删除此目录）
 * @param verbose 是否输出详细信息
 */
export async function removeEmptyParents(
  dirPath: string,
  stopAt: string,
  verbose = false,
): Promise<void> {
  let currentDir = path.dirname(dirPath);

  while (currentDir !== stopAt && currentDir.startsWith(stopAt)) {
    try {
      const entries = await filesystem.readDir(currentDir);
      if (entries.length === 0) {
        if (verbose) {
          console.log(
            chalk.gray(
              `  Cleaning empty directory: ${path.relative(stopAt, currentDir)}`,
            ),
          );
        }
        await filesystem.removeDir(currentDir);
        currentDir = path.dirname(currentDir);
      } else {
        break;
      }
    } catch {
      break;
    }
  }
}

/**
 * 清理所有空目录
 * @param gitrefDir .gitreference 目录的绝对路径
 * @param emptyDirs 空目录列表
 * @param verbose 是否输出详细信息
 * @returns 清理的目录数量
 */
export async function cleanEmptyDirectories(
  gitrefDir: string,
  emptyDirs: EmptyDir[],
  verbose = false,
): Promise<number> {
  let cleanedCount = 0;

  // 按路径深度排序，先删除最深的目录
  const sortedDirs = [...emptyDirs].sort((a, b) => {
    const depthA = a.fullPath.split(path.sep).length;
    const depthB = b.fullPath.split(path.sep).length;
    return depthB - depthA;
  });

  for (const dir of sortedDirs) {
    try {
      // 检查目录是否仍然存在且为空
      if (await filesystem.exists(dir.absolutePath)) {
        const entries = await filesystem.readDir(dir.absolutePath);
        if (entries.length === 0) {
          if (verbose) {
            console.log(
              chalk.gray(
                `  Removing empty directory: ${dir.fullPath.replace(/\\/g, "/")}`,
              ),
            );
          }
          await filesystem.removeDir(dir.absolutePath);
          cleanedCount++;

          // 递归清理空的父目录
          await removeEmptyParents(dir.absolutePath, gitrefDir, verbose);
        }
      }
    } catch {
      // 忽略删除失败的目录
    }
  }

  return cleanedCount;
}

/**
 * 在详细模式下删除目录
 * @param dirPath 要删除的目录路径
 * @param displayPath 用于显示的路径
 * @param verbose 是否输出详细信息
 */
export async function removeDirVerbose(
  dirPath: string,
  displayPath: string,
  verbose: boolean,
): Promise<void> {
  if (verbose) {
    console.log(chalk.gray(`  Removing directory: ${displayPath}`));
  }
  await filesystem.removeDir(dirPath);
}

/**
 * 从 .gitignore 中清理参考代码路径条目
 * @param targetPath 已删除的目标路径（相对于工作目录）
 * @param gitreferenceDirExists .gitreference 目录是否仍然存在
 * @param verbose 是否输出详细信息
 */
export async function cleanupGitignore(
  targetPath: string,
  gitreferenceDirExists: boolean,
  verbose = false,
): Promise<void> {
  const cwd = process.cwd();

  // 如果删除的是 .gitreference 目录下的内容
  if (
    targetPath.startsWith(".gitreference") ||
    targetPath.startsWith(GITREFERENCE_DIR)
  ) {
    // 只有当目录不存在或为空时才从 .gitignore 中移除 .gitreference/ 条目
    if (!gitreferenceDirExists) {
      const removed = await filesystem.removeFromGitignore(
        cwd,
        ".gitreference/",
      );
      if (removed && verbose) {
        console.log(chalk.gray("  Removed .gitreference/ from .gitignore"));
      }
    }
  } else {
    // 如果是自定义路径，直接移除对应的 .gitignore 条目
    const gitignoreEntry = targetPath.endsWith("/")
      ? targetPath
      : targetPath + "/";
    const removed = await filesystem.removeFromGitignore(cwd, gitignoreEntry);
    if (removed && verbose) {
      console.log(chalk.gray(`  Removed ${gitignoreEntry} from .gitignore`));
    }
  }
}
