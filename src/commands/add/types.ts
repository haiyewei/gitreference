/**
 * add 命令类型定义
 */

import { RepoInfo } from "../../core/repository.js";
import { Ora } from "ora";

/**
 * add 命令选项
 */
export interface AddOptions {
  /** 自定义仓库名称 */
  name?: string;
  /** 指定分支 */
  branch?: string;
  /** 是否浅克隆 */
  shallow: boolean;
  /** 克隆深度 */
  depth: string;
}

/**
 * add 命令上下文
 */
export interface AddContext {
  /** Git 仓库 URL */
  url: string;
  /** 命令选项 */
  options: AddOptions;
  /** 加载动画 spinner */
  spinner: Ora;
  /** 添加成功后的仓库信息 */
  repoInfo?: RepoInfo;
}
