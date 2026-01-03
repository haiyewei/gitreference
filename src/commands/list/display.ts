/**
 * list 命令显示函数
 */

import chalk from "chalk";
import { RepoInfo } from "../../core/repository.js";
import { LoadingEntry } from "../../types/index.js";
import { padEnd, truncate } from "../../ui/table.js";
import { shortCommit, formatDate } from "../../ui/format.js";
import { TABLE_COLUMNS } from "../../utils/constants.js";

// 列宽定义（使用共享常量）
const COL_NAME = TABLE_COLUMNS.NAME;
const COL_BRANCH = TABLE_COLUMNS.BRANCH;
const COL_COMMIT = TABLE_COLUMNS.COMMIT;
const COL_ADDED = TABLE_COLUMNS.DATE;

/**
 * 显示空列表消息
 */
export function displayEmptyList(): void {
  console.log(chalk.yellow("No repositories cached yet."));
  console.log();
  console.log(`Use '${chalk.cyan("grf add <url>")}' to add a repository.`);
}

/**
 * 显示 JSON 格式的空列表
 */
export function displayEmptyJson(): void {
  console.log("[]");
}

/**
 * 显示 JSON 格式的仓库列表
 * @param repos 仓库列表
 */
export function displayJsonOutput(repos: RepoInfo[]): void {
  console.log(JSON.stringify(repos, null, 2));
}

/**
 * 显示表格格式的仓库列表
 * @param repos 仓库列表
 */
export function displayTableOutput(repos: RepoInfo[]): void {
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
}

// ============ 已加载条目显示函数 ============

// 已加载条目表格列宽
const COL_LOADED_NAME = 35;
const COL_LOADED_PATH = 30;
const COL_LOADED_COMMIT = 10;

/**
 * 显示空的已加载列表消息
 */
export function displayEmptyLoadedList(): void {
  console.log(chalk.yellow("No loaded reference code in current project."));
  console.log();
  console.log(`Use '${chalk.cyan("grf load <name>")}' to load reference code.`);
}

/**
 * 显示 JSON 格式的已加载条目列表
 * @param entries 已加载条目列表
 */
export function displayLoadedJsonOutput(entries: LoadingEntry[]): void {
  console.log(JSON.stringify(entries, null, 2));
}

/**
 * 显示已加载的条目列表
 * @param loadedEntries 已加载的条目列表
 * @param verbose 是否显示详细信息
 */
export function displayLoadedEntries(
  loadedEntries: LoadingEntry[],
  verbose = false,
): void {
  console.log(
    chalk.bold(
      `📦 Loaded reference code in current project (${loadedEntries.length})`,
    ),
  );
  console.log();

  // 表头
  console.log(
    chalk.gray(
      "  " +
        padEnd("REPO", COL_LOADED_NAME) +
        padEnd("PATH", COL_LOADED_PATH) +
        padEnd("COMMIT", COL_LOADED_COMMIT),
    ),
  );

  // 条目列表
  for (const entry of loadedEntries) {
    const repoName = truncate(
      entry.repoName.replace(/\\/g, "/"),
      COL_LOADED_NAME - 2,
    );
    const targetPath = truncate(
      entry.targetPath.replace(/\\/g, "/"),
      COL_LOADED_PATH - 2,
    );
    const commitShort = entry.commitId ? entry.commitId.substring(0, 7) : "-";
    console.log(
      "  " +
        padEnd(repoName, COL_LOADED_NAME) +
        padEnd(targetPath, COL_LOADED_PATH) +
        padEnd(commitShort, COL_LOADED_COMMIT),
    );
  }

  console.log();

  // 在详细模式下显示更多信息
  if (verbose) {
    console.log(chalk.gray("Details:"));
    for (const entry of loadedEntries) {
      console.log(chalk.gray(`  - ${entry.repoName}`));
      console.log(chalk.gray(`    ID: ${entry.id}`));
      console.log(chalk.gray(`    URL: ${entry.repoUrl}`));
      console.log(chalk.gray(`    Path: ${entry.targetPath}`));
      console.log(chalk.gray(`    Commit: ${entry.commitId}`));
      if (entry.branch) {
        console.log(chalk.gray(`    Branch: ${entry.branch}`));
      }
      if (entry.subdir) {
        console.log(chalk.gray(`    Subdir: ${entry.subdir}`));
      }
      console.log(chalk.gray(`    Loaded at: ${entry.loadedAt}`));
      if (entry.updatedAt) {
        console.log(chalk.gray(`    Updated at: ${entry.updatedAt}`));
      }
    }
    console.log();
  }

  console.log(
    chalk.gray(
      `Total: ${loadedEntries.length} ${loadedEntries.length === 1 ? "entry" : "entries"}`,
    ),
  );
}
