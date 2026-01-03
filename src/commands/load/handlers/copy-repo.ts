/**
 * 仓库复制处理器
 * 处理仓库复制到工作目录的逻辑
 */

import chalk from "chalk";
import { startSpinner } from "../../../ui/spinner.js";
import { handleError } from "../../../utils/error.js";
import {
  checkRepoExists,
  getRepoInfo,
  switchRepoBranch,
  resolveRepoPath,
  determineSourcePath,
  pathExists,
  determineFinalTargetPath,
  copyRepoFiles,
  updateGitignoreEntries,
  recordLoadingEntry,
} from "../helpers.js";
import {
  displayCopySuccess,
  displayRepoNotFoundError,
  displaySubdirNotFoundError,
} from "../display.js";
import type { LoadContext } from "../types.js";

/**
 * 处理仓库复制
 * 将仓库内容复制到目标路径
 * @param context 加载上下文
 * @returns 是否成功
 */
export async function handleCopyRepo(context: LoadContext): Promise<boolean> {
  const spinner = startSpinner("Copying repository...");

  try {
    // 检查仓库是否存在
    if (!(await checkRepoExists(context.repoName))) {
      spinner.fail(chalk.red("Repository not found"));
      displayRepoNotFoundError(context.repoName);
      process.exit(1);
    }

    // 获取仓库信息
    let repoInfo = await getRepoInfo(context.repoName);
    if (!repoInfo) {
      spinner.fail(chalk.red("Failed to get repository info"));
      process.exit(1);
    }

    // 如果指定了分支且与当前分支不同，则切换分支
    if (context.options.branch && repoInfo.branch !== context.options.branch) {
      spinner.text = `Switching to branch ${context.options.branch}...`;
      try {
        repoInfo = await switchRepoBranch(
          context.repoName,
          context.options.branch,
        );
        spinner.text = "Copying repository...";
      } catch (error) {
        spinner.fail(chalk.red(`Failed to switch branch`));
        handleError(error, { exit: true });
      }
    }

    // 更新上下文中的仓库信息
    context.repoInfo = repoInfo;

    // 解析仓库路径
    context.repoPath = await resolveRepoPath(context.repoName);

    // 确定源路径（如果指定了 subdir，则使用子目录）
    context.sourcePath = determineSourcePath(
      context.repoPath,
      context.options.subdir,
    );

    // 检查源路径是否存在（特别是子目录情况）
    if (context.options.subdir && !(await pathExists(context.sourcePath))) {
      spinner.fail(chalk.red("Subdirectory not found"));
      displaySubdirNotFoundError(context.options.subdir, repoInfo.name);
      process.exit(1);
    }

    // 确定目标路径
    context.finalTargetPath = determineFinalTargetPath(
      context.targetPath,
      repoInfo.name,
    );

    // 复制文件
    await copyRepoFiles(context.sourcePath, context.finalTargetPath);

    // 更新 .gitignore（如果没有 --no-ignore 选项）
    if (context.options.ignore !== false) {
      await updateGitignoreEntries(context.targetPath, context.finalTargetPath);
    }

    // 记录加载信息到 loading.json
    await recordLoadingEntry(context);

    spinner.succeed(chalk.green("Repository copied successfully!"));

    // 显示复制信息
    displayCopySuccess(
      context.sourcePath,
      context.finalTargetPath,
      repoInfo.commitId,
    );

    return true;
  } catch (error) {
    spinner.fail(chalk.red("Failed to copy repository"));
    handleError(error, { exit: true });
    return false;
  }
}
