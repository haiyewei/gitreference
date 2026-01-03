/**
 * update 命令类型定义
 */

/**
 * 更新结果状态
 */
export type UpdateStatus = "up-to-date" | "has-updates" | "updated" | "error";

/**
 * 更新结果
 */
export interface UpdateResult {
  /** 仓库名称 */
  name: string;
  /** 更新状态 */
  status: UpdateStatus;
  /** 旧的 commit ID（仅当状态为 'updated' 时） */
  oldCommit?: string;
  /** 新的 commit ID（仅当状态为 'updated' 时） */
  newCommit?: string;
  /** 错误消息（仅当状态为 'error' 时） */
  error?: string;
}

/**
 * 命令选项接口
 */
export interface UpdateOptions {
  check?: boolean;
  status?: boolean;
  sync?: boolean;
  syncOnly?: boolean;
  force?: boolean;
  dryRun?: boolean;
}

/**
 * update 命令上下文
 */
export interface UpdateContext {
  /** 仓库名称（可选） */
  name?: string;
  /** 命令选项 */
  options: UpdateOptions;
  /** 是否仅检查更新 */
  checkOnly: boolean;
  /** 是否显示状态 */
  showStatus: boolean;
  /** 是否同步 */
  doSync: boolean;
  /** 是否仅同步 */
  syncOnly: boolean;
  /** 是否强制 */
  force: boolean;
  /** 是否 dry-run 模式 */
  dryRun: boolean;
}
