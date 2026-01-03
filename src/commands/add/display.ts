/**
 * add 命令显示函数
 */

import chalk from "chalk";
import { RepoInfo } from "../../core/repository.js";
import { shortCommit } from "../../ui/format.js";

/**
 * 显示添加成功的仓库信息
 * @param repoInfo 仓库信息
 */
export function displaySuccess(repoInfo: RepoInfo): void {
  console.log();
  console.log(`  ${chalk.gray("Name:")}     ${repoInfo.name}`);
  console.log(`  ${chalk.gray("Path:")}     ${repoInfo.path}`);
  if (repoInfo.branch) {
    console.log(`  ${chalk.gray("Branch:")}   ${repoInfo.branch}`);
  }
  console.log(
    `  ${chalk.gray("Commit:")}   ${shortCommit(repoInfo.commitId)}...`,
  );
}
