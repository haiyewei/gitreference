/**
 * list 命令类型定义
 */

import { RepoInfo } from "../../core/repository.js";
import { LoadingEntry } from "../../types/index.js";

/**
 * list 命令选项
 */
export interface ListOptions {
  json?: boolean;
  load?: boolean;
  verbose?: boolean;
}

/**
 * list 命令上下文
 */
export interface ListContext {
  /** 所有缓存的仓库列表 */
  repos: RepoInfo[];
  /** 命令选项 */
  options: ListOptions;
}

/**
 * list --load 命令上下文
 */
export interface ListLoadContext {
  /** 已加载的条目列表 */
  loadedEntries: LoadingEntry[];
  /** 命令选项 */
  options: ListOptions;
}
