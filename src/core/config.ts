/**
 * grf 配置模块 - 兼容层
 *
 * 此模块是一个兼容层，保持原有 API 不变，内部使用新的模块化架构：
 * - paths.ts: 路径管理
 * - config-manager.ts: 单配置文件管理
 * - repos-index.ts: 仓库索引管理
 * - migration.ts: 配置迁移工具
 *
 * 现有代码无需修改即可正常工作。
 */

import fs from "fs-extra";
import path from "path";
import { GlobalConfig, RepoMeta, GrfError, ErrorCode } from "../types/index.js";

// 导入新的模块化组件
import {
  getGrfRoot as getGrfRootFromPaths,
  ensureGrfDirs,
  getLegacyConfigPath,
} from "./paths.js";
import {
  getAllConfigs,
  setAllConfigs,
  CONFIG_DEFAULTS,
} from "./config-manager.js";
import { reposIndex } from "./repos-index.js";
import { ensureMigrated } from "./migration.js";

// ============================================================================
// 常量定义（保持向后兼容）
// ============================================================================

/** 仓库存储目录名 */
const REPOS_DIR_NAME = "repos";
/** 仓库元信息文件名 */
const REPO_META_FILE_NAME = ".gitreference-meta.json";

// ============================================================================
// 路径相关函数（保持向后兼容）
// ============================================================================

/**
 * 获取 grf 根目录路径
 * @returns grf 根目录的绝对路径 (~/.gitreference/)
 */
export function getGrfRoot(): string {
  return getGrfRootFromPaths();
}

/**
 * 获取仓库存储根目录
 * @returns 仓库存储目录的绝对路径 (~/.gitreference/repos/)
 */
export function getReposRoot(): string {
  return path.join(getGrfRoot(), REPOS_DIR_NAME);
}

/**
 * 获取配置文件路径
 * @returns 配置文件的绝对路径 (~/.gitreference/config.json)
 * @deprecated 新架构使用多个配置文件，此函数仅用于兼容
 */
export function getConfigPath(): string {
  return getLegacyConfigPath();
}

/**
 * 获取默认配置
 * @returns 默认的全局配置对象
 */
export function getDefaultConfig(): GlobalConfig {
  return {
    version: CONFIG_DEFAULTS.VERSION,
    defaultBranch: CONFIG_DEFAULTS.DEFAULT_BRANCH,
    shallowClone: CONFIG_DEFAULTS.SHALLOW_CLONE,
    shallowDepth: CONFIG_DEFAULTS.SHALLOW_DEPTH,
    repos: {},
  };
}

/**
 * 确保配置目录存在
 * 如果目录不存在则创建
 */
export async function ensureConfigDir(): Promise<void> {
  try {
    // 使用新的目录确保函数
    await ensureGrfDirs();

    // 同时确保 repos 目录存在
    const reposRoot = getReposRoot();
    await fs.ensureDir(reposRoot);
  } catch (error) {
    throw new GrfError(
      ErrorCode.FS_PERMISSION_DENIED,
      `无法创建配置目录: ${(error as Error).message}`,
      error as Error,
    );
  }
}

// ============================================================================
// 全局配置读写函数（使用新模块化架构）
// ============================================================================

/**
 * 读取全局配置
 * 如果配置文件不存在，返回默认配置
 *
 * 内部实现：
 * 1. 调用 ensureMigrated() 确保旧配置已迁移
 * 2. 使用 getAllConfigs() 获取配置参数
 * 3. 使用 reposIndex.getAll() 获取仓库列表
 * 4. 组装成 GlobalConfig 对象返回
 *
 * @returns 全局配置对象
 */
export async function readGlobalConfig(): Promise<GlobalConfig> {
  try {
    // 确保配置已迁移（静默执行，不影响用户体验）
    await ensureMigrated();

    // 使用新模块获取配置
    const configs = await getAllConfigs();
    const repos = await reposIndex.getAll();

    // 组装成 GlobalConfig 对象
    return {
      version: configs.version,
      defaultBranch: configs.defaultBranch,
      shallowClone: configs.shallowClone,
      shallowDepth: configs.shallowDepth,
      repos,
    };
  } catch (error) {
    if (error instanceof GrfError) {
      throw error;
    }

    throw new GrfError(
      ErrorCode.CONFIG_NOT_FOUND,
      `读取配置文件失败: ${(error as Error).message}`,
      error as Error,
    );
  }
}

/**
 * 写入全局配置
 * 自动创建配置目录（如果不存在）
 *
 * 内部实现：
 * 1. 使用 setAllConfigs() 保存配置参数
 * 2. 使用 reposIndex.setAll() 保存仓库列表
 *
 * @param config 要写入的配置对象
 */
export async function writeGlobalConfig(config: GlobalConfig): Promise<void> {
  try {
    // 确保目录存在
    await ensureConfigDir();

    // 使用新模块保存配置参数
    await setAllConfigs({
      version: config.version,
      defaultBranch: config.defaultBranch,
      shallowClone: config.shallowClone,
      shallowDepth: config.shallowDepth,
    });

    // 使用新模块保存仓库列表
    await reposIndex.setAll(config.repos);
  } catch (error) {
    if (error instanceof GrfError) {
      throw error;
    }

    throw new GrfError(
      ErrorCode.CONFIG_WRITE_ERROR,
      `写入配置文件失败: ${(error as Error).message}`,
      error as Error,
    );
  }
}

// ============================================================================
// 仓库元信息相关函数（保持原有实现）
// ============================================================================

/**
 * 获取仓库元信息文件路径
 * @param repoPath 仓库目录路径
 * @returns 元信息文件的绝对路径
 */
function getRepoMetaPath(repoPath: string): string {
  return path.join(repoPath, REPO_META_FILE_NAME);
}

/**
 * 读取仓库元信息
 * @param repoPath 仓库目录路径
 * @returns 仓库元信息对象，如果不存在则返回 null
 */
export async function readRepoMeta(repoPath: string): Promise<RepoMeta | null> {
  const metaPath = getRepoMetaPath(repoPath);

  try {
    const exists = await fs.pathExists(metaPath);
    if (!exists) {
      return null;
    }

    const content = await fs.readFile(metaPath, "utf-8");
    return JSON.parse(content) as RepoMeta;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }

    if (error instanceof SyntaxError) {
      throw new GrfError(
        ErrorCode.CONFIG_PARSE_ERROR,
        `仓库元信息解析失败: ${error.message}`,
        error,
      );
    }

    throw new GrfError(
      ErrorCode.CONFIG_NOT_FOUND,
      `读取仓库元信息失败: ${(error as Error).message}`,
      error as Error,
    );
  }
}

/**
 * 写入仓库元信息
 * @param repoPath 仓库目录路径
 * @param meta 要写入的元信息对象
 */
export async function writeRepoMeta(
  repoPath: string,
  meta: RepoMeta,
): Promise<void> {
  try {
    const metaPath = getRepoMetaPath(repoPath);
    const content = JSON.stringify(meta, null, 2);

    await fs.writeFile(metaPath, content, "utf-8");
  } catch (error) {
    throw new GrfError(
      ErrorCode.CONFIG_WRITE_ERROR,
      `写入仓库元信息失败: ${(error as Error).message}`,
      error as Error,
    );
  }
}
