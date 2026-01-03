/**
 * update 命令显示/格式化逻辑
 */

import chalk from "chalk";
import {
  getAllSyncStatus,
  type SyncStatus,
  type SyncResult,
} from "../../core/sync.js";
import { shortCommit } from "../../ui/format.js";
import { UpdateStatus, UpdateResult } from "./types.js";

/**
 * 获取状态图标
 */
export function getStatusIcon(status: UpdateStatus): string {
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
export function getStatusText(result: UpdateResult): string {
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
export function getSyncStatusText(status: SyncStatus): string {
  if (!status.cacheExists) {
    return chalk.gray("cache not found");
  }
  if (status.needsSync) {
    return chalk.yellow("needs sync");
  }
  return chalk.green("up to date");
}

/**
 * 显示工作区同步状态
 */
export async function showSyncStatus(): Promise<void> {
  const statusList = await getAllSyncStatus();

  if (statusList.length === 0) {
    console.log(chalk.yellow("No loaded reference code."));
    console.log(
      chalk.gray(
        "\nUse `grf load <name>` to load reference code to workspace.",
      ),
    );
    return;
  }

  console.log(chalk.bold("Workspace sync status:\n"));

  // 计算列宽
  const repoColWidth =
    Math.max(30, ...statusList.map((s) => s.repoName.length)) + 2;
  const pathColWidth =
    Math.max(20, ...statusList.map((s) => s.targetPath.length)) + 2;
  const commitColWidth = 12;

  // 表头
  console.log(
    chalk.gray("REPO".padEnd(repoColWidth)) +
      chalk.gray("TARGET PATH".padEnd(pathColWidth)) +
      chalk.gray("LOADED".padEnd(commitColWidth)) +
      chalk.gray("CACHED".padEnd(commitColWidth)) +
      chalk.gray("STATUS"),
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
    `Total ${statusList.length} references, ${needsSyncCount} need sync` +
      (cacheMissingCount > 0 ? `, ${cacheMissingCount} cache not found` : ""),
  );

  if (needsSyncCount > 0) {
    console.log(
      chalk.gray(
        "\nUse `grf update --sync` or `grf update --sync-only` to sync to workspace.",
      ),
    );
  }
}

/**
 * 显示同步结果
 */
export function displaySyncResults(results: SyncResult[]): void {
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
    `Sync complete: ${successCount} succeeded` +
      (failCount > 0 ? `, ${failCount} failed` : ""),
  );
}

/**
 * 在 dry-run 模式下显示将要执行的操作
 */
export async function showDryRunSync(force: boolean): Promise<void> {
  const statusList = await getAllSyncStatus();

  if (statusList.length === 0) {
    console.log(chalk.yellow("No loaded reference code."));
    return;
  }

  const toSync = force
    ? statusList.filter((s) => s.cacheExists)
    : statusList.filter((s) => s.needsSync && s.cacheExists);

  if (toSync.length === 0) {
    console.log(
      chalk.green("All reference code is up to date, no sync needed."),
    );
    return;
  }

  console.log(
    chalk.bold("[Dry Run] Will execute the following sync operations:\n"),
  );

  for (const status of toSync) {
    const oldCommit = shortCommit(status.loadedCommitId);
    const newCommit = shortCommit(status.cacheCommitId);

    if (status.loadedCommitId === status.cacheCommitId) {
      console.log(
        chalk.gray(`  - ${status.repoName}: force re-sync (${oldCommit})`),
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
      "This is dry-run mode, no actual operations performed. Remove --dry-run option to execute sync.",
    ),
  );
}
