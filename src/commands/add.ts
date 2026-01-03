/**
 * add 命令
 * 克隆远程仓库到本地缓存
 */

import { Command } from "commander";
import chalk from "chalk";
import * as repository from "../core/repository.js";
import { startSpinner } from "../ui/spinner.js";
import { shortCommit } from "../ui/format.js";
import { handleError } from "../utils/error.js";

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
  .option("-n, --name <name>", "Custom repository name")
  .option("-b, --branch <branch>", "Specify branch")
  .option("--shallow", "Shallow clone (default)", true)
  .option("--no-shallow", "Full clone")
  .option("--depth <n>", "Shallow clone depth", "1")
  .action(
    async (
      url: string,
      options: {
        name?: string;
        branch?: string;
        shallow: boolean;
        depth: string;
      },
    ) => {
      const spinner = startSpinner("Cloning repository...");

      try {
        const repoInfo = await repository.add(url, {
          name: options.name,
          branch: options.branch,
          shallow: options.shallow,
          depth: parseInt(options.depth, 10),
        });

        spinner.succeed(chalk.green("Repository added successfully!"));

        // 显示仓库信息
        console.log();
        console.log(`  ${chalk.gray("Name:")}     ${repoInfo.name}`);
        console.log(`  ${chalk.gray("Path:")}     ${repoInfo.path}`);
        if (repoInfo.branch) {
          console.log(`  ${chalk.gray("Branch:")}   ${repoInfo.branch}`);
        }
        console.log(
          `  ${chalk.gray("Commit:")}   ${shortCommit(repoInfo.commitId)}...`,
        );
      } catch (error) {
        spinner.fail(chalk.red("Failed to add repository"));
        console.error();
        handleError(error, { exit: true });
      }
    },
  );
