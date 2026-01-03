/**
 * load 命令显示/格式化逻辑
 */

import chalk from "chalk";
import { shortCommit } from "../../ui/format.js";
import type { RepoInfo } from "../../core/repository.js";

/**
 * 显示仓库添加成功信息
 * @param repoInfo 仓库信息
 */
export function displayAddSuccess(repoInfo: RepoInfo): void {
  console.log(`  ${chalk.gray("Name:")}     ${repoInfo.name}`);
  console.log(
    `  ${chalk.gray("Commit:")}   ${shortCommit(repoInfo.commitId)}...`,
  );
  console.log();
}

/**
 * 显示仓库复制成功信息
 * @param sourcePath 源路径
 * @param targetPath 目标路径
 * @param commitId commit ID
 */
export function displayCopySuccess(
  sourcePath: string,
  targetPath: string,
  commitId: string,
): void {
  console.log();
  console.log(`  ${chalk.gray("Source:")}   ${sourcePath}`);
  console.log(`  ${chalk.gray("Target:")}   ${targetPath}`);
  console.log(`  ${chalk.gray("Commit:")}   ${shortCommit(commitId)}...`);
}

/**
 * 显示仓库不存在错误
 * @param repoName 仓库名称
 */
export function displayRepoNotFoundError(repoName: string): void {
  console.error(
    chalk.red(`\n${chalk.bold("✗")} Repository "${repoName}" does not exist.`),
  );
  console.error(
    chalk.gray(
      `  Use ${chalk.cyan("grf add <url>")} to add a repository first.`,
    ),
  );
  console.error(
    chalk.gray(
      `  Or use ${chalk.cyan("grf load <url>")} to add and load in one step.`,
    ),
  );
}

/**
 * 显示子目录不存在错误
 * @param subdir 子目录名称
 * @param repoName 仓库名称
 */
export function displaySubdirNotFoundError(
  subdir: string,
  repoName: string,
): void {
  console.error(
    chalk.red(
      `\n${chalk.bold("✗")} Subdirectory "${subdir}" does not exist in repository "${repoName}".`,
    ),
  );
}
