/**
 * list 命令
 * 列出所有缓存的仓库或当前项目已加载的引用代码
 */

import * as path from "path";
import { Command, Option } from "commander";
import * as repository from "../../core/repository.js";
import * as loading from "../../core/loading.js";
import { handleError } from "../../utils/error.js";
import { jsonOption, verboseOption } from "../options/index.js";
import { ListOptions, ListContext, ListLoadContext } from "./types.js";
import {
  displayEmptyList,
  displayEmptyJson,
  displayJsonOutput,
  displayTableOutput,
  displayEmptyLoadedList,
  displayLoadedJsonOutput,
  displayLoadedEntries,
} from "./display.js";

/**
 * 注册 list 命令
 * @param program Commander 程序实例
 */
export function registerListCommand(program: Command): void {
  program.addCommand(listCommand);
}

/** --load 选项 */
const loadOption = new Option(
  "--load",
  "List loaded reference code in current project",
);

export const listCommand = new Command("list")
  .description("List all cached repositories or loaded reference code")
  .addOption(jsonOption)
  .addOption(loadOption)
  .addOption(verboseOption)
  .action(async (options: ListOptions) => {
    try {
      // 处理 --load 选项：列出当前项目已加载的引用代码
      if (options.load) {
        await handleListLoad(options);
        return;
      }

      // 默认行为：列出缓存的仓库
      const repos = await repository.list();

      // 构建上下文
      const context: ListContext = {
        repos,
        options,
      };

      // 空列表处理
      if (context.repos.length === 0) {
        if (context.options.json) {
          displayEmptyJson();
        } else {
          displayEmptyList();
        }
        return;
      }

      // JSON 格式输出
      if (context.options.json) {
        displayJsonOutput(context.repos);
        return;
      }

      // 表格格式输出
      displayTableOutput(context.repos);
    } catch (error) {
      handleError(error, { exit: true });
    }
  });

/**
 * 处理 --load 选项
 * 列出当前项目已加载的引用代码
 * @param options 命令选项
 */
async function handleListLoad(options: ListOptions): Promise<void> {
  const allEntries = await loading.getEntries();
  const currentDir = process.cwd();

  // 过滤当前工作目录中的条目
  const loadedEntries = allEntries.filter((entry) => {
    if (!entry.workingDirectory) return false;
    return (
      path.normalize(entry.workingDirectory) === path.normalize(currentDir)
    );
  });

  // 构建上下文
  const context: ListLoadContext = {
    loadedEntries,
    options,
  };

  // 空列表处理
  if (context.loadedEntries.length === 0) {
    if (context.options.json) {
      displayEmptyJson();
    } else {
      displayEmptyLoadedList();
    }
    return;
  }

  // JSON 格式输出
  if (context.options.json) {
    displayLoadedJsonOutput(context.loadedEntries);
    return;
  }

  // 表格格式输出
  displayLoadedEntries(context.loadedEntries, context.options.verbose);
}
