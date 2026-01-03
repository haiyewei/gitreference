/**
 * update 命令
 * 更新缓存的仓库到最新版本，可选同步到工作区
 */

import { Command } from "commander";
import { handleError } from "../../utils/error.js";
import {
  checkOption,
  statusOption,
  syncOption,
  syncOnlyOption,
  forceOption,
  dryRunOption,
} from "../options/index.js";
import { UpdateOptions, UpdateContext } from "./types.js";
import {
  handleStatus,
  handleSyncOnly,
  handleUpdateSingle,
  handleUpdateAll,
} from "./handlers/index.js";

/**
 * 注册 update 命令
 * @param program Commander 程序实例
 */
export function registerUpdateCommand(program: Command): void {
  program.addCommand(updateCommand);
}

export const updateCommand = new Command("update")
  .description("Update cached repositories and optionally sync to workspace")
  .argument("[name]", "Repository name (update all if not specified)")
  .addOption(checkOption)
  .addOption(statusOption)
  .addOption(syncOption)
  .addOption(syncOnlyOption)
  .addOption(forceOption)
  .addOption(dryRunOption)
  .action(async (name: string | undefined, options: UpdateOptions) => {
    const checkOnly = options.check ?? false;
    const showStatus = options.status ?? false;
    const doSync = options.sync ?? false;
    const syncOnly = options.syncOnly ?? false;
    const force = options.force ?? false;
    const dryRun = options.dryRun ?? false;

    // 构建上下文
    const context: UpdateContext = {
      name,
      options,
      checkOnly,
      showStatus,
      doSync,
      syncOnly,
      force,
      dryRun,
    };

    try {
      // --status: 显示同步状态
      if (await handleStatus(context)) {
        return;
      }

      // --sync-only: 仅同步工作区，不更新缓存
      if (await handleSyncOnly(context)) {
        return;
      }

      // 更新单个仓库
      if (await handleUpdateSingle(context)) {
        return;
      }

      // 更新所有仓库
      await handleUpdateAll(context);
    } catch (error) {
      handleError(error, { exit: true });
    }
  });
