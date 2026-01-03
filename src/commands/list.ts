/**
 * list 命令
 * 列出所有缓存的仓库
 */

import { Command } from "commander";
import chalk from "chalk";
import * as repository from "../core/repository.js";

/**
 * 截断长字符串
 * @param str 原始字符串
 * @param maxLength 最大长度
 * @returns 截断后的字符串
 */
function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * 格式化日期
 * @param isoDate ISO 格式日期字符串
 * @returns 格式化后的日期字符串
 */
function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString();
}

/**
 * 截断 commit ID
 * @param commitId 完整的 commit ID
 * @returns 截断后的 commit ID（7 字符）
 */
function shortCommit(commitId: string): string {
  return commitId.slice(0, 7);
}

/**
 * 填充字符串到指定宽度
 * @param str 原始字符串
 * @param width 目标宽度
 * @returns 填充后的字符串
 */
function padEnd(str: string, width: number): string {
  if (str.length >= width) return str;
  return str + " ".repeat(width - str.length);
}

// 列宽定义
const COL_NAME = 40;
const COL_BRANCH = 15;
const COL_COMMIT = 10;
const COL_ADDED = 12;

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
      if (error instanceof Error) {
        console.error(chalk.red(`${chalk.bold("✗")} ${error.message}`));
      } else {
        console.error(
          chalk.red(`${chalk.bold("✗")} An unknown error occurred`),
        );
      }
      process.exit(1);
    }
  });
