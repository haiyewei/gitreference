/**
 * clean 命令类型定义
 */

import { RepoInfo } from "../../core/repository.js";

/**
 * clean 命令选项
 */
export interface CleanOptions {
  all?: boolean;
  force?: boolean;
}

/**
 * clean 命令上下文
 */
export interface CleanContext {
  /** 所有缓存的仓库列表 */
  repos: RepoInfo[];
  /** 命令选项 */
  options: CleanOptions;
}
