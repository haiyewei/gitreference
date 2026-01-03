/**
 * add 命令辅助函数
 */

import * as repository from "../../core/repository.js";
import { AddContext } from "./types.js";

/**
 * 执行仓库添加操作
 * @param context 命令上下文
 * @returns 更新后的上下文（包含 repoInfo）
 */
export async function addRepository(context: AddContext): Promise<AddContext> {
  const { url, options } = context;

  const repoInfo = await repository.add(url, {
    name: options.name,
    branch: options.branch,
    shallow: options.shallow,
    depth: parseInt(options.depth, 10),
  });

  return {
    ...context,
    repoInfo,
  };
}
