/**
 * unload 命令
 * 移除当前项目中已加载的参考代码（use 命令的逆操作）
 */

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import path from "path";
import * as readline from "readline";
import { select } from "@inquirer/prompts";
import * as filesystem from "../core/filesystem.js";
import * as loading from "../core/loading.js";
import { GrfError, ErrorCode, LoadingEntry } from "../types/index.js";

/** .gitreference 目录名 */
const GITREFERENCE_DIR = ".gitreference";

/**
 * 从 loading.json 获取所有已加载仓库的目标路径
 * @param projectRoot 项目根目录
 * @returns 由 gitreference 管理的路径列表
 */
async function getGitreferenceManagedPaths(
  projectRoot: string,
): Promise<string[]> {
  const entries = await loading.getEntries(projectRoot);
  return entries.map((entry) => entry.targetPath);
}

/**
 * 填充字符串到指定宽度
 * @param str 原始字符串
 * @param width 目标宽度
 * @returns 填充后的字符串
 */
function padEnd(str: string, width: number): string {
  if (str.length >= width) return str;
  return str + " ".repeat(width - str.length);
}

/**
 * 确认提示
 * @param message 提示消息
 * @returns 用户是否确认
 */
async function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

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
 * @param projectRoot 项目根目录
 * @returns 加载条目列表
 */
async function getLoadedEntries(projectRoot: string): Promise<LoadingEntry[]> {
  return await loading.getEntries(projectRoot);
}

/**
 * 递归扫描 .gitreference 目录，获取空目录列表
 * @param baseDir .gitreference 目录的绝对路径
 * @param currentPath 当前扫描的相对路径
 * @param loadedPaths 已加载的路径列表（用于排除）
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

    // 完整仓库名匹配: github.com/facebook/react
    if (repoName === normalizedName) {
      return true;
    }

    // 完整目标路径匹配
    if (targetPath === normalizedName) {
      return true;
    }

    // 仓库短名匹配: react -> 匹配所有名为 react 的仓库
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
 * @param stopAt 停止删除的目录（不会删除此目录）
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
            chalk.gray(`  清理空目录: ${path.relative(stopAt, currentDir)}`),
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
              chalk.gray(`  删除空目录: ${dir.fullPath.replace(/\\/g, "/")}`),
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
 * 交互式选择仓库条目
 * @param matches 匹配的条目列表
 * @param name 用户输入的名称
 * @returns 用户选择的条目，如果取消则返回 null
 */
async function selectEntry(
  matches: LoadingEntry[],
  name: string,
): Promise<LoadingEntry | null> {
  console.log(
    chalk.yellow(`找到 ${matches.length} 个匹配 '${name}' 的参考代码:`),
  );
  console.log();

  try {
    const selected = await select({
      message: "请选择要删除的参考代码:",
      choices: [
        ...matches.map((match) => ({
          name: `${match.repoName} -> ${match.targetPath}`,
          value: match,
        })),
        {
          name: chalk.gray("取消"),
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
 * 详细模式下删除目录
 * @param dirPath 要删除的目录路径
 * @param displayPath 显示用的路径
 * @param verbose 是否输出详细信息
 */
async function removeDirVerbose(
  dirPath: string,
  displayPath: string,
  verbose: boolean,
): Promise<void> {
  if (verbose) {
    console.log(chalk.gray(`  删除目录: ${displayPath}`));
  }
  await filesystem.removeDir(dirPath);
}

/**
 * 清理 .gitignore 中的参考代码路径条目
 * @param targetPath 被删除的目标路径（相对于工作目录）
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
    // 只有当 .gitreference 目录不存在或为空时，才移除 .gitignore 中的 .gitreference/ 条目
    if (!gitreferenceDirExists) {
      const removed = await filesystem.removeFromGitignore(
        cwd,
        ".gitreference/",
      );
      if (removed && verbose) {
        console.log(chalk.gray("  已从 .gitignore 中移除 .gitreference/"));
      }
    }
  } else {
    // 如果是自定义路径，直接移除对应的 .gitignore 条目
    const gitignoreEntry = targetPath.endsWith("/")
      ? targetPath
      : targetPath + "/";
    const removed = await filesystem.removeFromGitignore(cwd, gitignoreEntry);
    if (removed && verbose) {
      console.log(chalk.gray(`  已从 .gitignore 中移除 ${gitignoreEntry}`));
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
        const loadedEntries = await getLoadedEntries(cwd);

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
            console.log(chalk.green("没有需要清理的空目录。"));
            return;
          }

          console.log(`发现 ${chalk.bold(emptyDirs.length)} 个空目录:`);
          for (const dir of emptyDirs) {
            console.log(`  - ${dir.fullPath.replace(/\\/g, "/")}`);
          }
          console.log();

          // dry-run 模式
          if (options.dryRun) {
            console.log(chalk.yellow("(试运行模式，未执行实际删除)"));
            return;
          }

          // 确认删除
          if (!options.force) {
            const confirmed = await confirm("确定要清理这些空目录吗?");
            if (!confirmed) {
              console.log(chalk.yellow("操作已取消。"));
              return;
            }
          }

          // 执行清理
          const spinner = ora("正在清理空目录...").start();

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
                    console.log(chalk.gray(`  删除空的 .gitreference 目录`));
                  }
                  await filesystem.removeDir(gitrefDir);
                }
              } catch {
                // 忽略错误
              }
            }

            const elapsed = Date.now() - startTime;
            spinner.succeed(chalk.green(`已清理 ${cleanedCount} 个空目录!`));

            if (options.verbose) {
              console.log(chalk.gray(`  耗时: ${elapsed}ms`));
            }
          } catch (error) {
            spinner.fail(chalk.red("清理失败"));
            throw error;
          }
          return;
        }

        // 情况 1: --list 选项，列出所有已加载的参考代码
        if (options.list) {
          if (loadedEntries.length === 0 && emptyDirs.length === 0) {
            console.log(chalk.yellow("当前项目中没有已加载的参考代码。"));
            return;
          }

          if (loadedEntries.length > 0) {
            console.log(
              chalk.bold(
                `📦 当前项目中已加载的参考代码 (${loadedEntries.length} 个)`,
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

            // 详细模式下显示更多信息
            if (options.verbose) {
              console.log(chalk.gray("详细信息:"));
              for (const entry of loadedEntries) {
                console.log(chalk.gray(`  - ${entry.repoName}`));
                console.log(chalk.gray(`    ID: ${entry.id}`));
                console.log(chalk.gray(`    URL: ${entry.repoUrl}`));
                console.log(chalk.gray(`    路径: ${entry.targetPath}`));
                console.log(chalk.gray(`    Commit: ${entry.commitId}`));
                if (entry.branch) {
                  console.log(chalk.gray(`    分支: ${entry.branch}`));
                }
                if (entry.subdir) {
                  console.log(chalk.gray(`    子目录: ${entry.subdir}`));
                }
                console.log(chalk.gray(`    加载时间: ${entry.loadedAt}`));
                if (entry.updatedAt) {
                  console.log(chalk.gray(`    更新时间: ${entry.updatedAt}`));
                }
              }
              console.log();
            }
          } else {
            console.log(chalk.yellow("当前项目中没有已加载的参考代码。"));
            console.log();
          }

          // 显示空目录提示
          if (emptyDirs.length > 0) {
            console.log(
              chalk.yellow(`⚠️  发现 ${emptyDirs.length} 个空目录结构`),
            );
            if (options.verbose) {
              for (const dir of emptyDirs) {
                console.log(
                  chalk.gray(`    - ${dir.fullPath.replace(/\\/g, "/")}`),
                );
              }
            }
            console.log(
              chalk.gray(`   使用 'grf unload --clean-empty' 清理空目录`),
            );
            console.log();
          }

          if (loadedEntries.length > 0) {
            console.log(
              chalk.gray(`💡 使用 'grf unload <name>' 移除指定的参考代码`),
            );
          }
          return;
        }

        // 情况 2: --all 选项，删除所有参考代码
        if (options.all) {
          // 如果没有已加载的条目
          if (loadedEntries.length === 0) {
            console.log(chalk.yellow("没有找到需要删除的参考代码。"));
            console.log();
            console.log(
              chalk.gray(
                "💡 提示: loading.json 中没有记录任何已加载的参考代码。",
              ),
            );
            return;
          }

          // 收集所有需要删除的路径
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
            `将要删除 ${chalk.bold(loadedEntries.length)} 个参考代码:`,
          );
          for (const pathInfo of pathsToDelete) {
            const status = pathInfo.exists ? "" : chalk.gray(" (路径不存在)");
            console.log(
              `  - ${pathInfo.entry.repoName} -> ${pathInfo.entry.targetPath}${status}`,
            );
          }
          console.log();

          // dry-run 模式
          if (options.dryRun) {
            console.log(chalk.yellow("(试运行模式，未执行实际删除)"));
            return;
          }

          // 确认删除
          if (!options.force) {
            const confirmed = await confirm("确定要删除吗?");
            if (!confirmed) {
              console.log(chalk.yellow("操作已取消。"));
              return;
            }
          }

          // 执行删除
          const spinner = ora("正在删除参考代码...").start();

          try {
            let deletedCount = 0;

            for (const pathInfo of pathsToDelete) {
              if (options.verbose) {
                spinner.stop();
                console.log(chalk.gray(`  删除: ${pathInfo.entry.targetPath}`));
                spinner.start();
              }

              // 删除实际文件/目录（如果存在）
              if (pathInfo.exists) {
                await filesystem.removeDir(pathInfo.absolutePath);
              }

              // 清理 .gitignore 中对应的条目
              const gitignoreEntry = pathInfo.entry.targetPath.endsWith("/")
                ? pathInfo.entry.targetPath
                : pathInfo.entry.targetPath + "/";
              await filesystem.removeFromGitignore(cwd, gitignoreEntry);

              deletedCount++;
            }

            // 清空 loading.json
            await loading.clearAllEntries(cwd);

            // 检查 .gitreference 目录是否为空
            if (!options.keepEmpty && gitrefDirExists) {
              try {
                const remaining = await filesystem.readDir(gitrefDir);
                // 只剩下 loading.json 或为空时删除整个目录
                if (
                  remaining.length === 0 ||
                  (remaining.length === 1 && remaining[0] === "loading.json")
                ) {
                  if (options.verbose) {
                    spinner.stop();
                    console.log(chalk.gray(`  删除 .gitreference 目录`));
                    spinner.start();
                  }
                  await filesystem.removeDir(gitrefDir);
                  // 移除 .gitignore 中的 .gitreference/ 条目
                  await filesystem.removeFromGitignore(cwd, ".gitreference/");
                }
              } catch {
                // 忽略错误
              }
            }

            const elapsed = Date.now() - startTime;
            spinner.succeed(chalk.green(`已删除 ${deletedCount} 个参考代码!`));

            if (options.verbose) {
              console.log(chalk.gray(`  耗时: ${elapsed}ms`));
            }
          } catch (error) {
            spinner.fail(chalk.red("删除失败"));
            throw error;
          }
          return;
        }

        // 情况 3: 指定仓库名称，删除指定的参考代码
        if (name) {
          // 匹配条目
          const matches = matchEntries(loadedEntries, name);

          if (matches.length === 0) {
            console.error(
              chalk.red(`${chalk.bold("✗")} 未找到匹配的参考代码: ${name}`),
            );
            console.log();
            console.log(
              `使用 '${chalk.cyan("grf unload --list")}' 查看所有已加载的参考代码。`,
            );
            process.exit(1);
          }

          let targetEntry: LoadingEntry;

          if (matches.length > 1) {
            // 如果使用了 --force 选项，仍然报错要求精确指定
            if (options.force) {
              console.error(
                chalk.red(`${chalk.bold("✗")} 找到多个匹配的参考代码:`),
              );
              console.log();
              for (const match of matches) {
                console.log(`  - ${match.repoName} -> ${match.targetPath}`);
              }
              console.log();
              console.log(`请使用完整路径精确指定要删除的参考代码。`);
              process.exit(1);
            }

            // 交互式选择
            const selected = await selectEntry(matches, name);
            if (!selected) {
              console.log(chalk.yellow("操作已取消。"));
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
          console.log(`将要删除: ${chalk.cyan(displayName)}`);
          console.log(`  目标路径: ${chalk.gray(displayPath)}`);
          if (!pathExists) {
            console.log(
              chalk.yellow(
                `  (注意: 目标路径不存在，将仅从 loading.json 中移除记录)`,
              ),
            );
          }
          if (options.verbose) {
            console.log(`  绝对路径: ${chalk.gray(absolutePath)}`);
            console.log(`  Commit: ${chalk.gray(targetEntry.commitId)}`);
            if (targetEntry.branch) {
              console.log(`  分支: ${chalk.gray(targetEntry.branch)}`);
            }
          }
          console.log();

          // dry-run 模式
          if (options.dryRun) {
            console.log(chalk.yellow("(试运行模式，未执行实际删除)"));
            return;
          }

          // 确认删除
          if (!options.force) {
            const confirmed = await confirm(`确定要删除 '${displayName}' 吗?`);
            if (!confirmed) {
              console.log(chalk.yellow("操作已取消。"));
              return;
            }
          }

          // 执行删除
          const spinner = ora("正在删除参考代码...").start();

          try {
            // 删除实际文件/目录（如果存在）
            if (pathExists) {
              if (options.verbose) {
                spinner.stop();
                console.log(chalk.gray(`  删除目录: ${displayPath}`));
                spinner.start();
              }

              await filesystem.removeDir(absolutePath);

              // 递归删除空的父目录（仅当在 .gitreference 目录下时）
              if (
                targetEntry.targetPath.startsWith(".gitreference/") ||
                targetEntry.targetPath.startsWith(GITREFERENCE_DIR + "/")
              ) {
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
              }
            }

            // 从 loading.json 移除条目
            await loading.removeEntry(targetEntry.id, cwd);

            // 清理 .gitignore 中对应的条目
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
                chalk.gray(`  已从 .gitignore 中移除 ${gitignoreEntry}`),
              );
              spinner.start();
            }

            // 检查 .gitreference 目录是否为空
            if (!options.keepEmpty && gitrefDirExists) {
              try {
                const remaining = await filesystem.readDir(gitrefDir);
                // 只剩下 loading.json 或为空时删除整个目录
                if (
                  remaining.length === 0 ||
                  (remaining.length === 1 && remaining[0] === "loading.json")
                ) {
                  // 检查 loading.json 是否还有其他条目
                  const remainingEntries = await loading.getEntries(cwd);
                  if (remainingEntries.length === 0) {
                    if (options.verbose) {
                      spinner.stop();
                      console.log(chalk.gray(`  删除空的 .gitreference 目录`));
                      spinner.start();
                    }
                    await filesystem.removeDir(gitrefDir);
                    // 移除 .gitignore 中的 .gitreference/ 条目
                    await filesystem.removeFromGitignore(cwd, ".gitreference/");
                  }
                }
              } catch {
                // 忽略错误
              }
            }

            const elapsed = Date.now() - startTime;
            spinner.succeed(chalk.green("参考代码已移除!"));
            console.log();
            console.log(`  ${chalk.gray("仓库:")}   ${displayName}`);
            console.log(`  ${chalk.gray("路径:")}   ${displayPath}`);

            if (options.verbose) {
              console.log(chalk.gray(`  耗时: ${elapsed}ms`));
            }
          } catch (error) {
            spinner.fail(chalk.red("删除失败"));
            throw error;
          }
          return;
        }

        // 情况 4: 没有指定名称也没有 --all 或 --list，显示使用说明
        console.log(chalk.yellow("未指定要移除的参考代码。"));
        console.log();
        console.log("用法:");
        console.log(
          `  ${chalk.cyan("grf unload <name>")}        移除指定的参考代码`,
        );
        console.log(
          `  ${chalk.cyan("grf unload --all")}         移除所有参考代码`,
        );
        console.log(
          `  ${chalk.cyan("grf unload --list")}        列出所有已加载的参考代码`,
        );
        console.log(
          `  ${chalk.cyan("grf unload --clean-empty")} 清理空目录结构`,
        );
        console.log();
        console.log(
          `使用 '${chalk.cyan("grf unload --list")}' 查看所有已加载的参考代码。`,
        );
      } catch (error) {
        if (error instanceof GrfError) {
          console.error(chalk.red(`${chalk.bold("✗")} ${error.message}`));

          if (error.code === ErrorCode.FS_PERMISSION_DENIED) {
            console.error(chalk.gray(`  权限被拒绝，请检查文件权限。`));
          }
        } else if (error instanceof Error) {
          console.error(chalk.red(`${chalk.bold("✗")} ${error.message}`));
        } else {
          console.error(chalk.red(`${chalk.bold("✗")} 发生未知错误`));
        }
        process.exit(1);
      }
    },
  );
