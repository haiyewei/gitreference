/**
 * update 命令
 * 更新缓存的仓库到最新版本，并可选同步到工作目录
 */

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import * as repository from "../core/repository.js";
import * as git from "../core/git.js";
import { readRepoMeta, writeRepoMeta } from "../core/config.js";
import { GrfError } from "../types/index.js";
import type { RepoInfo } from "../core/repository.js";
import {
  getAllSyncStatus,
  syncAll,
  type SyncStatus,
  type SyncResult,
} from "../core/sync.js";

/**
 * 更新结果状态
 */
type UpdateStatus = "up-to-date" | "has-updates" | "updated" | "error";

/**
 * 更新结果
 */
interface UpdateResult {
  /** 仓库名称 */
  name: string;
  /** 更新状态 */
  status: UpdateStatus;
  /** 旧 commit ID（仅当 status 为 'updated' 时） */
  oldCommit?: string;
  /** 新 commit ID（仅当 status 为 'updated' 时） */
  newCommit?: string;
  /** 错误信息（仅当 status 为 'error' 时） */
  error?: string;
}

/**
 * 更新单个仓库
 * @param repoInfo 仓库信息
 * @param checkOnly 是否仅检查更新
 * @returns 更新结果
 */
async function updateRepo(
  repoInfo: RepoInfo,
  checkOnly: boolean,
): Promise<UpdateResult> {
  const repoPath = repoInfo.path;
  const oldCommit = repoInfo.commitId;

  try {
    // 检查是否有更新
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

/**
 * 格式化 commit ID（取前 7 位）
 */
function shortCommit(commitId: string): string {
  return commitId.substring(0, 7);
}

/**
 * 获取状态图标
 */
function getStatusIcon(status: UpdateStatus): string {
  switch (status) {
    case "up-to-date":
      return chalk.green("✓");
    case "has-updates":
      return chalk.yellow("⬆");
    case "updated":
      return chalk.green("✓");
    case "error":
      return chalk.red("✗");
  }
}

/**
 * 获取状态文本
 */
function getStatusText(result: UpdateResult): string {
  switch (result.status) {
    case "up-to-date":
      return chalk.gray("up-to-date");
    case "has-updates":
      return chalk.yellow("has updates");
    case "updated":
      return chalk.green(
        `updated (${shortCommit(result.oldCommit!)} → ${shortCommit(result.newCommit!)})`,
      );
    case "error":
      return chalk.red(`error: ${result.error}`);
  }
}

/**
 * 获取同步状态文本
 */
function getSyncStatusText(status: SyncStatus): string {
  if (!status.cacheExists) {
    return chalk.gray("缓存不存在");
  }
  if (status.needsSync) {
    return chalk.yellow("需要同步");
  }
  return chalk.green("已是最新");
}

/**
 * 显示工作目录同步状态
 */
async function showSyncStatus(): Promise<void> {
  const statusList = await getAllSyncStatus();

  if (statusList.length === 0) {
    console.log(chalk.yellow("没有已加载的参考代码。"));
    console.log(
      chalk.gray("\n使用 `grf load <name>` 加载参考代码到工作目录。"),
    );
    return;
  }

  console.log(chalk.bold("工作目录同步状态:\n"));

  // 计算列宽
  const repoColWidth =
    Math.max(30, ...statusList.map((s) => s.repoName.length)) + 2;
  const pathColWidth =
    Math.max(20, ...statusList.map((s) => s.targetPath.length)) + 2;
  const commitColWidth = 12;

  // 表头
  console.log(
    chalk.gray("仓库".padEnd(repoColWidth)) +
      chalk.gray("目标路径".padEnd(pathColWidth)) +
      chalk.gray("加载版本".padEnd(commitColWidth)) +
      chalk.gray("缓存版本".padEnd(commitColWidth)) +
      chalk.gray("状态"),
  );

  // 分隔线
  console.log(
    chalk.gray(
      "-".repeat(repoColWidth + pathColWidth + commitColWidth * 2 + 15),
    ),
  );

  // 数据行
  for (const status of statusList) {
    const loadedCommit = status.loadedCommitId
      ? shortCommit(status.loadedCommitId)
      : "-";
    const cacheCommit =
      status.cacheExists && status.cacheCommitId
        ? shortCommit(status.cacheCommitId)
        : "-";

    console.log(
      status.repoName.padEnd(repoColWidth) +
        status.targetPath.padEnd(pathColWidth) +
        loadedCommit.padEnd(commitColWidth) +
        cacheCommit.padEnd(commitColWidth) +
        getSyncStatusText(status),
    );
  }

  // 统计
  const needsSyncCount = statusList.filter((s) => s.needsSync).length;
  const cacheMissingCount = statusList.filter((s) => !s.cacheExists).length;

  console.log();
  console.log(
    `共 ${statusList.length} 个参考，${needsSyncCount} 个需要同步` +
      (cacheMissingCount > 0 ? `，${cacheMissingCount} 个缓存不存在` : ""),
  );

  if (needsSyncCount > 0) {
    console.log(
      chalk.gray(
        "\n使用 `grf update --sync` 或 `grf update --sync-only` 同步到工作目录。",
      ),
    );
  }
}

/**
 * 显示同步结果
 */
function displaySyncResults(results: SyncResult[]): void {
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;

  console.log();
  for (const result of results) {
    if (result.success) {
      if (result.oldCommitId !== result.newCommitId) {
        console.log(chalk.green(`✓ ${result.repoName}: ${result.message}`));
      } else {
        console.log(chalk.gray(`- ${result.repoName}: ${result.message}`));
      }
    } else {
      console.log(chalk.red(`✗ ${result.repoName}: ${result.message}`));
    }
  }

  console.log();
  console.log(
    `同步完成: ${successCount} 成功` +
      (failCount > 0 ? `, ${failCount} 失败` : ""),
  );
}

/**
 * 显示 dry-run 模式下将要执行的操作
 */
async function showDryRunSync(force: boolean): Promise<void> {
  const statusList = await getAllSyncStatus();

  if (statusList.length === 0) {
    console.log(chalk.yellow("没有已加载的参考代码。"));
    return;
  }

  const toSync = force
    ? statusList.filter((s) => s.cacheExists)
    : statusList.filter((s) => s.needsSync && s.cacheExists);

  if (toSync.length === 0) {
    console.log(chalk.green("所有参考代码已是最新，无需同步。"));
    return;
  }

  console.log(chalk.bold("[Dry Run] 将要执行以下同步操作:\n"));

  for (const status of toSync) {
    const oldCommit = shortCommit(status.loadedCommitId);
    const newCommit = shortCommit(status.cacheCommitId);

    if (status.loadedCommitId === status.cacheCommitId) {
      console.log(
        chalk.gray(`  - ${status.repoName}: 强制重新同步 (${oldCommit})`),
      );
    } else {
      console.log(
        chalk.yellow(`  - ${status.repoName}: ${oldCommit} → ${newCommit}`),
      );
    }
  }

  console.log();
  console.log(
    chalk.gray(
      "这是试运行模式，未执行实际操作。移除 --dry-run 选项以执行同步。",
    ),
  );
}

/**
 * 命令选项接口
 */
interface UpdateOptions {
  check?: boolean;
  status?: boolean;
  sync?: boolean;
  syncOnly?: boolean;
  force?: boolean;
  dryRun?: boolean;
}

export const updateCommand = new Command("update")
  .description("Update cached repositories and optionally sync to workspace")
  .argument("[name]", "Repository name (update all if not specified)")
  .option("--check", "Only check for updates, do not pull")
  .option("--status", "Show sync status between workspace and cache")
  .option("-s, --sync", "Sync to workspace after updating cache")
  .option("--sync-only", "Only sync to workspace (skip cache update)")
  .option("-f, --force", "Force sync even if versions match")
  .option("--dry-run", "Show what would be done without actually doing it")
  .action(async (name: string | undefined, options: UpdateOptions) => {
    const checkOnly = options.check ?? false;
    const showStatus = options.status ?? false;
    const doSync = options.sync ?? false;
    const syncOnly = options.syncOnly ?? false;
    const force = options.force ?? false;
    const dryRun = options.dryRun ?? false;

    try {
      // --status: 显示同步状态
      if (showStatus) {
        await showSyncStatus();
        return;
      }

      // --sync-only: 仅同步工作目录，不更新缓存
      if (syncOnly) {
        if (dryRun) {
          await showDryRunSync(force);
          return;
        }

        const spinner = ora("正在同步到工作目录...").start();
        const results = await syncAll(force);
        spinner.stop();

        if (results.length === 0) {
          console.log(chalk.yellow("没有已加载的参考代码。"));
          return;
        }

        displaySyncResults(results);

        const failCount = results.filter((r) => !r.success).length;
        if (failCount > 0) {
          process.exit(1);
        }
        return;
      }

      if (name) {
        // 更新单个仓库
        const spinner = ora("Checking for updates...").start();

        const repoInfo = await repository.get(name);
        if (!repoInfo) {
          spinner.fail(chalk.red("Repository not found"));
          console.error(
            chalk.red(`\n${chalk.bold("✗")} Repository not found: ${name}`),
          );
          process.exit(1);
        }

        const result = await updateRepo(repoInfo, checkOnly);

        if (result.status === "error") {
          spinner.fail(chalk.red("Update failed"));
          console.error(chalk.red(`\n${chalk.bold("✗")} ${result.error}`));
          process.exit(1);
        }

        if (result.status === "up-to-date") {
          spinner.succeed(chalk.green("Repository is up-to-date"));
          console.log();
          console.log(`  ${chalk.gray("Name:")}       ${repoInfo.name}`);
          console.log(
            `  ${chalk.gray("Commit:")}     ${shortCommit(repoInfo.commitId)}...`,
          );
        } else if (result.status === "has-updates") {
          spinner.succeed(chalk.yellow("Updates available"));
          console.log();
          console.log(`  ${chalk.gray("Name:")}       ${repoInfo.name}`);
          console.log(
            `  ${chalk.gray("Status:")}     ${chalk.yellow("has updates available")}`,
          );
          console.log();
          console.log(chalk.gray("  Run without --check to apply updates."));
        } else if (result.status === "updated") {
          spinner.succeed(chalk.green("Repository updated!"));
          console.log();
          console.log(`  ${chalk.gray("Name:")}       ${repoInfo.name}`);
          console.log(
            `  ${chalk.gray("Old Commit:")} ${shortCommit(result.oldCommit!)}...`,
          );
          console.log(
            `  ${chalk.gray("New Commit:")} ${shortCommit(result.newCommit!)}...`,
          );

          // --sync: 更新后同步到工作目录
          if (doSync) {
            console.log();
            if (dryRun) {
              console.log(chalk.bold("[Dry Run] 将要同步到工作目录..."));
              console.log(chalk.gray("这是试运行模式，未执行实际操作。"));
            } else {
              const syncSpinner = ora("正在同步到工作目录...").start();
              const syncResults = await syncAll(force);
              syncSpinner.stop();

              // 只显示与当前仓库相关的同步结果
              const relevantResults = syncResults.filter(
                (r) =>
                  r.repoName === repoInfo.name || r.repoName.includes(name),
              );

              if (relevantResults.length > 0) {
                displaySyncResults(relevantResults);
              } else {
                console.log(chalk.gray("没有需要同步的工作目录条目。"));
              }
            }
          }
        }

        // 如果仓库已是最新但用户指定了 --sync，也执行同步
        if (
          (result.status === "up-to-date" || result.status === "has-updates") &&
          doSync &&
          !checkOnly
        ) {
          console.log();
          if (dryRun) {
            console.log(chalk.bold("[Dry Run] 将要同步到工作目录..."));
            const statusList = await getAllSyncStatus();
            const relevantStatus = statusList.filter(
              (s) => s.repoName === repoInfo.name || s.repoName.includes(name),
            );
            if (
              relevantStatus.length > 0 &&
              relevantStatus.some((s) => s.needsSync || force)
            ) {
              for (const status of relevantStatus) {
                if (status.needsSync || force) {
                  const oldCommit = shortCommit(status.loadedCommitId);
                  const newCommit = shortCommit(status.cacheCommitId);
                  console.log(
                    chalk.yellow(
                      `  - ${status.repoName}: ${oldCommit} → ${newCommit}`,
                    ),
                  );
                }
              }
            } else {
              console.log(chalk.gray("没有需要同步的工作目录条目。"));
            }
            console.log(chalk.gray("\n这是试运行模式，未执行实际操作。"));
          } else {
            const syncSpinner = ora("正在同步到工作目录...").start();
            const syncResults = await syncAll(force);
            syncSpinner.stop();

            const relevantResults = syncResults.filter(
              (r) => r.repoName === repoInfo.name || r.repoName.includes(name),
            );

            if (relevantResults.length > 0) {
              displaySyncResults(relevantResults);
            } else {
              console.log(chalk.gray("没有需要同步的工作目录条目。"));
            }
          }
        }
      } else {
        // 更新所有仓库
        const repos = await repository.list();

        if (repos.length === 0) {
          console.log(chalk.yellow("No repositories found."));
          console.log(chalk.gray("\nUse `grf add <url>` to add a repository."));
          return;
        }

        const actionText = checkOnly
          ? "Checking repositories..."
          : "Updating repositories...";
        console.log(actionText);
        console.log();

        const results: UpdateResult[] = [];

        for (const repo of repos) {
          const spinner = ora(`  ${repo.name}`).start();
          const result = await updateRepo(repo, checkOnly);
          results.push(result);

          // 更新 spinner 显示结果
          const icon = getStatusIcon(result.status);
          const statusText = getStatusText(result);
          spinner.stopAndPersist({
            symbol: icon,
            text: `${repo.name}     ${statusText}`,
          });
        }

        // 统计结果
        const updatedCount = results.filter(
          (r) => r.status === "updated",
        ).length;
        const hasUpdatesCount = results.filter(
          (r) => r.status === "has-updates",
        ).length;
        const errorCount = results.filter((r) => r.status === "error").length;

        console.log();

        if (checkOnly) {
          if (hasUpdatesCount > 0) {
            console.log(
              chalk.yellow(
                `${hasUpdatesCount} repository${hasUpdatesCount > 1 ? "ies have" : " has"} updates available.`,
              ),
            );
          } else if (errorCount === 0) {
            console.log(chalk.green("All repositories are up-to-date."));
          }
        } else {
          if (updatedCount > 0) {
            console.log(
              chalk.green(
                `${updatedCount} repository${updatedCount > 1 ? "ies" : ""} updated.`,
              ),
            );
          } else if (errorCount === 0) {
            console.log(chalk.green("All repositories are up-to-date."));
          }
        }

        if (errorCount > 0) {
          console.log(
            chalk.red(
              `${errorCount} repository${errorCount > 1 ? "ies" : ""} failed to update.`,
            ),
          );
          process.exit(1);
        }

        // --sync: 更新后同步到工作目录
        if (doSync && !checkOnly) {
          console.log();
          if (dryRun) {
            await showDryRunSync(force);
          } else {
            console.log(chalk.bold("正在同步到工作目录...\n"));
            const syncResults = await syncAll(force);

            if (syncResults.length === 0) {
              console.log(chalk.gray("没有已加载的参考代码需要同步。"));
            } else {
              displaySyncResults(syncResults);

              const syncFailCount = syncResults.filter(
                (r) => !r.success,
              ).length;
              if (syncFailCount > 0) {
                process.exit(1);
              }
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof GrfError) {
        console.error(chalk.red(`\n${chalk.bold("✗")} ${error.message}`));
        process.exit(1);
      }

      // 未知错误
      if (error instanceof Error) {
        console.error(chalk.red(`\n${chalk.bold("✗")} ${error.message}`));
      } else {
        console.error(
          chalk.red(`\n${chalk.bold("✗")} An unknown error occurred`),
        );
      }
      process.exit(1);
    }
  });
