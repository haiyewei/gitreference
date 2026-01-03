/**
 * load 命令类型定义
 */

import type { RepoInfo } from "../../core/repository.js";

/**
 * load 命令选项
 */
export interface LoadOptions {
  /** 子目录 */
  subdir?: string;
  /** 是否更新 .gitignore */
  ignore: boolean;
  /** 指定分支 */
  branch?: string;
}

/**
 * load 命令上下文
 */
export interface LoadContext {
  /** 原始名称参数（可能是仓库名或 Git URL） */
  name: string;
  /** 解析后的仓库名称 */
  repoName: string;
  /** 目标路径（用户指定的） */
  targetPath?: string;
  /** 命令选项 */
  options: LoadOptions;
  /** 仓库信息（在处理过程中填充） */
  repoInfo?: RepoInfo;
  /** 仓库缓存路径 */
  repoPath?: string;
  /** 源路径（考虑 subdir） */
  sourcePath?: string;
  /** 最终目标路径（绝对路径） */
  finalTargetPath?: string;
}
