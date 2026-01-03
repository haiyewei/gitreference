/**
 * add 命令
 * 克隆远程仓库到本地缓存
 */

import { Command } from "commander";
import chalk from "chalk";
import { startSpinner } from "../../ui/spinner.js";
import { handleError } from "../../utils/error.js";
import {
  nameOption,
  branchOption,
  shallowOption,
  noShallowOption,
  depthOption,
} from "../options/index.js";
import { AddOptions, AddContext } from "./types.js";
import { addRepository } from "./helpers.js";
import { displaySuccess } from "./display.js";

/**
 * 注册 add 命令
 * @param program Commander 程序实例
 */
export function registerAddCommand(program: Command): void {
  program.addCommand(addCommand);
}

export const addCommand = new Command("add")
  .description("Add a reference repository")
  .argument("<url>", "Git repository URL")
  .addOption(nameOption)
  .addOption(branchOption)
  .addOption(shallowOption)
  .addOption(noShallowOption)
  .addOption(depthOption)
  .action(async (url: string, options: AddOptions) => {
    const spinner = startSpinner("Cloning repository...");

    // 构建上下文
    const context: AddContext = {
      url,
      options,
      spinner,
    };

    try {
      // 执行添加操作
      const result = await addRepository(context);

      spinner.succeed(chalk.green("Repository added successfully!"));

      // 显示仓库信息
      if (result.repoInfo) {
        displaySuccess(result.repoInfo);
      }
    } catch (error) {
      spinner.fail(chalk.red("Failed to add repository"));
      console.error();
      handleError(error, { exit: true });
    }
  });
