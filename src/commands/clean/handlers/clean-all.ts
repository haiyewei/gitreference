/**
 * clean --all 处理器
 * 删除所有缓存的仓库
 */

import { confirm, showCancelled } from "../../../ui/prompt.js";
import { startSpinner } from "../../../ui/spinner.js";
import { CleanContext } from "../types.js";
import { removeAllRepos } from "../helpers.js";
import {
  displayReposToDelete,
  displayPartialRemoveResult,
} from "../display.js";

/**
 * 处理 --all 选项，删除所有仓库
 * @param context 命令上下文
 * @returns 是否已处理
 */
export async function handleCleanAll(context: CleanContext): Promise<boolean> {
  const { repos, options } = context;

  if (!options.all) {
    return false;
  }

  // 显示将要删除的仓库列表
  if (!options.force) {
    displayReposToDelete(repos);

    const confirmed = await confirm("Are you sure?");
    if (!confirmed) {
      showCancelled();
      return true;
    }
  }

  // 删除所有仓库
  const spinner = startSpinner("Removing repositories...");
  const { removedCount, errors } = await removeAllRepos(repos);

  if (errors.length > 0) {
    spinner.warn(`Removed ${removedCount} of ${repos.length} repositories.`);
    displayPartialRemoveResult(removedCount, repos.length, errors);
  } else {
    spinner.succeed("All repositories removed!");
  }

  return true;
}
