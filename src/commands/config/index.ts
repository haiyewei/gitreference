/**
 * config 命令
 * 管理全局配置
 */

import { Command } from "commander";
import { readGlobalConfig } from "../../core/config.js";
import { handleError } from "../../utils/error.js";
import { listOption, pathOption } from "../options/index.js";
import { ConfigOptions, ConfigContext } from "./types.js";
import {
  handleShowPath,
  handleShowAll,
  handleShowValue,
  handleSetValue,
} from "./handlers/index.js";

/**
 * 注册 config 命令
 * @param program Commander 程序实例
 */
export function registerConfigCommand(program: Command): void {
  program.addCommand(configCommand);
}

export const configCommand = new Command("config")
  .description("Manage global configuration")
  .argument("[key]", "Configuration key")
  .argument("[value]", "Configuration value")
  .addOption(listOption)
  .addOption(pathOption)
  .action(
    async (
      key: string | undefined,
      value: string | undefined,
      options: ConfigOptions,
    ) => {
      try {
        // 构建上下文
        const context: ConfigContext = {
          key,
          value,
          options,
        };

        // 处理 --path 选项（不需要读取配置）
        if (await handleShowPath(context)) {
          return;
        }

        // 读取配置
        context.config = await readGlobalConfig();

        // 按优先级依次处理各种情况
        if (await handleShowAll(context)) {
          return;
        }

        if (await handleShowValue(context)) {
          return;
        }

        if (await handleSetValue(context)) {
          return;
        }
      } catch (error) {
        handleError(error, { exit: true });
      }
    },
  );
