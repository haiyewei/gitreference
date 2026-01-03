/**
 * URL 添加处理器
 * 处理 Git URL 自动添加仓库的逻辑
 */

import chalk from "chalk";
import { startSpinner } from "../../../ui/spinner.js";
import { handleError } from "../../../utils/error.js";
import { isGitUrl } from "../../../utils/validation.js";
import {
  parseGitUrlToFullName,
  checkRepoExists,
  addRepository,
} from "../helpers.js";
import { displayAddSuccess } from "../display.js";
import type { LoadContext } from "../types.js";

/**
 * 处理 Git URL 自动添加
 * 如果输入是 Git URL，则自动添加仓库
 * @param context 加载上下文
 * @returns 是否已处理（true 表示是 URL 并已处理，false 表示不是 URL）
 */
export async function handleUrlAdd(context: LoadContext): Promise<boolean> {
  // 检查是否为 Git URL
  if (!isGitUrl(context.name)) {
    return false;
  }

  const addSpinner = startSpinner("Adding repository...");

  try {
    // 检查仓库是否已存在
    const fullName = parseGitUrlToFullName(context.name);

    if (await checkRepoExists(fullName)) {
      addSpinner.info(chalk.blue("Repository already exists, skipping add..."));
      context.repoName = fullName;
    } else {
      // 自动添加仓库
      const repoInfo = await addRepository(
        context.name,
        context.options.branch,
      );
      addSpinner.succeed(chalk.green("Repository added successfully!"));
      displayAddSuccess(repoInfo);
      context.repoName = repoInfo.name;
    }
  } catch (error) {
    addSpinner.fail(chalk.red("Failed to add repository"));
    handleError(error, { exit: true });
  }

  return true;
}
