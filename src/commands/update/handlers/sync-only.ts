/**
 * update 命令 --sync-only 处理逻辑
 */

import chalk from "chalk";
import { syncAll } from "../../../core/sync.js";
import { startSpinner } from "../../../ui/spinner.js";
import { UpdateContext } from "../types.js";
import { showDryRunSync, displaySyncResults } from "../display.js";

/**
 * 处理 --sync-only 选项
 * @param context 命令上下文
 * @returns 如果处理了该选项返回 true，否则返回 false
 */
export async function handleSyncOnly(context: UpdateContext): Promise<boolean> {
  if (!context.syncOnly) {
    return false;
  }

  if (context.dryRun) {
    await showDryRunSync(context.force);
    return true;
  }

  const spinner = startSpinner("Syncing to workspace...");
  const results = await syncAll(context.force);
  spinner.stop();

  if (results.length === 0) {
    console.log(chalk.yellow("No loaded reference code."));
    return true;
  }

  displaySyncResults(results);

  const failCount = results.filter((r) => !r.success).length;
  if (failCount > 0) {
    process.exit(1);
  }

  return true;
}
