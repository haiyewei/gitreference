/**
 * list 命令
 * 列出所有缓存的仓库
 */

import { Command } from "commander";
import chalk from "chalk";
import * as repository from "../core/repository.js";
import { padEnd, truncate } from "../ui/table.js";
import { shortCommit, formatDate } from "../ui/format.js";
import { handleError } from "../utils/error.js";
import { TABLE_COLUMNS } from "../utils/constants.js";

/**
 * 注册 list 命令
 * @param program Commander 程序实例
 */
export function registerListCommand(program: Command): void {
  program.addCommand(listCommand);
}

// 列宽定义（使用共享常量）
const COL_NAME = TABLE_COLUMNS.NAME;
const COL_BRANCH = TABLE_COLUMNS.BRANCH;
const COL_COMMIT = TABLE_COLUMNS.COMMIT;
const COL_ADDED = TABLE_COLUMNS.DATE;

export const listCommand = new Command("list")
  .description("List all cached repositories")
  .option("--json", "Output in JSON format")
  .action(async (options: { json?: boolean }) => {
    try {
      const repos = await repository.list();

      // 空列表处理
      if (repos.length === 0) {
        if (options.json) {
          console.log("[]");
        } else {
          console.log(chalk.yellow("No repositories cached yet."));
          console.log();
          console.log(
            `Use '${chalk.cyan("grf add <url>")}' to add a repository.`,
          );
        }
        return;
      }

      // JSON 格式输出
      if (options.json) {
        console.log(JSON.stringify(repos, null, 2));
        return;
      }

      // 表格格式输出
      console.log(chalk.bold("Cached repositories:"));
      console.log();

      // 表头
      const header =
        "  " +
        padEnd("NAME", COL_NAME) +
        padEnd("BRANCH", COL_BRANCH) +
        padEnd("COMMIT", COL_COMMIT) +
        padEnd("ADDED", COL_ADDED);
      console.log(chalk.gray(header));

      // 仓库列表
      for (const repo of repos) {
        const name = truncate(repo.name, COL_NAME - 2);
        const branch = truncate(repo.branch ?? "-", COL_BRANCH - 2);
        const commit = shortCommit(repo.commitId);
        const added = formatDate(repo.addedAt);

        const row =
          "  " +
          padEnd(name, COL_NAME) +
          padEnd(branch, COL_BRANCH) +
          padEnd(commit, COL_COMMIT) +
          padEnd(added, COL_ADDED);
        console.log(row);
      }

      console.log();
      console.log(
        chalk.gray(
          `Total: ${repos.length} ${repos.length === 1 ? "repository" : "repositories"}`,
        ),
      );
    } catch (error) {
      handleError(error, { exit: true });
    }
  });
