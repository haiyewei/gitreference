/**
 * 常量定义模块
 * 项目中使用的各种常量
 */

/**
 * 目录名称常量
 */
export const DIR_NAMES = {
  /** .gitreference 目录名 */
  GITREFERENCE: ".gitreference",
  /** .git 目录名 */
  GIT: ".git",
} as const;

/**
 * 文件名称常量
 */
export const FILE_NAMES = {
  /** 加载状态文件 */
  LOADING_JSON: "loading.json",
  /** 仓库元信息文件 */
  META_JSON: "meta.json",
  /** 旧版元信息文件名 */
  GRF_META_JSON: ".grf-meta.json",
  /** 旧版元信息文件名 */
  GITREFERENCE_META_JSON: ".gitreference-meta.json",
  /** Git 忽略文件 */
  GITIGNORE: ".gitignore",
  /** 全局配置文件 */
  CONFIG_JSON: "config.json",
} as const;

/**
 * 默认值常量
 */
export const DEFAULTS = {
  /** 默认分支名 */
  BRANCH: "main",
  /** 默认浅克隆深度 */
  SHALLOW_DEPTH: 1,
  /** 是否默认使用浅克隆 */
  SHALLOW_CLONE: true,
  /** 短 commit ID 长度 */
  SHORT_COMMIT_LENGTH: 7,
} as const;

/**
 * 表格列宽常量
 */
export const TABLE_COLUMNS = {
  /** 仓库名称列宽 */
  NAME: 40,
  /** 分支列宽 */
  BRANCH: 15,
  /** Commit ID 列宽 */
  COMMIT: 10,
  /** 日期列宽 */
  DATE: 12,
  /** 路径列宽 */
  PATH: 30,
  /** 状态列宽 */
  STATUS: 15,
} as const;

/**
 * 排除的文件/目录列表（复制时排除）
 */
export const COPY_EXCLUDES = [
  ".git",
  "meta.json",
  ".grf-meta.json",
  ".gitreference-meta.json",
] as const;

/**
 * Git 相关常量
 */
export const GIT = {
  /** 远程名称 */
  REMOTE_NAME: "origin",
  /** 默认分支候选列表 */
  DEFAULT_BRANCHES: ["main", "master"],
} as const;

/**
 * 超时设置（毫秒）
 */
export const TIMEOUTS = {
  /** Git 操作超时 */
  GIT_OPERATION: 60000,
  /** 网络请求超时 */
  NETWORK_REQUEST: 30000,
} as const;

/**
 * 限制设置
 */
export const LIMITS = {
  /** 最大路径长度 */
  MAX_PATH_LENGTH: 260,
  /** 最大仓库名称长度 */
  MAX_REPO_NAME_LENGTH: 255,
  /** 最大并发操作数 */
  MAX_CONCURRENT_OPERATIONS: 5,
} as const;

/**
 * 正则表达式模式
 */
export const PATTERNS = {
  /** HTTPS Git URL */
  HTTPS_GIT_URL: /^https?:\/\/[^/]+\/[^/]+\/[^/]+/,
  /** SSH Git URL */
  SSH_GIT_URL: /^git@[^:]+:[^/]+\/[^/]+/,
  /** 非法文件名字符 */
  INVALID_FILENAME_CHARS: /[<>:"|?*\x00-\x1f]/,
  /** 非法分支名字符 */
  INVALID_BRANCH_CHARS: /[\s~^:?*[\]\\@{}\x00-\x1f\x7f]/,
} as const;

/**
 * 消息模板
 */
export const MESSAGES = {
  /** 操作取消 */
  OPERATION_CANCELLED: "Operation cancelled.",
  /** 无仓库可清理 */
  NO_REPOS_TO_CLEAN: "No repositories to clean.",
  /** 无已缓存仓库 */
  NO_CACHED_REPOS: "No repositories cached yet.",
  /** 无已加载参考代码 */
  NO_LOADED_REFS: "No loaded reference code in current project.",
  /** 仓库未找到 */
  REPO_NOT_FOUND: (name: string) => `Repository not found: ${name}`,
  /** 仓库已存在 */
  REPO_ALREADY_EXISTS: (name: string) => `Repository already exists: ${name}`,
} as const;

/**
 * 命令提示
 */
export const HINTS = {
  /** 添加仓库提示 */
  ADD_REPO: "Use 'grf add <url>' to add a repository.",
  /** 查看列表提示 */
  LIST_REPOS: "Use 'grf list' to see all cached repositories.",
  /** 查看已加载提示 */
  LIST_LOADED: "Use 'grf unload --list' to see all loaded reference code.",
  /** 加载仓库提示 */
  LOAD_REPO: "Use 'grf load <name>' to load reference code to workspace.",
  /** 更新仓库提示 */
  UPDATE_REPO: "Use 'grf update <name>' to update the repository.",
  /** 清理仓库提示 */
  CLEAN_REPO: "Use 'grf clean <name>' to remove the repository.",
} as const;

/**
 * 应用信息
 */
export const APP_INFO = {
  /** 应用名称 */
  NAME: "gitreference",
  /** 命令名称 */
  COMMAND: "grf",
  /** 配置目录名 */
  CONFIG_DIR: ".gitreference",
} as const;
