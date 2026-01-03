/**
 * clean 命令
 * 清理不需要的缓存仓库
 */

import { Command } from "commander";
import chalk from "chalk";
import * as repository from "../core/repository.js";
import { confirm, showCancelled } from "../ui/prompt.js";
import { startSpinner } from "../ui/spinner.js";
import { handleError } from "../utils/error.js";

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
  .option("--all", "Remove all cached repositories")
  .option("-f, --force", "Skip confirmation")
  .action(
    async (
      name: string | undefined,
      options: { all?: boolean; force?: boolean },
    ) => {
      try {
        // 获取所有仓库列表
        const repos = await repository.list();

        // 如果没有仓库可清理
        if (repos.length === 0) {
          console.log(chalk.yellow("No repositories to clean."));
          console.log();
          console.log(
            `Use '${chalk.cyan("grf add <url>")}' to add a repository first.`,
          );
          return;
        }

        // 情况 1: 指定了 --all，删除所有仓库
        if (options.all) {
          // 显示将要删除的仓库列表
          if (!options.force) {
            console.log(
              `This will remove all ${chalk.bold(repos.length)} cached ${repos.length === 1 ? "repository" : "repositories"}:`,
            );
            for (const repo of repos) {
              console.log(`  - ${repo.name}`);
            }
            console.log();

            const confirmed = await confirm("Are you sure?");
            if (!confirmed) {
              showCancelled();
              return;
            }
          }

          // 删除所有仓库
          const spinner = startSpinner("Removing repositories...");
          let removedCount = 0;
          const errors: string[] = [];

          for (const repo of repos) {
            try {
              await repository.remove(repo.name);
              removedCount++;
            } catch (error) {
              if (error instanceof Error) {
                errors.push(`${repo.name}: ${error.message}`);
              }
            }
          }

          if (errors.length > 0) {
            spinner.warn(
              `Removed ${removedCount} of ${repos.length} repositories.`,
            );
            console.log(
              chalk.yellow("Some repositories could not be removed:"),
            );
            for (const err of errors) {
              console.log(chalk.red(`  - ${err}`));
            }
          } else {
            spinner.succeed("All repositories removed!");
          }
          return;
        }

        // 情况 2: 指定了仓库名称，删除指定仓库
        if (name) {
          // 检查仓库是否存在
          const repoInfo = await repository.get(name);
          if (!repoInfo) {
            console.error(
              chalk.red(`${chalk.bold("✗")} Repository not found: ${name}`),
            );
            console.log();
            console.log(
              `Use '${chalk.cyan("grf list")}' to see all cached repositories.`,
            );
            process.exit(1);
          }

          // 确认删除
          if (!options.force) {
            const confirmed = await confirm(
              `Remove repository '${chalk.cyan(repoInfo.name)}'?`,
            );
            if (!confirmed) {
              showCancelled();
              return;
            }
          }

          // 删除仓库
          const spinner = startSpinner("Removing repository...");
          await repository.remove(repoInfo.name);
          spinner.succeed("Repository removed successfully!");
          return;
        }

        // 情况 3: 没有指定名称也没有 --all，显示使用说明
        console.log(chalk.yellow("No repository name specified."));
        console.log();
        console.log("Usage:");
        console.log(
          `  ${chalk.cyan("grf clean <name>")}     Remove a specific repository`,
        );
        console.log(
          `  ${chalk.cyan("grf clean --all")}      Remove all repositories`,
        );
        console.log();
        console.log(
          `Use '${chalk.cyan("grf list")}' to see all cached repositories.`,
        );
      } catch (error) {
        handleError(error, { exit: true });
      }
    },
  );
