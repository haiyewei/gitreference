/**
 * update 命令 - 更新所有仓库逻辑
 */

import chalk from "chalk";
import * as repository from "../../../core/repository.js";
import { syncAll } from "../../../core/sync.js";
import { createSpinner } from "../../../ui/spinner.js";
import { UpdateContext, UpdateResult } from "../types.js";
import { updateRepo } from "../helpers.js";
import {
  getStatusIcon,
  getStatusText,
  showDryRunSync,
  displaySyncResults,
} from "../display.js";

/**
 * 处理更新所有仓库
 * @param context 命令上下文
 */
export async function handleUpdateAll(context: UpdateContext): Promise<void> {
  const repos = await repository.list();

  if (repos.length === 0) {
    console.log(chalk.yellow("No repositories found."));
    console.log(chalk.gray("\nUse `grf add <url>` to add a repository."));
    return;
  }

  const actionText = context.checkOnly
    ? "Checking repositories..."
    : "Updating repositories...";
  console.log(actionText);
  console.log();

  const results: UpdateResult[] = [];

  for (const repo of repos) {
    const spinner = createSpinner(`  ${repo.name}`).start();
    const result = await updateRepo(repo, context.checkOnly);
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
  const updatedCount = results.filter((r) => r.status === "updated").length;
  const hasUpdatesCount = results.filter(
    (r) => r.status === "has-updates",
  ).length;
  const errorCount = results.filter((r) => r.status === "error").length;

  console.log();

  if (context.checkOnly) {
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

  // --sync: 更新后同步到工作区
  if (context.doSync && !context.checkOnly) {
    console.log();
    if (context.dryRun) {
      await showDryRunSync(context.force);
    } else {
      console.log(chalk.bold("Syncing to workspace...\n"));
      const syncResults = await syncAll(context.force);

      if (syncResults.length === 0) {
        console.log(chalk.gray("No loaded reference code needs syncing."));
      } else {
        displaySyncResults(syncResults);

        const syncFailCount = syncResults.filter((r) => !r.success).length;
        if (syncFailCount > 0) {
          process.exit(1);
        }
      }
    }
  }
}
