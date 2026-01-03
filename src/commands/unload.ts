/**
 * unload 命令
 * 从当前项目中移除已加载的参考代码（use 命令的逆操作）
 */

import { Command } from "commander";
import chalk from "chalk";
import path from "path";
import { select } from "@inquirer/prompts";
import * as filesystem from "../core/filesystem.js";
import * as loading from "../core/loading.js";
import { LoadingEntry } from "../types/index.js";
import { startSpinner } from "../ui/spinner.js";
import { confirm } from "../ui/prompt.js";
import { padEnd } from "../ui/table.js";
import { handleError } from "../utils/error.js";
import { DIR_NAMES } from "../utils/constants.js";

/**
 * 注册 unload 命令
 * @param program Commander 程序实例
 */
export function registerUnloadCommand(program: Command): void {
  program.addCommand(unloadCommand);
}

/** .gitreference 目录名（使用共享常量） */
const GITREFERENCE_DIR = DIR_NAMES.GITREFERENCE;

/**
 * 空目录信息
 */
interface EmptyDir {
  /** 完整路径（相对于 .gitreference） */
  fullPath: string;
  /** 绝对路径 */
  absolutePath: string;
}

/**
 * 从 loading.json 获取所有已加载的仓库条目
 * @returns 加载条目列表
 */
async function getLoadedEntries(): Promise<LoadingEntry[]> {
  return await loading.getEntries();
}

/**
 * 递归扫描 .gitreference 目录以获取空目录列表
 * @param baseDir .gitreference 目录的绝对路径
 * @param currentPath 当前正在扫描的相对路径
 * @param loadedPaths 已加载路径列表（用于排除）
 * @returns 空目录列表
 */
async function scanEmptyDirs(
  baseDir: string,
  currentPath: string = "",
  loadedPaths: Set<string> = new Set(),
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
function matchEntries(entries: LoadingEntry[], name: string): LoadingEntry[] {
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
async function removeEmptyParents(
  dirPath: string,
  stopAt: string,
  verbose: boolean = false,
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
async function cleanEmptyDirectories(
  gitrefDir: string,
  emptyDirs: EmptyDir[],
  verbose: boolean = false,
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
 * 交互式仓库条目选择
 * @param matches 匹配的条目列表
 * @param name 用户输入的名称
 * @returns 用户选择的条目，如果取消则返回 null
 */
async function selectEntry(
  matches: LoadingEntry[],
  name: string,
): Promise<LoadingEntry | null> {
  console.log(
    chalk.yellow(`Found ${matches.length} reference code matching '${name}':`),
  );
  console.log();

  try {
    const selected = await select({
      message: "Select reference code to remove:",
      choices: [
        ...matches.map((match) => ({
          name: `${match.repoName} -> ${match.targetPath}`,
          value: match,
        })),
        {
          name: chalk.gray("Cancel"),
          value: null as LoadingEntry | null,
        },
      ],
    });

    return selected;
  } catch {
    // 用户按 Ctrl+C 取消
    return null;
  }
}

/**
 * 在详细模式下删除目录
 * @param dirPath 要删除的目录路径
 * @param displayPath 用于显示的路径
 * @param verbose 是否输出详细信息
 */
async function removeDirVerbose(
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
async function cleanupGitignore(
  targetPath: string,
  gitreferenceDirExists: boolean,
  verbose: boolean = false,
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

export const unloadCommand = new Command("unload")
  .description("Remove reference code from current project")
  .argument("[name]", "Repository name to remove")
  .option("-a, --all", "Remove all reference code")
  .option("-f, --force", "Skip confirmation prompt")
  .option("--dry-run", "Show what would be deleted without actually deleting")
  .option("-l, --list", "List all loaded reference code")
  .option("--keep-empty", "Keep empty .gitreference/ directory after removal")
  .option("--clean-empty", "Clean empty directory structures in .gitreference/")
  .option("-v, --verbose", "Show detailed deletion progress")
  .action(
    async (
      name: string | undefined,
      options: {
        all?: boolean;
        force?: boolean;
        dryRun?: boolean;
        list?: boolean;
        keepEmpty?: boolean;
        cleanEmpty?: boolean;
        verbose?: boolean;
      },
    ) => {
      const startTime = Date.now();

      try {
        const cwd = process.cwd();
        const gitrefDir = path.join(cwd, GITREFERENCE_DIR);

        // 获取所有已加载的条目
        const loadedEntries = await getLoadedEntries();

        // 检查 .gitreference 目录是否存在（用于空目录扫描）
        const gitrefDirExists = await filesystem.exists(gitrefDir);

        // 扫描空目录（仅当 .gitreference 目录存在时）
        const loadedPaths = new Set(loadedEntries.map((e) => e.targetPath));
        const emptyDirs = gitrefDirExists
          ? await scanEmptyDirs(gitrefDir, "", loadedPaths)
          : [];

        // 情况 0: --clean-empty 选项，清理空目录
        if (options.cleanEmpty) {
          if (emptyDirs.length === 0) {
            console.log(chalk.green("No empty directories to clean."));
            return;
          }

          console.log(
            `Found ${chalk.bold(emptyDirs.length)} empty directories:`,
          );
          for (const dir of emptyDirs) {
            console.log(`  - ${dir.fullPath.replace(/\\/g, "/")}`);
          }
          console.log();

          // dry-run 模式
          if (options.dryRun) {
            console.log(chalk.yellow("(Dry run mode, no actual deletion)"));
            return;
          }

          // 确认删除
          if (!options.force) {
            const confirmed = await confirm(
              "Are you sure you want to clean these empty directories?",
            );
            if (!confirmed) {
              console.log(chalk.yellow("Operation cancelled."));
              return;
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
                    console.log(
                      chalk.gray(`  Removing empty .gitreference directory`),
                    );
                  }
                  await filesystem.removeDir(gitrefDir);
                }
              } catch {
                // 忽略错误
              }
            }

            const elapsed = Date.now() - startTime;
            spinner.succeed(
              chalk.green(`Cleaned ${cleanedCount} empty directories!`),
            );

            if (options.verbose) {
              console.log(chalk.gray(`  Time elapsed: ${elapsed}ms`));
            }
          } catch (error) {
            spinner.fail(chalk.red("Cleanup failed"));
            throw error;
          }
          return;
        }

        // 情况 1: --list 选项，列出所有已加载的参考代码
        if (options.list) {
          if (loadedEntries.length === 0 && emptyDirs.length === 0) {
            console.log(
              chalk.yellow("No loaded reference code in current project."),
            );
            return;
          }

          if (loadedEntries.length > 0) {
            console.log(
              chalk.bold(
                `📦 Loaded reference code in current project (${loadedEntries.length})`,
              ),
            );
            console.log();

            // 表头
            const COL_NAME = 35;
            const COL_PATH = 30;
            const COL_COMMIT = 10;
            console.log(
              chalk.gray(
                "  " +
                  padEnd("REPO", COL_NAME) +
                  padEnd("PATH", COL_PATH) +
                  padEnd("COMMIT", COL_COMMIT),
              ),
            );

            // 条目列表
            for (const entry of loadedEntries) {
              const repoName = entry.repoName.replace(/\\/g, "/");
              const targetPath = entry.targetPath.replace(/\\/g, "/");
              const commitShort = entry.commitId
                ? entry.commitId.substring(0, 7)
                : "-";
              console.log(
                "  " +
                  padEnd(repoName, COL_NAME) +
                  padEnd(targetPath, COL_PATH) +
                  padEnd(commitShort, COL_COMMIT),
              );
            }

            console.log();

            // 在详细模式下显示更多信息
            if (options.verbose) {
              console.log(chalk.gray("Details:"));
              for (const entry of loadedEntries) {
                console.log(chalk.gray(`  - ${entry.repoName}`));
                console.log(chalk.gray(`    ID: ${entry.id}`));
                console.log(chalk.gray(`    URL: ${entry.repoUrl}`));
                console.log(chalk.gray(`    Path: ${entry.targetPath}`));
                console.log(chalk.gray(`    Commit: ${entry.commitId}`));
                if (entry.branch) {
                  console.log(chalk.gray(`    Branch: ${entry.branch}`));
                }
                if (entry.subdir) {
                  console.log(chalk.gray(`    Subdir: ${entry.subdir}`));
                }
                console.log(chalk.gray(`    Loaded at: ${entry.loadedAt}`));
                if (entry.updatedAt) {
                  console.log(chalk.gray(`    Updated at: ${entry.updatedAt}`));
                }
              }
              console.log();
            }
          } else {
            console.log(
              chalk.yellow("No loaded reference code in current project."),
            );
            console.log();
          }

          // 显示空目录提示
          if (emptyDirs.length > 0) {
            console.log(
              chalk.yellow(
                `⚠️  Found ${emptyDirs.length} empty directory structures`,
              ),
            );
            if (options.verbose) {
              for (const dir of emptyDirs) {
                console.log(
                  chalk.gray(`    - ${dir.fullPath.replace(/\\/g, "/")}`),
                );
              }
            }
            console.log(
              chalk.gray(
                `   Use 'grf unload --clean-empty' to clean empty directories`,
              ),
            );
            console.log();
          }

          if (loadedEntries.length > 0) {
            console.log(
              chalk.gray(
                `💡 Use 'grf unload <name>' to remove specific reference code`,
              ),
            );
          }
          return;
        }

        // 情况 2: --all 选项，删除所有参考代码
        if (options.all) {
          // 如果没有已加载的条目
          if (loadedEntries.length === 0) {
            console.log(chalk.yellow("No reference code found to delete."));
            console.log();
            console.log(
              chalk.gray(
                "💡 Hint: No loaded reference code recorded in loading.json.",
              ),
            );
            return;
          }

          // 收集所有要删除的路径
          interface PathToDelete {
            entry: LoadingEntry;
            absolutePath: string;
            exists: boolean;
          }
          const pathsToDelete: PathToDelete[] = [];

          for (const entry of loadedEntries) {
            const absolutePath = path.resolve(cwd, entry.targetPath);
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
            const status = pathInfo.exists
              ? ""
              : chalk.gray(" (path does not exist)");
            console.log(
              `  - ${pathInfo.entry.repoName} -> ${pathInfo.entry.targetPath}${status}`,
            );
          }
          console.log();

          // dry-run 模式
          if (options.dryRun) {
            console.log(chalk.yellow("(Dry run mode, no actual deletion)"));
            return;
          }

          // 确认删除
          if (!options.force) {
            const confirmed = await confirm("Are you sure you want to delete?");
            if (!confirmed) {
              console.log(chalk.yellow("Operation cancelled."));
              return;
            }
          }

          // 执行删除
          const spinner = startSpinner("Removing reference code...");

          try {
            let deletedCount = 0;

            for (const pathInfo of pathsToDelete) {
              if (options.verbose) {
                spinner.stop();
                console.log(
                  chalk.gray(`  Removing: ${pathInfo.entry.targetPath}`),
                );
                spinner.start();
              }

              // 删除实际文件/目录（如果存在）
              if (pathInfo.exists) {
                await filesystem.removeDir(pathInfo.absolutePath);

                // 递归删除空的父目录
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
                    gitrefDir,
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
                    cwd,
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
                    console.log(
                      chalk.gray(`  Removing .gitreference directory`),
                    );
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
            spinner.succeed(
              chalk.green(`Deleted ${deletedCount} reference code!`),
            );

            if (options.verbose) {
              console.log(chalk.gray(`  Time elapsed: ${elapsed}ms`));
            }
          } catch (error) {
            spinner.fail(chalk.red("Deletion failed"));
            throw error;
          }
          return;
        }

        // 情况 3: 指定了仓库名称，删除特定参考代码
        if (name) {
          // 匹配条目
          const matches = matchEntries(loadedEntries, name);

          if (matches.length === 0) {
            console.error(
              chalk.red(
                `${chalk.bold("✗")} No matching reference code found: ${name}`,
              ),
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
                chalk.red(
                  `${chalk.bold("✗")} Found multiple matching reference code:`,
                ),
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
              return;
            }
            targetEntry = selected;
            console.log();
          } else {
            targetEntry = matches[0];
          }

          const displayName = targetEntry.repoName.replace(/\\/g, "/");
          const displayPath = targetEntry.targetPath.replace(/\\/g, "/");
          const absolutePath = path.resolve(cwd, targetEntry.targetPath);
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
            return;
          }

          // 确认删除
          if (!options.force) {
            const confirmed = await confirm(
              `Are you sure you want to delete '${displayName}'?`,
            );
            if (!confirmed) {
              console.log(chalk.yellow("Operation cancelled."));
              return;
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
              if (
                targetEntry.targetPath.startsWith(".gitreference/") ||
                targetEntry.targetPath.startsWith(GITREFERENCE_DIR + "/")
              ) {
                // 在 .gitreference 下，清理到 gitrefDir 为止
                if (options.verbose) {
                  spinner.stop();
                }
                await removeEmptyParents(
                  absolutePath,
                  gitrefDir,
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
                await removeEmptyParents(absolutePath, cwd, options.verbose);
                if (options.verbose) {
                  spinner.start();
                }
              }
            }

            // 从 loading.json 中移除条目
            await loading.removeEntry(targetEntry.id);

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
              console.log(
                chalk.gray(`  Removed ${gitignoreEntry} from .gitignore`),
              );
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
          return;
        }

        // 情况 4: 未指定名称、--all 或 --list，显示用法
        console.log(chalk.yellow("No reference code specified to remove."));
        console.log();
        console.log("Usage:");
        console.log(
          `  ${chalk.cyan("grf unload <name>")}        Remove specific reference code`,
        );
        console.log(
          `  ${chalk.cyan("grf unload --all")}         Remove all reference code`,
        );
        console.log(
          `  ${chalk.cyan("grf unload --list")}        List all loaded reference code`,
        );
        console.log(
          `  ${chalk.cyan("grf unload --clean-empty")} Clean empty directory structures`,
        );
        console.log();
        console.log(
          `Use '${chalk.cyan("grf unload --list")}' to see all loaded reference code.`,
        );
      } catch (error) {
        handleError(error, { exit: true });
      }
    },
  );
