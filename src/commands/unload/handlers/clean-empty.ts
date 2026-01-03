/**
 * --clean-empty 处理逻辑
 */

import chalk from "chalk";
import * as filesystem from "../../../core/filesystem.js";
import { startSpinner } from "../../../ui/spinner.js";
import { confirm } from "../../../ui/prompt.js";
import { UnloadContext } from "../types.js";
import { cleanEmptyDirectories } from "../helpers.js";

/**
 * 处理 --clean-empty 选项
 * @param context unload 命令上下文
 * @returns 是否已处理（true 表示命令应该结束）
 */
export async function handleCleanEmpty(
  context: UnloadContext,
): Promise<boolean> {
  const { gitrefDir, emptyDirs, options, startTime } = context;

  if (!options.cleanEmpty) {
    return false;
  }

  if (emptyDirs.length === 0) {
    console.log(chalk.green("No empty directories to clean."));
    return true;
  }

  console.log(`Found ${chalk.bold(emptyDirs.length)} empty directories:`);
  for (const dir of emptyDirs) {
    console.log(`  - ${dir.fullPath.replace(/\\/g, "/")}`);
  }
  console.log();

  // dry-run 模式
  if (options.dryRun) {
    console.log(chalk.yellow("(Dry run mode, no actual deletion)"));
    return true;
  }

  // 确认删除
  if (!options.force) {
    const confirmed = await confirm(
      "Are you sure you want to clean these empty directories?",
    );
    if (!confirmed) {
      console.log(chalk.yellow("Operation cancelled."));
      return true;
    }
  }

  // 执行清理
  const spinner = startSpinner("Cleaning empty directories...");

  try {
    const cleanedCount = await cleanEmptyDirectories(
      gitrefDir,
      emptyDirs,
      options.verbose,
    );

    // 检查 .gitreference 目录是否为空
    if (!options.keepEmpty) {
      try {
        const remaining = await filesystem.readDir(gitrefDir);
        if (remaining.length === 0) {
          if (options.verbose) {
            console.log(chalk.gray(`  Removing empty .gitreference directory`));
          }
          await filesystem.removeDir(gitrefDir);
        }
      } catch {
        // 忽略错误
      }
    }

    const elapsed = Date.now() - startTime;
    spinner.succeed(chalk.green(`Cleaned ${cleanedCount} empty directories!`));

    if (options.verbose) {
      console.log(chalk.gray(`  Time elapsed: ${elapsed}ms`));
    }
  } catch (error) {
    spinner.fail(chalk.red("Cleanup failed"));
    throw error;
  }

  return true;
}
