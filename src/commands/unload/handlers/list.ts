/**
 * --list 处理逻辑
 */

import chalk from "chalk";
import { UnloadContext } from "../types.js";
import { displayLoadedEntries, displayEmptyDirsHint } from "../display.js";

/**
 * 处理 --list 选项
 * @param context unload 命令上下文
 * @returns 是否已处理（true 表示命令应该结束）
 */
export async function handleList(context: UnloadContext): Promise<boolean> {
  const { loadedEntries, emptyDirs, options } = context;

  if (!options.list) {
    return false;
  }

  if (loadedEntries.length === 0 && emptyDirs.length === 0) {
    console.log(chalk.yellow("No loaded reference code in current project."));
    return true;
  }

  if (loadedEntries.length > 0) {
    displayLoadedEntries(loadedEntries, options.verbose);
  } else {
    console.log(chalk.yellow("No loaded reference code in current project."));
    console.log();
  }

  // 显示空目录提示
  if (emptyDirs.length > 0) {
    displayEmptyDirsHint(emptyDirs, options.verbose);
  }

  if (loadedEntries.length > 0) {
    console.log(
      chalk.gray(
        `💡 Use 'grf unload <name>' to remove specific reference code`,
      ),
    );
  }

  return true;
}
