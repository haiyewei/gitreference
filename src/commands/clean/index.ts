/**
 * clean 命令
 * 清理不需要的缓存仓库
 */

import { Command } from "commander";
import * as repository from "../../core/repository.js";
import { handleError } from "../../utils/error.js";
import { allOption, forceOption } from "../options/index.js";
import { CleanOptions, CleanContext } from "./types.js";
import { displayNoRepos, displayUsageHelp } from "./display.js";
import { handleCleanAll, handleCleanSingle } from "./handlers/index.js";

/**
 * 注册 clean 命令
 * @param program Commander 程序实例
 */
export function registerCleanCommand(program: Command): void {
  program.addCommand(cleanCommand);
}

export const cleanCommand = new Command("clean")
  .description("Clean cached repositories")
  .argument("[name]", "Repository name to remove")
  .addOption(allOption)
  .addOption(forceOption)
  .action(async (name: string | undefined, options: CleanOptions) => {
    try {
      // 获取所有仓库列表
      const repos = await repository.list();

      // 如果没有仓库可清理
      if (repos.length === 0) {
        displayNoRepos();
        return;
      }

      // 构建上下文
      const context: CleanContext = {
        repos,
        options,
      };

      // 情况 1: 指定了 --all，删除所有仓库
      if (await handleCleanAll(context)) {
        return;
      }

      // 情况 2: 指定了仓库名称，删除指定仓库
      if (name) {
        await handleCleanSingle(context, name);
        return;
      }

      // 情况 3: 没有指定名称也没有 --all，显示使用说明
      displayUsageHelp();
    } catch (error) {
      handleError(error, { exit: true });
    }
  });
