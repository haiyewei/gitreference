/**
 * unload 命令
 * 从当前项目中移除已加载的参考代码（use 命令的逆操作）
 */

import { Command } from "commander";
import path from "path";
import * as filesystem from "../../core/filesystem.js";
import { handleError } from "../../utils/error.js";
import { DIR_NAMES } from "../../utils/constants.js";
import {
  allOption,
  forceOption,
  dryRunOption,
  listOption,
  keepEmptyOption,
  cleanEmptyOption,
  verboseOption,
} from "../options/index.js";
import { UnloadOptions, UnloadContext } from "./types.js";
import { getLoadedEntries, scanEmptyDirs } from "./helpers.js";
import { displayUsageHelp } from "./display.js";
import {
  handleCleanEmpty,
  handleList,
  handleRemoveAll,
  handleRemoveSingle,
} from "./handlers/index.js";

/** .gitreference 目录名（使用共享常量） */
const GITREFERENCE_DIR = DIR_NAMES.GITREFERENCE;

/**
 * 注册 unload 命令
 * @param program Commander 程序实例
 */
export function registerUnloadCommand(program: Command): void {
  program.addCommand(unloadCommand);
}

export const unloadCommand = new Command("unload")
  .description("Remove reference code from current project")
  .argument("[name]", "Repository name to remove")
  .addOption(allOption)
  .addOption(forceOption)
  .addOption(dryRunOption)
  .addOption(listOption)
  .addOption(keepEmptyOption)
  .addOption(cleanEmptyOption)
  .addOption(verboseOption)
  .action(async (name: string | undefined, options: UnloadOptions) => {
    const startTime = Date.now();

    try {
      const cwd = process.cwd();
      const gitrefDir = path.join(cwd, GITREFERENCE_DIR);

      // 获取所有已加载的条目
      const loadedEntries = await getLoadedEntries();

      // 检查 .gitreference 目录是否存在（用于空目录扫描）
      const gitrefDirExists = await filesystem.exists(gitrefDir);

      // 扫描空目录（仅当 .gitreference 目录存在时）
      const loadedPaths = new Set(loadedEntries.map((e) => e.targetPath));
      const emptyDirs = gitrefDirExists
        ? await scanEmptyDirs(gitrefDir, "", loadedPaths)
        : [];

      // 构建上下文
      const context: UnloadContext = {
        cwd,
        gitrefDir,
        gitrefDirExists,
        loadedEntries,
        emptyDirs,
        options,
        startTime,
      };

      // 情况 0: --clean-empty 选项，清理空目录
      if (await handleCleanEmpty(context)) {
        return;
      }

      // 情况 1: --list 选项，列出所有已加载的参考代码
      if (await handleList(context)) {
        return;
      }

      // 情况 2: --all 选项，删除所有参考代码
      if (await handleRemoveAll(context)) {
        return;
      }

      // 情况 3: 指定了仓库名称，删除特定参考代码
      if (name) {
        await handleRemoveSingle(context, name);
        return;
      }

      // 情况 4: 未指定名称、--all 或 --list，显示用法
      displayUsageHelp();
    } catch (error) {
      handleError(error, { exit: true });
    }
  });
