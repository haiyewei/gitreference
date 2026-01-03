/**
 * --all 处理逻辑
 */

import path from "path";
import chalk from "chalk";
import * as filesystem from "../../../core/filesystem.js";
import * as loading from "../../../core/loading.js";
import { startSpinner } from "../../../ui/spinner.js";
import { confirm } from "../../../ui/prompt.js";
import { UnloadContext, PathToDelete } from "../types.js";
import { removeEmptyParents } from "../helpers.js";
import { DIR_NAMES } from "../../../utils/constants.js";

/** .gitreference 目录名（使用共享常量） */
const GITREFERENCE_DIR = DIR_NAMES.GITREFERENCE;

/**
 * 处理 --all 选项
 * @param context unload 命令上下文
 * @returns 是否已处理（true 表示命令应该结束）
 */
export async function handleRemoveAll(
  context: UnloadContext,
): Promise<boolean> {
  const { cwd, gitrefDir, gitrefDirExists, loadedEntries, options, startTime } =
    context;

  if (!options.all) {
    return false;
  }

  // 如果没有已加载的条目
  if (loadedEntries.length === 0) {
    console.log(chalk.yellow("No reference code found to delete."));
    console.log();
    console.log(
      chalk.gray("💡 Hint: No loaded reference code recorded in loading.json."),
    );
    return true;
  }

  // 收集所有要删除的路径
  const pathsToDelete: PathToDelete[] = [];

  for (const entry of loadedEntries) {
    // 优先使用 workingDirectory，如果不存在则回退到 cwd
    const baseDir = entry.workingDirectory || cwd;
    const absolutePath = path.resolve(baseDir, entry.targetPath);
    const exists = await filesystem.exists(absolutePath);
    pathsToDelete.push({
      entry,
      absolutePath,
      exists,
    });
  }

  // 显示将要删除的内容
  console.log(
    `Will delete ${chalk.bold(loadedEntries.length)} reference code:`,
  );
  for (const pathInfo of pathsToDelete) {
    const status = pathInfo.exists ? "" : chalk.gray(" (path does not exist)");
    console.log(
      `  - ${pathInfo.entry.repoName} -> ${pathInfo.entry.targetPath}${status}`,
    );
  }
  console.log();

  // dry-run 模式
  if (options.dryRun) {
    console.log(chalk.yellow("(Dry run mode, no actual deletion)"));
    return true;
  }

  // 确认删除
  if (!options.force) {
    const confirmed = await confirm("Are you sure you want to delete?");
    if (!confirmed) {
      console.log(chalk.yellow("Operation cancelled."));
      return true;
    }
  }

  // 执行删除
  const spinner = startSpinner("Removing reference code...");

  try {
    let deletedCount = 0;

    for (const pathInfo of pathsToDelete) {
      if (options.verbose) {
        spinner.stop();
        console.log(chalk.gray(`  Removing: ${pathInfo.entry.targetPath}`));
        spinner.start();
      }

      // 删除实际文件/目录（如果存在）
      if (pathInfo.exists) {
        await filesystem.removeDir(pathInfo.absolutePath);

        // 递归删除空的父目录
        // 使用 entry 的 workingDirectory 计算正确的 gitrefDir
        const entryBaseDir = pathInfo.entry.workingDirectory || cwd;
        const entryGitrefDir = path.join(entryBaseDir, ".gitreference");
        if (
          pathInfo.entry.targetPath.startsWith(".gitreference/") ||
          pathInfo.entry.targetPath.startsWith(GITREFERENCE_DIR + "/")
        ) {
          // 在 .gitreference 下，清理到 gitrefDir 为止
          if (options.verbose) {
            spinner.stop();
          }
          await removeEmptyParents(
            pathInfo.absolutePath,
            entryGitrefDir,
            options.verbose,
          );
          if (options.verbose) {
            spinner.start();
          }
        } else {
          // 自定义路径，清理到工作目录为止
          if (options.verbose) {
            spinner.stop();
          }
          await removeEmptyParents(
            pathInfo.absolutePath,
            entryBaseDir,
            options.verbose,
          );
          if (options.verbose) {
            spinner.start();
          }
        }
      }

      // 从 .gitignore 中清理对应条目
      const gitignoreEntry = pathInfo.entry.targetPath.endsWith("/")
        ? pathInfo.entry.targetPath
        : pathInfo.entry.targetPath + "/";
      await filesystem.removeFromGitignore(cwd, gitignoreEntry);

      deletedCount++;
    }

    // 清空 loading.json
    await loading.clearAllEntries();

    // 检查 .gitreference 目录是否为空
    if (!options.keepEmpty && gitrefDirExists) {
      try {
        const remaining = await filesystem.readDir(gitrefDir);
        // 当只剩 loading.json 或为空时删除整个目录
        if (
          remaining.length === 0 ||
          (remaining.length === 1 && remaining[0] === "loading.json")
        ) {
          if (options.verbose) {
            spinner.stop();
            console.log(chalk.gray(`  Removing .gitreference directory`));
            spinner.start();
          }
          await filesystem.removeDir(gitrefDir);
          // 从 .gitignore 中移除 .gitreference/ 条目
          await filesystem.removeFromGitignore(cwd, ".gitreference/");
        }
      } catch {
        // 忽略错误
      }
    }

    const elapsed = Date.now() - startTime;
    spinner.succeed(chalk.green(`Deleted ${deletedCount} reference code!`));

    if (options.verbose) {
      console.log(chalk.gray(`  Time elapsed: ${elapsed}ms`));
    }
  } catch (error) {
    spinner.fail(chalk.red("Deletion failed"));
    throw error;
  }

  return true;
}
