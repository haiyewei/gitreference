/**
 * update 命令 - 更新单个仓库逻辑
 */

import chalk from "chalk";
import * as repository from "../../../core/repository.js";
import { getAllSyncStatus, syncAll } from "../../../core/sync.js";
import { shortCommit } from "../../../ui/format.js";
import { startSpinner } from "../../../ui/spinner.js";
import { UpdateContext } from "../types.js";
import { updateRepo } from "../helpers.js";
import { displaySyncResults } from "../display.js";

/**
 * 处理更新单个仓库
 * @param context 命令上下文
 * @returns 如果处理了该选项返回 true，否则返回 false
 */
export async function handleUpdateSingle(
  context: UpdateContext,
): Promise<boolean> {
  if (!context.name) {
    return false;
  }

  const name = context.name;
  const spinner = startSpinner("Checking for updates...");

  const repoInfo = await repository.get(name);
  if (!repoInfo) {
    spinner.fail(chalk.red("Repository not found"));
    console.error(
      chalk.red(`\n${chalk.bold("✗")} Repository not found: ${name}`),
    );
    process.exit(1);
  }

  const result = await updateRepo(repoInfo, context.checkOnly);

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

    // --sync: 更新后同步到工作区
    if (context.doSync) {
      console.log();
      if (context.dryRun) {
        console.log(chalk.bold("[Dry Run] Will sync to workspace..."));
        console.log(
          chalk.gray("This is dry-run mode, no actual operations performed."),
        );
      } else {
        const syncSpinner = startSpinner("Syncing to workspace...");
        const syncResults = await syncAll(context.force);
        syncSpinner.stop();

        // 仅显示与当前仓库相关的同步结果
        const relevantResults = syncResults.filter(
          (r) => r.repoName === repoInfo.name || r.repoName.includes(name),
        );

        if (relevantResults.length > 0) {
          displaySyncResults(relevantResults);
        } else {
          console.log(chalk.gray("No workspace entries need syncing."));
        }
      }
    }
  }

  // 如果仓库已是最新但用户指定了 --sync，也执行同步
  if (
    (result.status === "up-to-date" || result.status === "has-updates") &&
    context.doSync &&
    !context.checkOnly
  ) {
    console.log();
    if (context.dryRun) {
      console.log(chalk.bold("[Dry Run] Will sync to workspace..."));
      const statusList = await getAllSyncStatus();
      const relevantStatus = statusList.filter(
        (s) => s.repoName === repoInfo.name || s.repoName.includes(name),
      );
      if (
        relevantStatus.length > 0 &&
        relevantStatus.some((s) => s.needsSync || context.force)
      ) {
        for (const status of relevantStatus) {
          if (status.needsSync || context.force) {
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
        console.log(chalk.gray("No workspace entries need syncing."));
      }
      console.log(
        chalk.gray("\nThis is dry-run mode, no actual operations performed."),
      );
    } else {
      const syncSpinner = startSpinner("Syncing to workspace...");
      const syncResults = await syncAll(context.force);
      syncSpinner.stop();

      const relevantResults = syncResults.filter(
        (r) => r.repoName === repoInfo.name || r.repoName.includes(name),
      );

      if (relevantResults.length > 0) {
        displaySyncResults(relevantResults);
      } else {
        console.log(chalk.gray("No workspace entries need syncing."));
      }
    }
  }

  return true;
}
