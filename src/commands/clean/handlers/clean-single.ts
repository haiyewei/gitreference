/**
 * clean 单个仓库处理器
 * 删除指定的缓存仓库
 */

import chalk from "chalk";
import * as repository from "../../../core/repository.js";
import { confirm, showCancelled } from "../../../ui/prompt.js";
import { startSpinner } from "../../../ui/spinner.js";
import { CleanContext } from "../types.js";
import { removeSingleRepo } from "../helpers.js";
import { displayRepoNotFound } from "../display.js";

/**
 * 处理删除单个仓库
 * @param context 命令上下文
 * @param name 仓库名称
 * @returns 是否已处理
 */
export async function handleCleanSingle(
  context: CleanContext,
  name: string,
): Promise<boolean> {
  const { options } = context;

  // 检查仓库是否存在
  const repoInfo = await repository.get(name);
  if (!repoInfo) {
    displayRepoNotFound(name);
    process.exit(1);
  }

  // 确认删除
  if (!options.force) {
    const confirmed = await confirm(
      `Remove repository '${chalk.cyan(repoInfo.name)}'?`,
    );
    if (!confirmed) {
      showCancelled();
      return true;
    }
  }

  // 删除仓库
  const spinner = startSpinner("Removing repository...");
  await removeSingleRepo(repoInfo.name);
  spinner.succeed("Repository removed successfully!");

  return true;
}
