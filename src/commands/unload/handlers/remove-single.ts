/**
 * 删除单个仓库逻辑
 */

import path from "path";
import chalk from "chalk";
import * as filesystem from "../../../core/filesystem.js";
import * as loading from "../../../core/loading.js";
import { markAsUnloaded } from "../../../core/loading-state.js";
import { LoadingEntry } from "../../../types/index.js";
import { startSpinner } from "../../../ui/spinner.js";
import { confirm } from "../../../ui/prompt.js";
import { UnloadContext } from "../types.js";
import { matchEntries, removeEmptyParents } from "../helpers.js";
import { selectEntry } from "../display.js";
import { DIR_NAMES } from "../../../utils/constants.js";

/** .gitreference 目录名（使用共享常量） */
const GITREFERENCE_DIR = DIR_NAMES.GITREFERENCE;

/**
 * 处理删除单个仓库
 * @param context unload 命令上下文
 * @param name 仓库名称
 * @returns 是否已处理（true 表示命令应该结束）
 */
export async function handleRemoveSingle(
  context: UnloadContext,
  name: string,
): Promise<boolean> {
  const { cwd, gitrefDir, gitrefDirExists, loadedEntries, options, startTime } =
    context;

  // 匹配条目
  const matches = matchEntries(loadedEntries, name);

  if (matches.length === 0) {
    console.error(
      chalk.red(`${chalk.bold("✗")} No matching reference code found: ${name}`),
    );
    console.log();
    console.log(
      `Use '${chalk.cyan("grf unload --list")}' to see all loaded reference code.`,
    );
    process.exit(1);
  }

  let targetEntry: LoadingEntry;

  if (matches.length > 1) {
    // 如果使用了 --force 选项，仍然需要精确指定
    if (options.force) {
      console.error(
        chalk.red(`${chalk.bold("✗")} Found multiple matching reference code:`),
      );
      console.log();
      for (const match of matches) {
        console.log(`  - ${match.repoName} -> ${match.targetPath}`);
      }
      console.log();
      console.log(
        `Please use full path to specify exactly which reference code to delete.`,
      );
      process.exit(1);
    }

    // 交互式选择
    const selected = await selectEntry(matches, name);
    if (!selected) {
      console.log(chalk.yellow("Operation cancelled."));
      return true;
    }
    targetEntry = selected;
    console.log();
  } else {
    targetEntry = matches[0];
  }

  const displayName = targetEntry.repoName.replace(/\\/g, "/");
  const displayPath = targetEntry.targetPath.replace(/\\/g, "/");
  // 优先使用 workingDirectory，如果不存在则回退到 cwd
  const baseDir = targetEntry.workingDirectory || cwd;
  const absolutePath = path.resolve(baseDir, targetEntry.targetPath);
  const pathExists = await filesystem.exists(absolutePath);

  // 显示将要删除的内容
  console.log(`Will delete: ${chalk.cyan(displayName)}`);
  console.log(`  Target path: ${chalk.gray(displayPath)}`);
  if (!pathExists) {
    console.log(
      chalk.yellow(
        `  (Note: Target path does not exist, will only remove record from loading.json)`,
      ),
    );
  }
  if (options.verbose) {
    console.log(`  Absolute path: ${chalk.gray(absolutePath)}`);
    console.log(`  Commit: ${chalk.gray(targetEntry.commitId)}`);
    if (targetEntry.branch) {
      console.log(`  Branch: ${chalk.gray(targetEntry.branch)}`);
    }
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
      `Are you sure you want to delete '${displayName}'?`,
    );
    if (!confirmed) {
      console.log(chalk.yellow("Operation cancelled."));
      return true;
    }
  }

  // 执行删除
  const spinner = startSpinner("Removing reference code...");

  try {
    // 删除实际文件/目录（如果存在）
    if (pathExists) {
      if (options.verbose) {
        spinner.stop();
        console.log(chalk.gray(`  Removing directory: ${displayPath}`));
        spinner.start();
      }

      await filesystem.removeDir(absolutePath);

      // 递归删除空的父目录
      // 使用 baseDir 计算正确的 gitrefDir
      const entryGitrefDir = path.join(baseDir, ".gitreference");
      if (
        targetEntry.targetPath.startsWith(".gitreference/") ||
        targetEntry.targetPath.startsWith(GITREFERENCE_DIR + "/")
      ) {
        // 在 .gitreference 下，清理到 gitrefDir 为止
        if (options.verbose) {
          spinner.stop();
        }
        await removeEmptyParents(absolutePath, entryGitrefDir, options.verbose);
        if (options.verbose) {
          spinner.start();
        }
      } else {
        // 自定义路径，清理到工作目录为止
        if (options.verbose) {
          spinner.stop();
        }
        await removeEmptyParents(absolutePath, cwd, options.verbose);
        if (options.verbose) {
          spinner.start();
        }
      }
    }

    // 从 loading.json 中移除条目（使用 workingDirectory + targetPath 作为唯一键）
    await markAsUnloaded(
      targetEntry.workingDirectory || cwd,
      targetEntry.targetPath,
    );

    // 从 .gitignore 中清理对应条目
    const gitignoreEntry = targetEntry.targetPath.endsWith("/")
      ? targetEntry.targetPath
      : targetEntry.targetPath + "/";
    const gitignoreRemoved = await filesystem.removeFromGitignore(
      cwd,
      gitignoreEntry,
    );
    if (gitignoreRemoved && options.verbose) {
      spinner.stop();
      console.log(chalk.gray(`  Removed ${gitignoreEntry} from .gitignore`));
      spinner.start();
    }

    // 检查 .gitreference 目录是否为空
    if (!options.keepEmpty && gitrefDirExists) {
      try {
        const remaining = await filesystem.readDir(gitrefDir);
        // 当只剩 loading.json 或为空时删除整个目录
        if (
          remaining.length === 0 ||
          (remaining.length === 1 && remaining[0] === "loading.json")
        ) {
          // 检查 loading.json 是否还有其他条目
          const remainingEntries = await loading.getEntries();
          if (remainingEntries.length === 0) {
            if (options.verbose) {
              spinner.stop();
              console.log(
                chalk.gray(`  Removing empty .gitreference directory`),
              );
              spinner.start();
            }
            await filesystem.removeDir(gitrefDir);
            // 从 .gitignore 中移除 .gitreference/ 条目
            await filesystem.removeFromGitignore(cwd, ".gitreference/");
          }
        }
      } catch {
        // 忽略错误
      }
    }

    const elapsed = Date.now() - startTime;
    spinner.succeed(chalk.green("Reference code removed!"));
    console.log();
    console.log(`  ${chalk.gray("Repository:")}   ${displayName}`);
    console.log(`  ${chalk.gray("Path:")}   ${displayPath}`);

    if (options.verbose) {
      console.log(chalk.gray(`  Time elapsed: ${elapsed}ms`));
    }
  } catch (error) {
    spinner.fail(chalk.red("Deletion failed"));
    throw error;
  }

  return true;
}
