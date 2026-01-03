/**
 * add 命令
 * 克隆远程仓库到本地缓存
 */

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import * as repository from "../core/repository.js";
import { GrfError } from "../types/index.js";

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
      const spinner = ora("Cloning repository...").start();

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
          `  ${chalk.gray("Commit:")}   ${repoInfo.commitId.substring(0, 7)}...`,
        );
      } catch (error) {
        spinner.fail(chalk.red("Failed to add repository"));

        if (error instanceof GrfError) {
          console.error(chalk.red(`\n${chalk.bold("✗")} ${error.message}`));
          process.exit(1);
        }

        // 未知错误
        if (error instanceof Error) {
          console.error(chalk.red(`\n${chalk.bold("✗")} ${error.message}`));
        } else {
          console.error(
            chalk.red(`\n${chalk.bold("✗")} An unknown error occurred`),
          );
        }
        process.exit(1);
      }
    },
  );
