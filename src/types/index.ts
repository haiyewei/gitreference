/**
 * grf 类型定义文件
 * 定义全局配置、仓库条目、仓库元信息等核心类型
 */

/**
 * 仓库条目接口
 * 存储在全局配置中的仓库基本信息
 */
export interface RepoEntry {
  /** 仓库 URL */
  url: string;
  /** 本地存储路径 */
  path: string;
  /** 添加时间 (ISO 8601 格式) */
  addedAt: string;
}

/**
 * 全局配置接口
 * 存储在 ~/.gitreference/config.json 中
 */
export interface GlobalConfig {
  /** 配置文件版本 */
  version: string;
  /** 默认分支名称 */
  defaultBranch?: string;
  /** 是否使用浅克隆 */
  shallowClone?: boolean;
  /** 浅克隆深度 */
  shallowDepth?: number;
  /** 仓库映射表，key 为仓库别名 */
  repos: Record<string, RepoEntry>;
}

/**
 * 仓库元信息接口
 * 存储在每个仓库目录下的 .gitreference-meta.json 中
 */
export interface RepoMeta {
  /** 仓库 URL */
  url: string;
  /** 仓库名称/别名 */
  name: string;
  /** 添加时间 (ISO 8601 格式) */
  addedAt: string;
  /** 最后更新时间 (ISO 8601 格式) */
  updatedAt: string;
  /** 当前 commit ID */
  commitId: string;
  /** 分支名称 */
  branch?: string;
  /** 标签名称 */
  tag?: string;
  /** Git 引用 */
  ref?: string;
}

/**
 * 错误码枚举
 * 按类别分组：1xx 配置、2xx 仓库、3xx Git、4xx 文件系统、5xx 用户输入
 */
export enum ErrorCode {
  // 1xx: 配置相关错误
  /** 配置文件未找到 */
  CONFIG_NOT_FOUND = 100,
  /** 配置文件解析错误 */
  CONFIG_PARSE_ERROR = 101,
  /** 配置文件写入错误 */
  CONFIG_WRITE_ERROR = 102,

  // 2xx: 仓库相关错误
  /** 仓库未找到 */
  REPO_NOT_FOUND = 200,
  /** 仓库已存在 */
  REPO_ALREADY_EXISTS = 201,
  /** 无效的仓库 URL */
  REPO_INVALID_URL = 202,

  // 3xx: Git 相关错误
  /** Git 克隆失败 */
  GIT_CLONE_FAILED = 300,
  /** Git 拉取失败 */
  GIT_PULL_FAILED = 301,
  /** Git 未安装 */
  GIT_NOT_INSTALLED = 302,
  /** Git 切换分支失败 */
  GIT_CHECKOUT_FAILED = 303,

  // 4xx: 文件系统相关错误
  /** 权限被拒绝 */
  FS_PERMISSION_DENIED = 400,
  /** 路径未找到 */
  FS_PATH_NOT_FOUND = 401,
  /** 复制失败 */
  FS_COPY_FAILED = 402,

  // 5xx: 用户输入相关错误
  /** 无效参数 */
  INVALID_ARGUMENT = 500,
  /** 缺少参数 */
  MISSING_ARGUMENT = 501,
}

/**
 * 自定义错误类
 * 包含错误码、错误消息和可选的原因错误
 */
export class GrfError extends Error {
  /** 错误码 */
  public code: ErrorCode;
  /** 原因错误 */
  public cause?: Error;

  constructor(code: ErrorCode, message: string, cause?: Error) {
    super(message);
    this.name = "GrfError";
    this.code = code;
    this.cause = cause;
  }
}

/**
 * 加载条目接口
 * 记录单次 use 操作的详细信息
 */
export interface LoadingEntry {
  /** 唯一标识符 (UUID) */
  id: string;

  /** 源仓库名称 (如 github.com/facebook/react) */
  repoName: string;

  /** 源仓库 URL */
  repoUrl: string;

  /** 加载时的 commit ID */
  commitId: string;

  /** 加载时的分支名 */
  branch?: string;

  /** 使用的子目录 (--subdir 选项) */
  subdir?: string;

  /** 目标路径 (相对于项目根目录) */
  targetPath: string;

  /** 加载时间 (ISO 8601 格式) */
  loadedAt: string;

  /** 最后更新时间 */
  updatedAt?: string;
}

/**
 * 加载配置文件接口
 */
export interface LoadingConfig {
  /** 配置版本 */
  version: string;

  /** 加载条目列表 */
  entries: LoadingEntry[];
}
