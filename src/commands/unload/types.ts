/**
 * unload 命令类型定义
 */

import { LoadingEntry } from "../../types/index.js";

/**
 * 空目录信息
 */
export interface EmptyDir {
  /** 完整路径（相对于 .gitreference） */
  fullPath: string;
  /** 绝对路径 */
  absolutePath: string;
}

/**
 * unload 命令选项
 */
export interface UnloadOptions {
  all?: boolean;
  force?: boolean;
  dryRun?: boolean;
  list?: boolean;
  keepEmpty?: boolean;
  cleanEmpty?: boolean;
  verbose?: boolean;
}

/**
 * 要删除的路径信息
 */
export interface PathToDelete {
  entry: LoadingEntry;
  absolutePath: string;
  exists: boolean;
}

/**
 * unload 命令上下文
 */
export interface UnloadContext {
  /** 当前工作目录 */
  cwd: string;
  /** .gitreference 目录绝对路径 */
  gitrefDir: string;
  /** .gitreference 目录是否存在 */
  gitrefDirExists: boolean;
  /** 已加载的条目列表 */
  loadedEntries: LoadingEntry[];
  /** 空目录列表 */
  emptyDirs: EmptyDir[];
  /** 命令选项 */
  options: UnloadOptions;
  /** 命令开始时间 */
  startTime: number;
}
