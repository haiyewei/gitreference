/**
 * load 命令
 * 将缓存的仓库内容复制到当前工作目录
 * 支持直接传入 git URL，会自动先 add 再 load
 */

import { Command } from "commander";
import { handleError } from "../../utils/error.js";
import {
  subdirOption,
  noIgnoreOption,
  branchOption,
} from "../options/index.js";
import { LoadOptions, LoadContext } from "./types.js";
import { handleUrlAdd, handleCopyRepo } from "./handlers/index.js";

/**
 * 注册 load 命令
 * @param program Commander 程序实例
 */
export function registerLoadCommand(program: Command): void {
  program.addCommand(loadCommand);
}

export const loadCommand = new Command("load")
  .description(
    "Copy reference repository to current directory (supports Git URL)",
  )
  .argument("<name>", "Repository name, short name, or Git URL")
  .argument("[path]", "Target path (default: .gitreference/<repo-path>)")
  .addOption(subdirOption)
  .addOption(noIgnoreOption)
  .addOption(branchOption)
  .action(
    async (
      name: string,
      targetPath: string | undefined,
      options: LoadOptions,
    ) => {
      // 构建上下文
      const context: LoadContext = {
        name,
        repoName: name, // 初始值，可能会被 handleUrlAdd 更新
        targetPath,
        options,
      };

      try {
        // 处理 Git URL 自动添加
        await handleUrlAdd(context);

        // 复制仓库到目标路径
        await handleCopyRepo(context);
      } catch (error) {
        handleError(error, { exit: true });
      }
    },
  );
