/**
 * clean 命令显示函数
 */

import chalk from "chalk";
import { RepoInfo } from "../../core/repository.js";

/**
 * 显示没有仓库可清理的消息
 */
export function displayNoRepos(): void {
  console.log(chalk.yellow("No repositories to clean."));
  console.log();
  console.log(
    `Use '${chalk.cyan("grf add <url>")}' to add a repository first.`,
  );
}

/**
 * 显示将要删除的仓库列表
 * @param repos 仓库列表
 */
export function displayReposToDelete(repos: RepoInfo[]): void {
  console.log(
    `This will remove all ${chalk.bold(repos.length)} cached ${repos.length === 1 ? "repository" : "repositories"}:`,
  );
  for (const repo of repos) {
    console.log(`  - ${repo.name}`);
  }
  console.log();
}

/**
 * 显示部分删除成功的结果
 * @param removedCount 成功删除的数量
 * @param totalCount 总数量
 * @param errors 错误列表
 */
export function displayPartialRemoveResult(
  removedCount: number,
  totalCount: number,
  errors: string[],
): void {
  console.log(chalk.yellow("Some repositories could not be removed:"));
  for (const err of errors) {
    console.log(chalk.red(`  - ${err}`));
  }
}

/**
 * 显示仓库未找到的错误
 * @param name 仓库名称
 */
export function displayRepoNotFound(name: string): void {
  console.error(chalk.red(`${chalk.bold("✗")} Repository not found: ${name}`));
  console.log();
  console.log(
    `Use '${chalk.cyan("grf list")}' to see all cached repositories.`,
  );
}

/**
 * 显示使用帮助
 */
export function displayUsageHelp(): void {
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
}
